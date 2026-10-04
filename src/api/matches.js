import { API_URL } from './client'

export function connect_match_state(match_id) {
  const base = import.meta.env.VITE_WS_URL || API_URL.replace(/^http/, 'ws')
  return new WebSocket(`${base.replace(/\/$/, '')}/api/matches/${encodeURIComponent(match_id)}/ws`)
}
