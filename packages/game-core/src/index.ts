// ============================================================
// @domani/game-core — Contrato común de juegos + liquidación
// ============================================================
// DOMANI_BUILD_CODE.md §5: "agregar un juego sin romper nada".
//
// El motor económico NO conoce las reglas de cada juego. Cualquier
// juego nuevo solo necesita implementar GameModule y reportar sus
// resultados; el core los envía a settle_session() en Postgres.
//
// REGLA INNEGOCIABLE: nunca se toca el ledger ni el wallet desde
// aquí. Todo movimiento de Aurelios pasa por settle_session (DB).
// ============================================================

export type GameFamily = 'skill' | 'chance';

/** Un asiento/participante dentro de una sesión. */
export interface Participant {
  userId: string;
  seat?: number;
  isBot?: boolean;
}

/** Resultado por jugador que el core entrega a settle_session(). */
export interface PlayerResult {
  user_id: string;
  position: number | null;
  /** Aurelios ganados (+) o perdidos (-). 0 = sin cambio. */
  aurelios_delta: number;
  /** Influencia ganada (+) por mérito. Nunca por azar puro. */
  influence_delta: number;
}

/** Contexto que el core inyecta a cada módulo. */
export interface GameContext {
  sessionId: string;
  gameCode: string;
  family: GameFamily;
  /** Buy-in en Aurelios (0 para juegos gratis). Nunca dinero real. */
  buyinAurelios: number;
}

/**
 * Contrato que todo juego debe implementar. El ciclo de vida es:
 *   createSession() -> join()* -> playTurn()* -> resolve()
 * y el core toma el array de PlayerResult y llama settle().
 */
export interface GameModule<TState = unknown, TMove = unknown> {
  readonly code: string;
  readonly family: GameFamily;
  readonly minPlayers: number;
  readonly maxPlayers: number;

  /** Crea el estado inicial de una partida. */
  createSession(ctx: GameContext, participants: Participant[]): TState;

  /** Añade un participante a una sesión abierta. */
  join(state: TState, participant: Participant): TState;

  /** Aplica una jugada/turno. Para juegos vs banca puede ser un solo turno. */
  playTurn(state: TState, userId: string, move: TMove): TState;

  /** Indica si la partida terminó. */
  isFinished(state: TState): boolean;

  /** Calcula los resultados finales por jugador (deltas de Aurelios/Influencia). */
  resolve(state: TState): PlayerResult[];
}

/**
 * Función que el host (Worker/Edge con service_role) usa para liquidar.
 * Aquí NO vive lógica de Aurelios: solo delega en settle_session de la DB.
 */
export type SettleFn = (
  sessionId: string,
  results: PlayerResult[]
) => Promise<void>;

/** Registro central de módulos de juego disponibles. */
export class GameRegistry {
  private modules = new Map<string, GameModule>();

  register(mod: GameModule): void {
    if (this.modules.has(mod.code)) {
      throw new Error(`Juego ya registrado: ${mod.code}`);
    }
    this.modules.set(mod.code, mod);
  }

  get(code: string): GameModule {
    const mod = this.modules.get(code);
    if (!mod) throw new Error(`Juego no registrado: ${code}`);
    return mod;
  }

  list(): GameModule[] {
    return [...this.modules.values()];
  }
}

/**
 * Liquida una partida ya resuelta: toma el módulo, obtiene resultados
 * y los envía a settle(). Único punto de contacto con la economía.
 */
export async function settleGame(
  mod: GameModule,
  state: unknown,
  sessionId: string,
  settle: SettleFn
): Promise<PlayerResult[]> {
  if (!mod.isFinished(state)) {
    throw new Error(`La partida ${sessionId} aún no termina`);
  }
  const results = mod.resolve(state);
  await settle(sessionId, results);
  return results;
}
