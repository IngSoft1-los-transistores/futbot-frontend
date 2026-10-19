import { request } from './client'
import { ROOM_STATUS } from './friendly_rooms'

// A league accepts new clubs only until it starts.
export const OPEN_LEAGUE_STATUSES = [ROOM_STATUS.WAITING_GUEST, ROOM_STATUS.READY_TO_START]

export const LEAGUE_STATUS_LABELS = {
  [ROOM_STATUS.WAITING_GUEST]: 'Esperando clubes',
  [ROOM_STATUS.READY_TO_START]: 'Lista para empezar',
  [ROOM_STATUS.IN_PROGRESS]: 'En juego',
  [ROOM_STATUS.FINISHED]: 'Finalizada',
  [ROOM_STATUS.CANCELLED]: 'Cancelada',
}

const league_path = (league_id) => `/api/leagues/${encodeURIComponent(league_id)}`

const to_selection = ({ playerId, behaviorId }) => ({
  playerId: String(playerId),
  behaviorId: String(behaviorId),
})

export function get_league(league_id, options = {}) {
  return request(league_path(league_id), options)
}

// password is only sent for private leagues.
export function join_league(league_id, { starters, substitutes, password }) {
  return request(`${league_path(league_id)}/join`, {
    method: 'POST',
    body: JSON.stringify({
      titulares: starters.map(to_selection),
      suplentes: substitutes.map(to_selection),
      ...(password ? { password } : {}),
    }),
  })
}

export const free_spots = (league) => Math.max(league.maxClubs - league.enrolledClubs, 0)

export const is_league_full = (league) => league.enrolledClubs >= league.maxClubs
