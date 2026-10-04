// ÚNICO lugar que conoce el formato de los mensajes del WebSocket del partido.
// Si el contrato del backend difiere, se ajusta SOLO este archivo (y match_reducer.js).
//
// Formato asumido (JSON):
//  { type: 'snapshot', seq, state: { status, tick, score:{home,away}, ball:{x,y}, players:[{id,team,x,y,action?}] } }
//  { type: 'update',   seq, tick?, score?, ball?, players?:[{id,x,y,action?}], events?:[{type,player_id,...}] }
//  { type: 'error',    message, player_id?, behavior_id? }
//  { type: 'finished', seq?, score? }

const is_obj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const is_num = (v) => typeof v === 'number' && Number.isFinite(v)

export function parse_message(raw) {
  let msg
  try {
    msg = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
  if (!is_obj(msg) || typeof msg.type !== 'string') return null
  return msg
}

export const normalize_player = (p) =>
  is_obj(p) && p.id != null && is_num(p.x) && is_num(p.y)
    ? { id: p.id, team: p.team, x: p.x, y: p.y, action: p.action }
    : null

export const normalize_ball = (b) => (is_obj(b) && is_num(b.x) && is_num(b.y) ? { x: b.x, y: b.y } : null)