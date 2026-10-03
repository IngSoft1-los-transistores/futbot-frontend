import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { join_friendly_room, list_behaviors, list_players } from '../api/client'
import { read_session } from '../auth/session'
import JoinFriendlyModal from '../components/join_friendly_modal'
import './Home.css'
import './join_friendly.css'

const STARTER_COUNT = 3
const SUBSTITUTE_COUNT = 3
const TOTAL_COUNT = STARTER_COUNT + SUBSTITUTE_COUNT
const GROUPS = [
  { key: 'starters', label: 'Titulares', singular: 'titular', count: STARTER_COUNT },
  { key: 'substitutes', label: 'Suplentes', singular: 'suplente', count: SUBSTITUTE_COUNT },
]
const EMPTY_SELECTION = { starters: [], substitutes: [] }

// Ventana emergente de aviso. Escape no la cierra: hay que elegir una de sus acciones.
function NoticeDialog({ notice, children }) {
  const dialog_ref = useRef(null)

  useEffect(() => {
    const dialog = dialog_ref.current
    if (notice && !dialog.open) dialog.showModal()
    if (!notice && dialog.open) dialog.close()
  }, [notice])

  return (
    <dialog ref={dialog_ref} className="join-notice" onCancel={(event) => event.preventDefault()}>
      {notice && <>
        <h2>{notice.title}</h2>
        <p role="alert">{notice.message}</p>
        <div className="join-actions">{children}</div>
      </>}
    </dialog>
  )
}

