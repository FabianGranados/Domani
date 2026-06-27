// ============================================================
// Capa de API de DOMANI: wrappers tipados sobre los RPC de la DB.
// Toda mutación económica pasa por estas funciones (jamás UPDATE
// directo de saldo desde el cliente).
// ============================================================
import { supabase } from './supabase';
import type { House, Profile, Wallet, LedgerTransaction, AcademyQuestion } from './types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function bootstrapProfile(alias: string, ageConfirmed: boolean): Promise<Profile> {
  const { data, error } = await supabase.rpc('bootstrap_profile', {
    p_alias: alias,
    p_age_confirmed: ageConfirmed,
  });
  if (error) throw error;
  return data as Profile;
}

export async function listHouses(): Promise<House[]> {
  const { data, error } = await supabase.from('houses').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function chooseHouse(houseCode: string): Promise<Profile> {
  const { data, error } = await supabase.rpc('choose_house', { p_house_code: houseCode });
  if (error) throw error;
  return data as Profile;
}

// --- Ciudadanos para sentar en una mesa (póker) --------------------------
export interface PokerCitizen { id: string; alias: string; avatar_code: string }
export async function getPokerCitizens(houseId: string | null, count: number): Promise<PokerCitizen[]> {
  // Trae un grupo de ciudadanos-bot (preferiblemente de tu ciudad) y mezcla
  // en el cliente para variedad; devuelve `count`.
  let q = supabase.from('profiles').select('id, alias, avatar_code').eq('is_bot', true).limit(60);
  if (houseId) q = q.eq('house_id', houseId);
  const { data, error } = await q;
  if (error) throw error;
  const arr = (data ?? []) as PokerCitizen[];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.slice(0, count);
}

// --- Contendor de ajedrez: un ciudadano al azar del ecosistema -----------
export interface ChessOpponent { id: string; alias: string; avatar_code: string; influence: number; house_id: string | null }
export async function getChessOpponent(): Promise<ChessOpponent | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, alias, avatar_code, influence, house_id')
    .eq('is_bot', true)
    .limit(80);
  if (error) throw error;
  const arr = (data ?? []) as ChessOpponent[];
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Trofeos de ajedrez (palmarés) ---------------------------------------
export type ChessTrophy = { challenger: string; wins: number; attempts: number; first_win_at: string | null };

/** Lee los trofeos del usuario (filas existentes; los no jugados no aparecen). */
export async function getChessTrophies(): Promise<ChessTrophy[]> {
  const { data, error } = await supabase
    .from('chess_trophies')
    .select('challenger, wins, attempts, first_win_at');
  if (error) throw error;
  return (data ?? []) as ChessTrophy[];
}

/** Registra el resultado de una partida contra un retador nombrado. */
export async function recordChessResult(challenger: string, outcome: 'win' | 'loss' | 'draw'): Promise<void> {
  const { error } = await supabase.rpc('fn_record_chess_result', { p_challenger: challenger, p_outcome: outcome });
  if (error) throw error;
}

// --- Sala de Control (admin) ---------------------------------------------
export type AppConfig = Record<string, unknown>;
export async function getAppConfig(): Promise<AppConfig> {
  const { data, error } = await supabase.from('app_config').select('key, value');
  if (error) throw error;
  const out: AppConfig = {};
  (data ?? []).forEach((r: { key: string; value: unknown }) => { out[r.key] = r.value; });
  return out;
}
export async function adminSetConfig(key: string, value: unknown): Promise<void> {
  const { error } = await supabase.rpc('admin_set_config', { p_key: key, p_value: value });
  if (error) throw error;
}
export async function adminPostNews(headline: string, kind = 'city'): Promise<void> {
  const { error } = await supabase.rpc('admin_post_news', { p_headline: headline, p_kind: kind });
  if (error) throw error;
}
export async function adminRunBotTick(): Promise<void> {
  const { error } = await supabase.rpc('admin_run_bot_tick');
  if (error) throw error;
}
export interface AdminMetrics {
  humanos: number; bots: number; circulante: number; noticias_24h: number; mudanzas: number; avatares: number;
}
export async function adminMetrics(): Promise<AdminMetrics> {
  const { data, error } = await supabase.rpc('admin_metrics');
  if (error) throw error;
  return data as AdminMetrics;
}

// --- DDN News: feed de noticias/actividad generado por los ciudadanos-bot ---
export interface FeedEvent {
  id: string;
  kind: 'game' | 'big_win' | 'chatter' | 'city';
  headline: string;
  amount: number;
  created_at: string;
}
export async function getFeed(limit = 20): Promise<FeedEvent[]> {
  const { data, error } = await supabase
    .from('feed_events')
    .select('id, kind, headline, amount, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FeedEvent[];
}

// --- Mudanza (cambiar de ciudad): 1ª gratis, luego 10% del patrimonio con
// escalada y enfriamiento. Todo server-side (impuesto = sumidero). ---
export interface MudanzaQuote {
  is_free: boolean;
  fee_pct: number;
  fee: number;
  days_left: number;
  balance: number;
  current: boolean;
  can_move: boolean;
}
export async function getMudanzaQuote(houseCode: string): Promise<MudanzaQuote> {
  const { data, error } = await supabase.rpc('mudanza_quote', { p_house_code: houseCode });
  if (error) throw error;
  return (data as MudanzaQuote[])[0];
}
export interface MudanzaResult { house_code: string; fee: number; fee_pct: number; balance: number; }
export async function mudarse(houseCode: string): Promise<MudanzaResult> {
  const { data, error } = await supabase.rpc('mudarse', { p_house_code: houseCode });
  if (error) throw error;
  return (data as MudanzaResult[])[0];
}

export async function getWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLedger(userId: string, limit = 50): Promise<LedgerTransaction[]> {
  const { data, error } = await supabase
    .from('ledger_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export interface RentaResult {
  amount: number;
  balance: number;
  claim_date: string;
}

export async function claimRenta(action = 'login_diario'): Promise<RentaResult> {
  const { data, error } = await supabase.rpc('claim_renta', { p_action: action });
  if (error) throw error;
  return (data as RentaResult[])[0];
}

export async function getRandomQuestion(): Promise<AcademyQuestion | null> {
  // El cliente solo lee el catálogo público (sin correct_index sensible:
  // la corrección la decide el servidor). Para el MVP exponemos todo el
  // catálogo en lectura; endurecer con una view en Fase 2.
  const { data, error } = await supabase
    .from('academy_questions')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[Math.floor(Math.random() * data.length)];
}

export interface AcademyAnswerResult {
  is_correct: boolean;
  reward_aurelios: number;
  reward_influence: number;
  correct_index: number;
  already_rewarded: boolean;
}

export async function answerQuestion(
  questionId: string,
  chosenIndex: number
): Promise<AcademyAnswerResult> {
  const { data, error } = await supabase.rpc('answer_academy_question', {
    p_question_id: questionId,
    p_chosen_index: chosenIndex,
  });
  if (error) throw error;
  return (data as AcademyAnswerResult[])[0];
}

export interface RouletteSpinResult {
  result_number: number;
  is_red: boolean;
  won: boolean;
  reward_aurelios: number;
  balance: number;
  spins_left: number;
}

export async function spinRouletteFree(
  betType: string,
  betValue?: number
): Promise<RouletteSpinResult> {
  const { data, error } = await supabase.rpc('spin_roulette_free', {
    p_bet_type: betType,
    p_bet_value: betValue,
  });
  if (error) throw error;
  return (data as RouletteSpinResult[])[0];
}

// --- Ruleta con Aurelios reales: apuestas múltiples en un giro ---
// El RNG vive en el servidor; el cliente sólo anima la bola hasta el
// número que devuelve este RPC.
export interface RouletteWagerInput {
  type: string;
  /** straight 0..36 · dozen 1..3 · column 1..3 */
  value?: number;
  /** Aurelios apostados en esta posición del tapete */
  stake: number;
}

export interface RouletteRealResult {
  result_number: number;
  is_red: boolean;
  total_staked: number;
  total_return: number;
  net: number;
  /** fichas restantes en la mesa tras el giro */
  chips: number;
}

export async function spinRoulette(
  bets: RouletteWagerInput[]
): Promise<RouletteRealResult> {
  const { data, error } = await supabase.rpc('spin_roulette', {
    p_bets: bets.map((b) => ({
      type: b.type,
      value: b.value ?? null,
      stake: b.stake,
    })),
  });
  if (error) throw error;
  return (data as RouletteRealResult[])[0];
}

// --- Caja de la ruleta: comprar / retirar fichas de mesa ---
/** Convierte Aurelios de la billetera en fichas de mesa. Devuelve las fichas totales en la mesa. */
export async function rouletteBuyin(amount: number): Promise<number> {
  const { data, error } = await supabase.rpc('roulette_buyin', { p_amount: amount });
  if (error) throw error;
  return data as number;
}

/** Devuelve las fichas restantes a la billetera y cierra la mesa. Devuelve el saldo de billetera. */
export async function rouletteCashout(): Promise<number> {
  const { data, error } = await supabase.rpc('roulette_cashout');
  if (error) throw error;
  return data as number;
}

/** Fichas que el usuario ya tiene en la mesa (0 si no hay sesión abierta). */
export async function getRouletteChips(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('roulette_sessions')
    .select('chips')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.chips ?? 0;
}

// --- Póker: buy-in / cash-out en Aurelios ---
export async function pokerBuyin(amount: number): Promise<number> {
  const { data, error } = await supabase.rpc('poker_buyin', { p_amount: amount });
  if (error) throw error;
  return data as number;
}
export async function pokerCashout(amount: number): Promise<number> {
  const { data, error } = await supabase.rpc('poker_cashout', { p_amount: amount });
  if (error) throw error;
  return data as number;
}

// --- Estado del día (para el Escritorio) ---------------------------------
// ¿Ya reclamó la Renta hoy? Comparamos la última fecha con HOY (UTC, igual
// que el default current_date del servidor).
export async function getRentaClaimedToday(userId: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('renta_claims')
    .select('claim_date')
    .eq('user_id', userId)
    .order('claim_date', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.claim_date === today;
}

export interface MillonToday {
  status: 'in_progress' | 'won' | 'busted' | 'retired';
  correct_count: number;
  prize: number;
}

// Partida de hoy si existe (null = aún no ha jugado hoy).
export async function getMillonToday(userId: string): Promise<MillonToday | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('millonaurelios_plays')
    .select('status, correct_count, prize, play_date')
    .eq('user_id', userId)
    .order('play_date', { ascending: false })
    .limit(1);
  if (error) throw error;
  const row = data?.[0] as { status: MillonToday['status']; correct_count: number; prize: number; play_date: string } | undefined;
  if (row && row.play_date === today) {
    return { status: row.status, correct_count: row.correct_count, prize: row.prize };
  }
  return null;
}

// --- Domanibank: línea de crédito (cupo/préstamo/repago, todo server-side) ---
export interface Loan {
  id: string;
  principal: number;
  interest_bps: number;
  total_due: number;
  outstanding: number;
  term_days: number;
  due_date: string;
  status: 'active' | 'paid';
  opened_at: string;
}

export async function getActiveLoan(userId: string): Promise<Loan | null> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return (data as Loan) ?? null;
}

export interface CreditQuote {
  cupo: number;
  has_active_loan: boolean;
  interest_bps: number;
  term_days: number;
}

export async function bankCreditQuote(): Promise<CreditQuote> {
  const { data, error } = await supabase.rpc('bank_credit_quote');
  if (error) throw error;
  return (data as CreditQuote[])[0];
}

export interface TakeLoanResult {
  loan_id: string;
  total_due: number;
  outstanding: number;
  due_date: string;
  balance: number;
}

export async function bankTakeLoan(principal: number): Promise<TakeLoanResult> {
  const { data, error } = await supabase.rpc('bank_take_loan', { p_principal: principal });
  if (error) throw error;
  return (data as TakeLoanResult[])[0];
}

export interface RepayResult {
  outstanding: number;
  status: 'active' | 'paid';
  balance: number;
}

export async function bankRepay(amount: number): Promise<RepayResult> {
  const { data, error } = await supabase.rpc('bank_repay', { p_amount: amount });
  if (error) throw error;
  return (data as RepayResult[])[0];
}

// --- Millonaurelios: concurso de escalera (premios reales server-side) ---
// El cliente NUNCA recibe correct_index (lo bloquea un column-grant en la DB):
// el servidor califica cada respuesta y acredita el premio.
export interface MillonQuestion {
  id: string;
  step: number;
  prompt: string;
  options: string[];
  category: string;
}

export async function getMillonQuestions(): Promise<MillonQuestion[]> {
  const { data, error } = await supabase
    .from('millonaurelios_questions')
    .select('id, step, prompt, options, category')
    .eq('is_active', true)
    .order('step');
  if (error) throw error;
  return (data ?? []).map((q) => ({
    id: q.id as string,
    step: q.step as number,
    prompt: q.prompt as string,
    options: (q.options as string[]) ?? [],
    category: q.category as string,
  }));
}

export interface MillonPlay {
  play_id: string;
  status: 'in_progress' | 'won' | 'busted' | 'retired';
  correct_count: number;
  prize: number;
}

export async function startMillon(): Promise<MillonPlay> {
  const { data, error } = await supabase.rpc('millonaurelios_start');
  if (error) throw error;
  return (data as MillonPlay[])[0];
}

export interface MillonAnswerResult {
  is_correct: boolean;
  correct_index: number;
  status: 'in_progress' | 'won' | 'busted' | 'retired';
  banked: number;        // premio asegurado tras responder
  prize_awarded: number; // Aurelios acreditados (solo si terminó)
  balance: number;
}

export async function answerMillon(
  playId: string,
  questionId: string,
  chosenIndex: number
): Promise<MillonAnswerResult> {
  const { data, error } = await supabase.rpc('millonaurelios_answer', {
    p_play_id: playId,
    p_question_id: questionId,
    p_chosen_index: chosenIndex,
  });
  if (error) throw error;
  return (data as MillonAnswerResult[])[0];
}

export interface MillonRetireResult {
  prize: number;
  correct_count: number;
  balance: number;
}

export async function retireMillon(playId: string): Promise<MillonRetireResult> {
  const { data, error } = await supabase.rpc('millonaurelios_retire', { p_play_id: playId });
  if (error) throw error;
  return (data as MillonRetireResult[])[0];
}

// --- Lobby vivo: jugadores (incluye bots is_bot=true) para "que se sienta lleno"
export interface LobbyPlayer {
  id: string;
  alias: string;
  rank: string;
  influence: number;
  house_id: string | null;
  avatar_code: string;
}

export async function getLobbyPlayers(limit = 50): Promise<LobbyPlayer[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, alias, rank, influence, house_id, avatar_code')
    .order('influence', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LobbyPlayer[];
}

// --- Mercado de Avatares -------------------------------------------------
// El alias nombra al avatar; aquí solo viaja un arquetipo interno. Primera
// vez gratis; cambios posteriores se pagan con Aurelios (todo server-side).
export interface MarketAvatar {
  code: string;
  image_path: string;
  image_ready: boolean;
  archetype: string;
  category: string;
  category_label: string;
  category_price: number;
  category_sort: number;
  is_starter: boolean;
  owned: boolean;
  equipped: boolean;
  effective_cost: number;       // lo que ESTE usuario pagaría ahora
  free_pick_available: boolean; // ¿le queda su pick de bienvenida gratis?
}

export async function getAvatarMarket(): Promise<MarketAvatar[]> {
  const { data, error } = await supabase.rpc('avatar_market');
  if (error) throw error;
  return (data as MarketAvatar[]) ?? [];
}

export interface SetAvatarResult {
  avatar_code: string;
  cost: number;
  balance: number;
}

export async function setAvatar(code: string): Promise<SetAvatarResult> {
  const { data, error } = await supabase.rpc('set_avatar', { p_code: code });
  if (error) throw error;
  return (data as SetAvatarResult[])[0];
}

// Resuelve el código del avatar equipado a su ruta de imagen.
export function avatarSrc(code: string | null | undefined): string {
  return `/assets/avatars/${code || 'avatar-1'}.webp`;
}
