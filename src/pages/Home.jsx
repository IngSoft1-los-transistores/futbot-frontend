// src/pages/Home.jsx
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { get_current_user, logout as logout_session } from '../api/client'
import { clear_session, read_session, save_session } from '../auth/session'
import CreateFriendlyModal from '../components/CreateFriendlyModal'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()
  const [status, set_status] = useState('loading')
  const [error, set_error] = useState('')
  const [attempt, set_attempt] = useState(0)
  const [closing, set_closing] = useState(false)
  const [isFriendlyModalOpen, setIsFriendlyModalOpen] = useState(false)

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

    get_current_user({ signal: controller.signal })
      .then((user) => {
        if (controller.signal.aborted) return
        const current = read_session()
        if (!current) return
        save_session({ ...current, club_id: user.club_id })
        set_status('ready')
      })
      .catch((cause) => {
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
    <div className="home-page">
      <header className="home-topbar">
        <div className="home-identity">
          <span className="home-mark"><HomeIcon/></span>
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
        <>
          <section className="home-welcome" aria-labelledby="home-title">
            <h1 id="home-title">Menú principal</h1>
            <p>Bienvenido a tu club. Prepará tu equipo, diseñá tu estrategia y elegí tu próximo desafío.</p>
          </section>

          {/* Grilla para las tarjetas */}
          <div className="home-grid">
          
            {/* Tarjeta de Comportamientos */}
            <article className="home-card" aria-labelledby="home-card-behaviors" aria-describedby="home-card-behaviors-desc">
              <div className="home-card-content">
          
                {/* Ícono de código */}
                <div className="home-card-icon">
                  <svg 
                    viewBox="0 0 24 24"
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
          
                {/* Información de la tarjeta */}
                <div>
                  <h2>Comportamientos</h2>
                  <p>
                  Define reglas, bloques y comportamientos para cada jugador antes de enviarlos al campo.
                  </p>
                </div>
              </div>

              {/* Botón de acceso a la ruta */}
              <Link 
                to="/behaviors" 
                className="home-action"
              >
              VER COMPORTAMIENTOS
              </Link>
            </article>
          </div>
        </>
        )}
      </main>

      <CreateFriendlyModal
        isOpen={isFriendlyModalOpen}
        onClose={() => setIsFriendlyModalOpen(false)}
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

function CodeIcon() {
  return (
    <svg className="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>
  )
}

function GearIcon() {
  return (
    <svg className="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
  )
}

function BookIcon() {
  return (
    <svg className="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
  )
}

function HelpIcon() {
  return (
    <svg className="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
  )
}

function UsersIcon() {
  return (
    <svg className="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
  )
}

function LockIcon() {
  return (
    <svg className="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
  )
}