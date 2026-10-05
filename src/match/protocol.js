// ÚNICO lugar que conoce el formato de los mensajes del WebSocket del partido.
// Contrato: "api-contrato Transistores" (módulo Partido en Vivo).
// Todos los mensajes del servidor tienen la forma { event: 'NOMBRE', payload: {...} }.

const is_obj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const is_num = (v) => typeof v === 'number' && Number.isFinite(v)

export function parse_message(raw) {
  let msg
  try {
    msg = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
  if (!is_obj(msg) || typeof msg.event !== 'string') return null
  return { event: msg.event, payload: is_obj(msg.payload) ? msg.payload : {} }
}

export const normalize_player = (p) =>
  is_obj(p) && p.playerId != null && is_num(p.x) && is_num(p.y)
    ? { id: p.playerId, club_id: p.clubId, name: p.name, x: p.x, y: p.y, is_playing: p.isPlaying !== false }
    : null

export const normalize_ball = (b) =>
  is_obj(b) && is_num(b.x) && is_num(b.y)
    ? { x: b.x, y: b.y, vx: is_num(b.vx) ? b.vx : 0, vy: is_num(b.vy) ? b.vy : 0 }
    : null

export const normalize_score = (s) =>
  is_obj(s) && is_num(s.home) && is_num(s.away) ? { home: s.home, away: s.away } : null