// ============================================================
// DOMANI — Worker de bots (lobby vivo, Capa 2).
// Cron programado: mueve métricas de bots de forma verosímil
// (suben Influencia, "actividad reciente") para que el salón
// se sienta poblado aunque haya pocos humanos.
//
// REGLA: los bots operan en Aurelios igual que todos; nunca tocan
// dinero real. Siempre is_bot=true (transparencia para auditoría).
// Usa SERVICE_ROLE (privado): este código corre en el edge, jamás
// en el navegador.
// ============================================================
import { createClient } from '@supabase/supabase-js';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Toma un lote de bots y les sube algo de Influencia (actividad verosímil).
    const { data: bots, error } = await admin
      .from('profiles')
      .select('id, influence')
      .eq('is_bot', true)
      .limit(40);

    if (error) {
      console.error('No se pudieron leer bots:', error.message);
      return;
    }
    if (!bots || bots.length === 0) return;

    // Mueve un subconjunto aleatorio (no todos cada vez = más natural).
    const movers = bots.filter(() => Math.random() < 0.5);
    await Promise.all(
      movers.map((b) => {
        const bump = Math.floor(Math.random() * 6); // 0..5 de influencia
        return admin
          .from('profiles')
          .update({ influence: (b.influence ?? 0) + bump, updated_at: new Date().toISOString() })
          .eq('id', b.id);
      })
    );

    console.log(`Lobby vivo: ${movers.length} bots actualizados.`);
  },

  // Endpoint de salud opcional (Pages/Workers).
  async fetch(): Promise<Response> {
    return new Response('DOMANI bots worker OK', { status: 200 });
  },
};
