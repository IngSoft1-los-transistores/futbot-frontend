import { useEffect, useReducer } from 'react'
import { read_session } from '../auth/session'
import { initial_match_state, match_reducer } from '../match/match_reducer'
import { parse_message } from '../match/protocol'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'
const BACKOFF = [500, 1000, 2000, 4000, 8000]
// Códigos de cierre que indican token inválido/vencido (a confirmar con el backend).
const UNAUTHORIZED_CODES = [1008, 4401]

/**
 * Se suscribe al partido por WebSocket el backend ejecuta los comportamientos; acá solo se reciben y representan los resultados.
 */
export function useMatchSocket(match_id) {
  const [state, dispatch] = useReducer(match_reducer, initial_match_state)

  useEffect(() => {
    if (!match_id) return undefined
    let ws
    let timer
    let attempts = 0
    let disposed = false // evita doble conexión con StrictMode y fugas al desmontar

    const connect = () => {
      const session = read_session()
      if (!session) {
        window.dispatchEvent(new Event('futbot:unauthorized'))
        return
      }
      ws = new WebSocket(`${WS_URL}/ws/matches/${match_id}?token=${encodeURIComponent(session.access_token)}`)
      ws.onopen = () => {
        attempts = 0
        dispatch({ type: 'connection', value: 'open' })
      }
      ws.onmessage = (e) => {
        const message = parse_message(e.data)
        if (message) dispatch({ type: 'message', message })
      }
      ws.onclose = (e) => {
        if (disposed) return
        if (UNAUTHORIZED_CODES.includes(e.code)) {
          dispatch({ type: 'connection', value: 'closed' })
          window.dispatchEvent(new Event('futbot:unauthorized'))
          return
        }
        dispatch({ type: 'connection', value: 'reconnecting' })
        // Al reconectar el backend debe enviar un snapshot que resincroniza el estado.
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
  }, [match_id])

  return { state, dismiss_error: (index) => dispatch({ type: 'dismiss_error', index }) }
}