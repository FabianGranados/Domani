-- Ajedrez PvP Fase 1: invitación por enlace + cola "jugar ya" separada + recientes.
-- (Aplicada vía MCP; este archivo es el registro. Ver RPCs chess_create_link,
--  chess_join_link, chess_quick_match (kind='quick'), chess_recent_opponents.)
alter table public.chess_matches add column if not exists kind text not null default 'direct';
-- 'direct' = reto a alguien · 'quick' = cola al azar · 'link' = invitación por enlace.
