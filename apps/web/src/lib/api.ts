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

// --- Lobby vivo: jugadores (incluye bots is_bot=true) para "que se sienta lleno"
export interface LobbyPlayer {
  id: string;
  alias: string;
  rank: string;
  influence: number;
  house_id: string | null;
}

export async function getLobbyPlayers(limit = 50): Promise<LobbyPlayer[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, alias, rank, influence, house_id')
    .order('influence', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
