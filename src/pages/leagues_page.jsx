import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { list_leagues } from '../api/client'
import { read_session } from '../auth/session'
import './Home.css'
import './leagues_page.css'

function participants_label(count) {
  return `${count} ${count === 1 ? 'participante' : 'participantes'}`
}

function league_word(count) {
  return count === 1 ? 'liga' : 'ligas'
}

export default function LeaguesPage() {
  const navigate = useNavigate()
  const [leagues, set_leagues] = useState([])
  const [status, set_status] = useState('loading')   // loading | ready | error
  const [error, set_error] = useState('')
  const [search_text, set_search_text] = useState('') // lo que escribe el usuario
  const [query, set_query] = useState('')             // el filtro que ya se aplicó
  const [attempt, set_attempt] = useState(0)          // subirlo fuerza una nueva consulta
  const [selected, set_selected] = useState(null)     // liga elegida para unirse

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

  // Consulta el listado al entrar y cada vez que cambia la búsqueda
  useEffect(() => {
    if (!read_session()) return
    const controller = new AbortController()
    list_leagues({ name: query, signal: controller.signal })
      .then((loaded) => {
        if (controller.signal.aborted) return
        set_leagues(loaded)
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
    return () => controller.abort()    // una búsqueda nueva descarta la respuesta de la anterior
  }, [query, attempt, navigate])

  function reload() {
    set_status('loading')
    set_attempt((current) => current + 1)
  }

  function search(event) {
    event.preventDefault()
    set_query(search_text.trim())
    reload()
  }

  function clear_search() {
    set_search_text('')
    set_query('')
    reload()
  }

  return (
    <div className="home-page">
      <main className="home-content" aria-busy={status === 'loading'}>
        <section className="home-welcome" aria-labelledby="leagues-title">
          <h1 id="leagues-title">Ligas disponibles</h1>
          <p>Buscá una liga por nombre y seleccioná aquella en la que querés participar.</p>
          <div className="leagues-row">
            <button className="home-action" onClick={() => navigate('/home')}>Volver</button>
          </div>
        </section>

        <form className="leagues-search" role="search" onSubmit={search}>
          <div>
            <label htmlFor="leagues-name">Buscar por nombre</label>
            <input
              id="leagues-name"
              type="search"
              value={search_text}
              onChange={(event) => set_search_text(event.target.value)}
              placeholder="Nombre de la liga"
              maxLength={80}
              autoComplete="off"
            />
          </div>
          <button type="submit" className="home-action">Buscar</button>
          {(search_text || query) && (
            <button type="button" className="home-action" onClick={clear_search}>Limpiar</button>
          )}
        </form>

        {selected && (
          <section className="leagues-selection" aria-labelledby="leagues-selected-title">
            <h2 id="leagues-selected-title">Liga seleccionada: {selected.name}</h2>
            <p>{participants_label(selected.participants_count)} · {selected.started ? 'Iniciada' : 'Sin iniciar'}</p>
            {/* TICKET "UNIRSE A LIGA": el botón para continuar va acá, usando `selected` */}
            <button className="home-action" onClick={() => set_selected(null)}>Quitar selección</button>
          </section>
        )}

        {status === 'loading' && <div className="home-notice" role="status">Cargando ligas…</div>}

        {status === 'error' && <>
          <p className="home-notice home-error" role="alert">{error}</p>
          <button className="home-action" onClick={reload}>Reintentar</button>
        </>}

        {status === 'ready' && leagues.length === 0 && (
          <p className="home-notice" role="status">
            {query
              ? `No hay ligas que coincidan con "${query}".`
              : 'Todavía no hay ligas disponibles.'}
          </p>
        )}

        {status === 'ready' && leagues.length > 0 && <>
          <p className="leagues-count" role="status">
            {leagues.length} {league_word(leagues.length)}{query ? ` para "${query}"` : ''}
          </p>
          <ul className="leagues-list">
            {leagues.map((league) => {
              const is_selected = selected?.id === league.id
              return (
                <li key={league.id} className={`leagues-item${is_selected ? ' leagues-item--selected' : ''}`}>
                  <h2>{league.name}</h2>
                  <p className="leagues-meta">
                    <span>{participants_label(league.participants_count)}</span>
                    <span className={`leagues-chip ${league.started ? 'leagues-chip--started' : 'leagues-chip--open'}`}>
                      {league.started ? 'Iniciada' : 'Sin iniciar'}
                    </span>
                  </p>
                  <button
                    className="home-action"
                    aria-pressed={is_selected}
                    onClick={() => set_selected(is_selected ? null : league)}
                  >
                    {is_selected ? 'Seleccionada' : 'Seleccionar'}
                  </button>
                </li>
              )
            })}
          </ul>
        </>}
      </main>
    </div>
  )
}