export default function JoinFriendly() {
  const navigate = useNavigate()
  const location = useLocation()

  // La sala llega desde el modal de Home. Si se recarga la página, el state se pierde.
  const [room, set_room] = useState(
    location.state?.room_id ? { room_id: location.state.room_id, code: location.state.code } : null
  )
  const has_room = Boolean(room)

  const [players, set_players] = useState([])
  const [behaviors, set_behaviors] = useState([])
  const [load_status, set_load_status] = useState('loading')
  const [load_error, set_load_error] = useState('')
  const [attempt, set_attempt] = useState(0)

  const [selection, set_selection] = useState(EMPTY_SELECTION)
  const [submitting, set_submitting] = useState(false)
  const [notice, set_notice] = useState(null)
  const [change_open, set_change_open] = useState(false)

  // Sin sesión o sin sala: no hay nada que hacer acá
  useEffect(() => {
    if (!read_session()) {
      navigate('/login', { replace: true })
      return
    }
    if (!has_room) {
      navigate('/home', { replace: true })
      return
    }
    const unauthorized = () => navigate('/login', { replace: true })
    window.addEventListener('futbot:unauthorized', unauthorized)
    return () => window.removeEventListener('futbot:unauthorized', unauthorized)
  }, [navigate, has_room])

  // Carga los jugadores y comportamientos del club
  useEffect(() => {
    if (!has_room) return
    const controller = new AbortController()
    set_load_status('loading')
    Promise.all([
      list_players({ signal: controller.signal }),
      list_behaviors({ signal: controller.signal }),
    ]).then(([loaded_players, loaded_behaviors]) => {
      if (controller.signal.aborted) return
      set_players(loaded_players)
      set_behaviors(loaded_behaviors)
      set_load_status('ready')
    }).catch((cause) => {
      if (controller.signal.aborted || cause.name === 'AbortError') return
      set_load_error(cause.status ? cause.message : 'No se pudo conectar con el servidor.')
      set_load_status('error')
    })
    return () => controller.abort()
  }, [attempt, has_room])

  if (!room) return null

  // --- Selección ---

  const selected_ids = new Set(GROUPS.flatMap((group) => selection[group.key].map((entry) => entry.player_id)))
  const available = players.filter((player) => !selected_ids.has(player.id))
  const total_selected = selected_ids.size
  const without_behavior = GROUPS.flatMap((group) => selection[group.key]).filter((entry) => !entry.behavior_id).length
  const is_complete = GROUPS.every((group) => selection[group.key].length === group.count) && without_behavior === 0

  function player_name(player_id) {
    return players.find((player) => player.id === player_id)?.name ?? player_id
  }

  function add_player(group, player_id) {
    set_selection((current) => {
      const target = GROUPS.find((item) => item.key === group)
      if (current[group].length >= target.count) return current           // grupo completo
      return { ...current, [group]: [...current[group], { player_id, behavior_id: '' }] }
    })
  }

  function remove_player(group, player_id) {
    set_selection((current) => ({
      ...current,
      [group]: current[group].filter((entry) => entry.player_id !== player_id),
    }))
  }

  function set_behavior(group, player_id, behavior_id) {
    set_selection((current) => ({
      ...current,
      [group]: current[group].map((entry) => (entry.player_id === player_id ? { ...entry, behavior_id } : entry)),
    }))
  }

  // --- Confirmar ---

  // AJUSTAR: el contrato usa 400 para "sala completa" y para "jugadores inválidos".
  // Se distinguen por el texto del mensaje; si el backend envía un error_code distinto
  // para cada caso, conviene usarlo (cause.error_code) en vez de estos patrones.
  function handle_join_error(cause) {
    if (cause.status === 404) {
      set_notice({ kind: 'invalid_room', title: 'La sala no existe', message: 'El ID o el código de la sala no son válidos. Podés ingresar otros.' })
    } else if (cause.status === 400 && /completa|iniciad/i.test(cause.message)) {
      set_notice({ kind: 'full', title: 'Sala completa', message: 'La sala ya está completa o el partido ya comenzó. No podés unirte.' })
    } else if (cause.status === 400 && /jugador|comportamiento/i.test(cause.message)) {
      set_notice({ kind: 'invalid_selection', title: 'Selección no válida', message: `${cause.message} Volvé a elegir tus jugadores.` })
    } else if (cause.status === 422) {
      set_notice({ kind: 'other', title: 'Datos no válidos', message: 'Los datos enviados no son válidos. Revisá la selección.' })
    } else {
      set_notice({ kind: 'other', title: 'No se pudo unir', message: cause.status ? cause.message : 'No se pudo conectar con el servidor. Intentá nuevamente.' })
    }
  }

  async function confirm() {
    if (!is_complete || submitting) return
    set_submitting(true)
    try {
      await join_friendly_room({
        room_id: room.room_id,
        code: room.code,
        starters: selection.starters,
        substitutes: selection.substitutes,
      })
      set_notice({ kind: 'success', title: '¡Te uniste al amistoso!', message: 'Te uniste correctamente. La sala está lista para iniciar el partido.' })
    } catch (cause) {
      if (cause.name !== 'AbortError') handle_join_error(cause)
    } finally {
      set_submitting(false)
    }
  }

  function retry_selection() {
    set_notice(null)
    set_selection(EMPTY_SELECTION)    // empieza la selección de nuevo
    set_attempt((current) => current + 1)    // y recarga los jugadores por si cambiaron
  }

  function enter_other_code() {
    set_notice(null)
    set_change_open(true)
  }

  function change_room({ room_id, code }) {
    set_room({ room_id, code })       // la selección se conserva
    set_change_open(false)
  }

  // --- Pantalla ---

  return (
    <div className="home-page">
      <main className="home-content">
        <section className="home-welcome" aria-labelledby="join-title">
          <h1 id="join-title">Unirse a amistoso</h1>
          <p>Sala: {room.room_id}</p>
          <div className="join-row">
            <button className="home-action" onClick={() => navigate('/home')}>Volver</button>
            <button className="home-action" onClick={() => set_change_open(true)}>Cambiar sala</button>
          </div>
        </section>

        {load_status === 'loading' && <div className="home-notice" role="status">Cargando tus jugadores…</div>}
        {load_status === 'error' && <>
          <p className="home-notice home-error" role="alert">{load_error}</p>
          <button className="home-action" onClick={() => set_attempt(attempt + 1)}>Reintentar</button>
        </>}

        {load_status === 'ready' && <>
          <div className="join-columns">
            <section className="join-panel" aria-labelledby="join-available">
              <h2 id="join-available">Tus jugadores ({available.length})</h2>
              {players.length < TOTAL_COUNT && (
                <p className="home-notice">Necesitás al menos {TOTAL_COUNT} jugadores creados para unirte a un amistoso.</p>
              )}
              <ul className="join-list">
                {available.map((player) => (
                  <li key={player.id} className="join-item">
                    <span>{player.name}</span>
                    <span className="join-item-actions">
                      {GROUPS.map((group) => (
                        <button
                          key={group.key}
                          className="home-action"
                          onClick={() => add_player(group.key, player.id)}
                          disabled={selection[group.key].length >= group.count}
                        >
                          {group.singular}
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="join-panel" aria-labelledby="join-selected">
              <h2 id="join-selected">Tu equipo ({total_selected}/{TOTAL_COUNT})</h2>
              {GROUPS.map((group) => (
                <div key={group.key}>
                  <h3>{group.label} ({selection[group.key].length}/{group.count})</h3>
                  <ul className="join-list">
                    {selection[group.key].map((entry) => (
                      <li key={entry.player_id} className="join-item">
                        <span>{player_name(entry.player_id)}</span>
                        <span className="join-item-actions">
                          <select
                            aria-label={`Comportamiento de ${player_name(entry.player_id)}`}
                            value={entry.behavior_id}
                            onChange={(event) => set_behavior(group.key, entry.player_id, event.target.value)}
                          >
                            <option value="">Elegí un comportamiento</option>
                            {behaviors.map((behavior) => (
                              <option key={behavior.id} value={behavior.id}>{behavior.name}</option>
                            ))}
                          </select>
                          <button className="home-action" onClick={() => remove_player(group.key, entry.player_id)}>Quitar</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </div>

          <div className="join-row">
            <button className="home-action" onClick={confirm} disabled={!is_complete || submitting}>
              {submitting ? 'Uniéndote…' : 'Confirmar'}
            </button>
            {!is_complete && (
              <p className="join-hint" role="status">
                {total_selected < TOTAL_COUNT
                  ? `Faltan ${TOTAL_COUNT - total_selected} jugador(es) por elegir.`
                  : `Asigná un comportamiento a ${without_behavior} jugador(es).`}
              </p>
            )}
          </div>
        </>}
      </main>

      <NoticeDialog notice={notice}>
        {notice?.kind === 'invalid_room' && <button className="home-action" onClick={enter_other_code}>Ingresar otro código</button>}
        {notice?.kind === 'invalid_selection' && <button className="home-action" onClick={retry_selection}>Volver a seleccionar</button>}
        {notice?.kind === 'other' && <button className="home-action" onClick={() => set_notice(null)}>Cerrar</button>}
        {['success', 'full', 'invalid_room'].includes(notice?.kind) && (
          <button className="home-action" onClick={() => navigate('/home')}>Volver al menú</button>
        )}
      </NoticeDialog>

      <JoinFriendlyModal open={change_open} on_close={() => set_change_open(false)} on_submit={change_room} />
    </div>
  )
}