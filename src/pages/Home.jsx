import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get_current_user, logout as logout_session } from '../api/client'
import { clear_session, read_session, save_session } from '../auth/session'
import './Home.css'
import JoinFriendlyModal from '../components/join_friendly_modal'

export default function Home() {
  const navigate = useNavigate()
  const [status, set_status] = useState('loading')
  const [error, set_error] = useState('')
  const [attempt, set_attempt] = useState(0)
  const [closing, set_closing] = useState(false)
  const [join_open, set_join_open] = useState(false)

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

  function join_friendly({ room_id, code }) {
    set_join_open(false)
    // El código funciona como contraseña: va en el state de la navegación, no en la URL
    navigate('/friendly/join', { state: { room_id, code } })
  }

  return (
    <div className="home-page">
      <header className="home-topbar">
        <div className="home-identity">
          <span className="home-mark"><HomeIcon /></span>
          <div>
            <p className="home-product">FutBot</p>
            <p className="home-project">laboratorio / presión alta v4</p>
          </div>
        </div>
        <div className="home-session">
          {status === 'ready' && <span className="home-session-state"><span aria-hidden="true" /> Club en línea</span>}
          <button className="home-action" onClick={logout} disabled={closing}>
            {closing ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      </header>

      <main className="home-content" aria-busy={status === 'loading'}>
        {status === 'loading' && <div className="home-notice" role="status">Verificando sesión…</div>}
        {error && <p className="home-notice home-error" role="alert">{error}</p>}
        {status === 'error' && (
          <button className="home-action" onClick={() => { set_error(''); set_status('loading'); set_attempt(attempt + 1) }}>
            Reintentar
          </button>
        )}
        {status === 'ready' && (
          <section className="home-welcome" aria-labelledby="home-title">
            <h1 id="home-title">Menú principal</h1>
            <p>Bienvenido a tu club. Prepará tu equipo, diseñá tu estrategia y elegí tu próximo desafío.</p>
            <button className="home-action" onClick={() => set_join_open(true)}>
              Unirse a un amistoso
            </button>
          </section>
        )}
      </main>
       <JoinFriendlyModal
        open={join_open}
        on_close={() => set_join_open(false)}
        on_submit={join_friendly}
      />
    </div>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 8l8 8M16 8l-8 8" />
    </svg>
  )
}
