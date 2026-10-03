import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get_current_user, logout as logout_session } from '../api/client'
import { clear_session, read_session, save_session } from '../auth/session'

export default function Home() {
  const navigate = useNavigate()
  const [status, set_status] = useState('loading')
  const [error, set_error] = useState('')
  const [attempt, set_attempt] = useState(0)
  const [closing, set_closing] = useState(false)

  useEffect(() => {
    const session = read_session()
    if (!session) {
      navigate('/login', { replace: true })
      return
    }
    const controller = new AbortController()
    const unauthorized = () => navigate('/login', { replace: true })
    let expiry_timer
    const check_expiration = () => {
      clearTimeout(expiry_timer)
      const current = read_session()
      if (!current) {
        unauthorized()
        return
      }
      expiry_timer = setTimeout(check_expiration, Math.min(current.expires_at * 1000 - Date.now(), 2147483647))
    }
    const storage_changed = (event) => {
      if (event.key === 'futbot.session' || event.key === null) check_expiration()
    }
    check_expiration()
    window.addEventListener('focus', check_expiration)
    document.addEventListener('visibilitychange', check_expiration)
    window.addEventListener('storage', storage_changed)
    window.addEventListener('futbot:unauthorized', unauthorized)
    get_current_user({ signal: controller.signal }).then((user) => {
      if (controller.signal.aborted) return
      // El club autorizado lo determina el servidor.
      const current = read_session()
      if (!current) return
      save_session({ ...current, club_id: user.club_id })
      set_status('ready')
    }).catch((cause) => {
      if (controller.signal.aborted || cause.name === 'AbortError') return
      if (cause.status === 401) {
        clear_session()
        unauthorized()
        return
      }
      set_error(cause.status ? cause.message : 'No se pudo verificar la sesión. Intentá nuevamente.')
      set_status('error')
    })
    return () => {
      controller.abort()
      clearTimeout(expiry_timer)
      window.removeEventListener('focus', check_expiration)
      document.removeEventListener('visibilitychange', check_expiration)
      window.removeEventListener('futbot:unauthorized', unauthorized)
      window.removeEventListener('storage', storage_changed)
    }
  }, [navigate, attempt])

  async function logout() {
    if (closing) return
    set_closing(true)
    set_error('')
    try {
      await logout_session()
      navigate('/login', { replace: true })
    } catch {
      set_error('No se pudo cerrar la sesión en el servidor. Intentá nuevamente.')
    } finally {
      set_closing(false)
    }
  }

  return (
    <main className="card">
      <p className="brand">FutBot</p>
      {status === 'loading' && <p role="status">Verificando sesión…</p>}
      {status === 'ready' && <>
        <h1>Menú principal</h1>
        <p className="intro">Bienvenido a tu club.</p>
        <form className="match-entry" onSubmit={(event) => {
          event.preventDefault()
          const id = new FormData(event.currentTarget).get('match_id').trim()
          if (id) navigate(`/matches/${encodeURIComponent(id)}`)
        }}>
          <label htmlFor="match_id">ID del partido</label>
          <input id="match_id" name="match_id" required placeholder="Ingresá el ID del partido" />
          <button type="submit">Ver partido</button>
        </form>
      </>}
      {error && <p role="alert">{error}</p>}
      {status === 'error' && <>
        <button onClick={() => { set_error(''); set_status('loading'); set_attempt(attempt + 1) }}>Reintentar</button>
      </>}
      <button onClick={logout} disabled={closing}>{closing ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
    </main>
  )
}
