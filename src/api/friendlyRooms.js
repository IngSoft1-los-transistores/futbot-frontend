import { request } from './client'

export const ROOM_STATUS = {
  WAITING_GUEST: 'waiting_guest',
  READY_TO_START: 'ready_to_start',
  IN_PROGRESS: 'in_progress',
  FINISHED: 'finished',
  CANCELLED: 'cancelled',
}

export function getFriendlyRoom(roomId) {
  return request(`/api/friendly/rooms/${encodeURIComponent(roomId)}`)
}

export function startFriendlyMatch(roomId) {
  return request(`/api/friendly/rooms/${encodeURIComponent(roomId)}/start`, {
    method: 'POST',
  })
}
