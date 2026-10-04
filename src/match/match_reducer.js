import { normalize_ball, normalize_player } from './protocol'

const MAX_EVENTS = 30
const MAX_ERRORS = 5

export const initial_match_state = {
  connection: 'connecting', // connecting | open | reconnecting | closed
  status: 'waiting', // waiting | running | finished
  seq: -1,
  tick: 0,
  score: { home: 0, away: 0 },
  ball: null,
  players: {}, // id -> { id, team, x, y, action }
  events: [], // acciones recientes (más nuevas primero)
  errors: [], // errores de ejecución recibidos (no tumban la vista)
}

const merge_player = (previous, raw) => {
  const p = normalize_player(raw)
  if (!p) return previous
  const present = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined))
  return { ...previous, ...present }
}

const to_map = (list = []) =>
  Object.fromEntries(
    list.map(normalize_player).filter(Boolean).map((p) => [p.id, { ...p, action: p.action ?? null }])
)

const with_events = (state, events = []) =>
  events.length ? { ...state, events: [...events.slice().reverse(), ...state.events].slice(0, MAX_EVENTS) } : state

export function match_reducer(state, action) {
  switch (action.type) {
    case 'connection':
      return { ...state, connection: action.value }

    case 'message': {
      const m = action.message
      switch (m.type) {
        case 'snapshot': {
          // El snapshot reemplaza todo el estado: es la fuente de verdad (también tras reconectar).
          const s = m.state ?? {}
          return {
            ...state,
            seq: Number.isInteger(m.seq) ? m.seq : state.seq,
            status: s.status ?? 'running',
            tick: s.tick ?? 0,
            score: s.score ?? state.score,
            ball: normalize_ball(s.ball),
            players: to_map(s.players),
          }
        }

        case 'update': {
          // Descarta duplicados / mensajes fuera de orden.
          if (Number.isInteger(m.seq) && m.seq <= state.seq) return state
          const players = { ...state.players }
          for (const raw of m.players ?? []) {
            const merged = merge_player(players[raw?.id], raw)
            if (merged) players[merged.id] = merged
          }
          const next = {
            ...state,
            seq: Number.isInteger(m.seq) ? m.seq : state.seq,
            status: state.status === 'waiting' ? 'running' : state.status,
            tick: m.tick ?? state.tick,
            score: m.score ?? state.score,
            ball: normalize_ball(m.ball) ?? state.ball,
            players,
          }
          return with_events(next, m.events)
        }

        case 'finished':
          return { ...state, status: 'finished', score: m.score ?? state.score }

        case 'error':
          // El error se registra pero el último estado válido se conserva.
          return {
            ...state,
            errors: [{ message: String(m.message ?? 'Error de ejecución'), player_id: m.player_id, behavior_id: m.behavior_id }, ...state.errors].slice(0, MAX_ERRORS),
          }

        default:
          return state // tipo desconocido: se ignora
      }
    }

    case 'dismiss_error':
      return { ...state, errors: state.errors.filter((_, i) => i !== action.index) }

    default:
      return state
  }
}