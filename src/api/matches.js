import { request } from './client'

export function get_match_state(match_id, options = {}) {
  return request(`/api/matches/${encodeURIComponent(match_id)}/state`, {
    ...options, cache: 'no-store',
  })
}
