import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { list_public_friendly_rooms } from '../api/client'
import { read_session } from '../auth/session'
import Spinner from '../components/atoms/spinner'
import './Home.css'
import './friendly_list_page.css'

const STATUS_LABELS = {
  waitingGuest: 'Esperando rival',
  readyToStart: 'Lista para iniciar',
  inProgress: 'En curso',
  finished: 'Finalizada',
}

const date_format = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' })

export default function FriendlyListPage() {
  const navigate = useNavigate()
  const [rooms, set_rooms] = useState([])
  const [status, set_status] = useState('loading')   // loading | ready | error
  const [error, set_error] = useState('')
  const [attempt, set_attempt] = useState(0)         // subirlo fuerza una nueva consulta

  // Sin sesión no hay nada que mostrar; si vence mientras tanto, vuelve al login
  useEffect(() => {
    if (!read_session()) {
      navigate('/login', { replace: true })
      return
    }
    const unauthorized = () => navigate('/login', { replace: true })
    window.addEventListener('futbot:unauthorized', unauthorized)
    return () => window.removeEventListener('futbot:unauthorized', unauthorized)
  }, [navigate])

  // Consulta el listado al entrar y cada vez que se pide actualizar
  useEffect(() => {
    if (!read_session()) return
    const controller = new AbortController()
    list_public_friendly_rooms({ signal: controller.signal })
      .then((loaded) => {
        if (controller.signal.aborted) return
        set_rooms(loaded)
        set_error('')
        set_status('ready')
      })
      .catch((cause) => {
        if (controller.signal.aborted || cause.name === 'AbortError') return
        if (cause.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        set_error(cause.status ? cause.message : 'No se pudo conectar con el servidor.')
        set_status('error')
      })
    return () => controller.abort()
  }, [attempt, navigate])

  function reload() {
    set_status('loading')
    set_attempt((current) => current + 1)
  }

  // Si la sala ya no está disponible, lo informa el endpoint de unión (pantalla siguiente)
  function join(room) {
    navigate('/friendly/join', { state: { room_id: room.id, home_club_name: room.home_club_name } })
  }

  return (
    <div className="home-page">
      <main className="home-content" aria-busy={status === 'loading'}>
        <section className="home-welcome" aria-labelledby="friendly-title">
          <h1 id="friendly-title">Amistosos disponibles</h1>
          <p>Elegí una sala en espera de rival y unite con tu equipo.</p>
          <div className="friendly-row">
            <button className="home-action" onClick={() => navigate('/home')}>Volver</button>
            <button className="home-action" onClick={reload} disabled={status === 'loading'}>Actualizar</button>
          </div>
        </section>

        {status === 'loading' && (
          <div className="home-notice friendly-loading" role="status">
            <Spinner />
            Cargando amistosos…
          </div>
        )}

        {status === 'error' && <>
          <p className="home-notice home-error" role="alert">{error}</p>
          <button className="home-action" onClick={reload}>Reintentar</button>
        </>}

        {status === 'ready' && rooms.length === 0 && (
          <p className="home-notice" role="status">No hay amistosos disponibles.</p>
        )}

        {status === 'ready' && rooms.length > 0 && (
          <ul className="friendly-list">
            {rooms.map((room) => {
              const club = room.home_club_name || 'Club sin nombre'
              return (
                <li key={room.id} className="friendly-item">
                  <h2>{club}</h2>
                  <p className="friendly-meta">
                    <span className="friendly-chip">{STATUS_LABELS[room.status] ?? room.status}</span>
                    <span>
                      Creada{' '}
                      {room.created_at
                        ? <time dateTime={room.created_at.toISOString()}>{date_format.format(room.created_at)}</time>
                        : '—'}
                    </span>
                  </p>
                  <button
                    className="home-action"
                    aria-label={`Unirse a la sala de ${club}`}
                    onClick={() => join(room)}
                  >
                    Unirse
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}