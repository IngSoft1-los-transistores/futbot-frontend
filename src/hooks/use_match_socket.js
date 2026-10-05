import { useEffect, useReducer } from 'react'
import { read_session } from '../auth/session'
import { initial_match_state, match_reducer } from '../match/match_reducer'
import { parse_message } from '../match/protocol'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'
const BACKOFF = [500, 1000, 2000, 4000, 8000]
const MAX_ATTEMPTS = 10
const MAX_INITIAL_ATTEMPTS = 3 
const NORMAL_CLOSE = 1000
// Códigos de cierre que indican token inválido/vencido
const UNAUTHORIZED_CODES = [1008, 4401, 4403]
const NOT_FOUND_CODE = 4404 // partido inexistente

export function useMatchSocket(match_id, role = 'player') {
  const [state, dispatch] = useReducer(match_reducer, initial_match_state)

  useEffect(() => {
    if (!match_id) return undefined
    let ws
    let timer
    let attempts = 0
    let received = false // llegó al menos un mensaje del servidor
    let finished = false
    let disposed = false // evita doble conexión con StrictMode y fugas al desmontar

    const closed = () => dispatch({ type: 'connection', value: 'closed' })

    const connect = () => {
      const session = read_session()
      if (!session) {
        window.dispatchEvent(new Event('futbot:unauthorized'))
        return
      }
      const query = new URLSearchParams({ role, token: session.access_token })
      ws = new WebSocket(`${WS_URL}/ws/match/${match_id}?${query}`)
      ws.onopen = () => dispatch({ type: 'connection', value: 'open' })
      ws.onmessage = (e) => {
        const message = parse_message(e.data)
        if (!message) return
        received = true
        attempts = 0 
        dispatch({ type: 'message', message })
        if (message.event === 'MATCH_FINISHED') {
          finished = true
          ws.close(NORMAL_CLOSE)
        }
      }
      ws.onclose = (e) => {
        if (disposed) return
        if (finished || e.code === NORMAL_CLOSE || e.code === NOT_FOUND_CODE) return closed()
        if (UNAUTHORIZED_CODES.includes(e.code)) {
          closed()
          window.dispatchEvent(new Event('futbot:unauthorized'))
          return
        }
        if (attempts >= (received ? MAX_ATTEMPTS : MAX_INITIAL_ATTEMPTS)) return closed()
        dispatch({ type: 'connection', value: 'reconnecting' })
        // Al reconectar, el servidor envía MATCH_CONNECTED y los SIMULATION_TICK siguientes resincronizan todo.
        timer = setTimeout(connect, BACKOFF[Math.min(attempts++, BACKOFF.length - 1)])
      }
      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      disposed = true
      clearTimeout(timer)
      ws?.close()
    }
  }, [match_id, role])

  return { state, dismiss_error: (index) => dispatch({ type: 'dismiss_error', index }) }
}