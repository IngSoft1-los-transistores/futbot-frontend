import { normalize_ball, normalize_player, normalize_score } from './protocol'

const MAX_EVENTS = 30
const MAX_ERRORS = 5

// status: notStarted | running | paused | finished
export const initial_match_state = {
  connection: 'connecting', // connecting | open | reconnecting | closed
  status: 'notStarted',
  role: null,
  current_time: 0,
  score: { home: 0, away: 0 },
  ball: null, // { x, y, vx, vy }
  players: {}, // id -> { id, club_id, name, x, y, is_playing }
  clubs: null, // { home: club_id, away: club_id }
  pause: null, // { duration_seconds } mientras dura una pausa
  events: [], // goles, desconexiones, sustituciones
  errors: [], // errores recibidos del servidor
}

const push_event = (state, event) => ({ ...state, events: [event, ...state.events].slice(0, MAX_EVENTS) })

const to_map = (list) => Object.fromEntries(list.map(normalize_player).filter(Boolean).map((p) => [p.id, p]))

function apply_event(state, { event, payload }) {
  switch (event) {
    case 'MATCH_CONNECTED':
      return {
        ...state,
        status: payload.status ?? state.status,
        role: payload.role ?? state.role,
        score: normalize_score(payload.score) ?? state.score,
        current_time: Number.isFinite(payload.currentTime) ? payload.currentTime : state.current_time,
        ball: normalize_ball(payload.ball) ?? state.ball,
      }

    case 'MATCH_STARTED':
      return {
        ...state,
        status: state.status === 'notStarted' ? 'running' : state.status,
        clubs: { home: payload.homeClub?.clubId, away: payload.awayClub?.clubId },
      }

    case 'SIMULATION_TICK': {
      if (state.status === 'finished') return state // ticks tardíos no deshacen el final
      // Cada tick trae el estado físico completo: se reemplaza lo que llega válido
      // y se conserva lo anterior si el dato viene malformado.
      const players = Array.isArray(payload.players) ? to_map(payload.players) : {}
      return {
        ...state,
        status: state.status === 'notStarted' ? 'running' : state.status,
        current_time: Number.isFinite(payload.currentTime) ? payload.currentTime : state.current_time,
        score: normalize_score(payload.score) ?? state.score,
        ball: normalize_ball(payload.ball) ?? state.ball,
        players: Object.keys(players).length ? players : state.players,
      }
    }

    case 'GOAL_SCORED':
      return push_event(
        {
          ...state,
          score: normalize_score(payload.score) ?? state.score,
          current_time: Number.isFinite(payload.currentTime) ? payload.currentTime : state.current_time,
        },
        { type: 'goal', club_id: payload.clubId, player_id: payload.playerId, current_time: payload.currentTime },
      )

    case 'PAUSE_STARTED':
      return state.status === 'finished'
        ? state
        : { ...state, status: 'paused', pause: { duration_seconds: payload.durationSeconds ?? null } }

    case 'PAUSE_ENDED': {
      if (state.status === 'finished') return state
      const subs = Array.isArray(payload.executedSubstitutions) ? payload.executedSubstitutions : []
      return subs.reduce(
        (acc, s) =>
          push_event(acc, { type: 'substitution', club_id: s.clubId, leaving_player_id: s.leavingPlayerId, entering_player_id: s.enteringPlayerId }),
        { ...state, status: 'running', pause: null },
      )
    }

    case 'CLIENT_DISCONNECTED':
      return push_event(state, { type: 'client_disconnected', club_id: payload.clubId, message: payload.message })

    case 'MATCH_FINISHED':
      return { ...state, status: 'finished', pause: null, score: normalize_score(payload.finalScore) ?? state.score }

    case 'ERROR':
      return {
        ...state,
        errors: [
          { code: payload.code, message: String(payload.message ?? 'Error de ejecución'), player_id: payload.playerId },
          ...state.errors,
        ].slice(0, MAX_ERRORS),
      }

    default:
      return state // evento desconocido: se ignora
  }
}

export function match_reducer(state, action) {
  switch (action.type) {
    case 'connection':
      return { ...state, connection: action.value }
    case 'message':
      return apply_event(state, action.message)
    case 'dismiss_error':
      return { ...state, errors: state.errors.filter((_, i) => i !== action.index) }
    default:
      return state
  }
}