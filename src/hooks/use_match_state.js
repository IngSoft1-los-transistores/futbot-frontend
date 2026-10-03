import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get_match_state } from '../api/matches'
import { read_session } from '../auth/session'

export default function useMatchState(match_id) {
  const navigate = useNavigate()
  const [view, set_view] = useState({ state: null, error: '', loading: true })

  useEffect(() => {
    let disposed = false
    let timer
    let expiry_timer
    let latest = null
    let controller
    const unauthorized = () => {
      disposed = true
      clearTimeout(timer)
      controller?.abort()
      navigate('/login', { replace: true })
    }
    const check_session = () => {
      clearTimeout(expiry_timer)
      const session = read_session()
      if (!session) { unauthorized(); return }
      expiry_timer = setTimeout(check_session, Math.min(session.expires_at * 1000 - Date.now(), 2147483647))
    }
    const storage_changed = (event) => {
      if (event.key === 'futbot.session' || event.key === null) check_session()
    }
    async function poll() {
      if (disposed) return
      if (!read_session()) { unauthorized(); return }
      controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      let keep_polling = true
      try {
        const state = await get_match_state(match_id, { signal: controller.signal })
        if (disposed) return
        if (state.match_id !== match_id || !Number.isInteger(state.revision) || state.revision < 1) {
          throw new Error('Estado inválido')
        }
        // Reemplazar el snapshot completo: nunca mezclar datos de distintos ticks.
        if (!latest || state.revision >= latest.revision) latest = state
        set_view({ state: latest, loading: false, error: '' })
        keep_polling = latest.status !== 'finished'
      } catch (cause) {
        if (disposed) return
        if (cause.status === 401) { unauthorized(); return }
        const terminal = [403, 404, 422].includes(cause.status)
        keep_polling = !terminal
        if (terminal) latest = null
        const error = cause.status === 403 ? 'No tenés acceso a este partido.'
          : cause.status === 404 ? 'El partido no existe.'
            : cause.status === 422 ? 'El ID del partido no es válido.'
              : cause.status === 409 ? 'Esperando el estado inicial del partido. Se actualizará automáticamente.'
                : 'No se pudo actualizar el partido. Reintentando automáticamente…'
        set_view({ state: latest, loading: false, error })
      } finally {
        clearTimeout(timeout)
        if (!disposed && keep_polling) timer = setTimeout(poll, 1000)
      }
    }
    check_session()
    window.addEventListener('futbot:unauthorized', unauthorized)
    window.addEventListener('storage', storage_changed)
    window.addEventListener('focus', check_session)
    poll()
    return () => {
      disposed = true
      controller?.abort()
      clearTimeout(timer)
      clearTimeout(expiry_timer)
      window.removeEventListener('futbot:unauthorized', unauthorized)
      window.removeEventListener('storage', storage_changed)
      window.removeEventListener('focus', check_session)
    }
  }, [match_id, navigate])

  return view
}
