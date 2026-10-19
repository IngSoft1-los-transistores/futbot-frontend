import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { list_behaviors, list_players } from '../api/client'
import {
  free_spots,
  get_league,
  is_league_full,
  join_league,
  LEAGUE_STATUS_LABELS,
  OPEN_LEAGUE_STATUSES,
} from '../api/leagues'
import { read_session } from '../auth/session'
import Modal from '../components/modal'
import PlayerRow from '../components/molecules/player_row'
import SquadSelector from '../components/SquadSelector'
import { empty_squad, is_squad_complete, squad_entries } from '../components/squad'
import './Home.css'
import './join_friendly.css'
import './join_league_page.css'

const ERROR_MESSAGES = {
  LEAGUE_NOT_FOUND: 'La liga no existe o el ID no es válido.',
  LEAGUE_NOT_OPEN: 'La liga ya no admite inscripciones.',
  LEAGUE_FULL: 'La liga está completa: ya no es posible unirse.',
  ALREADY_IN_LEAGUE: 'Tu club ya está inscripto en esta liga.',
  LEAGUE_LIMIT_REACHED: 'Ya participás en la cantidad máxima de ligas activas.',
  WRONG_LEAGUE_PASSWORD: 'Esta liga es privada: para unirte necesitás su contraseña.',
  INVALID_SQUAD_PLAYERS:
    'Algún jugador elegido ya no está disponible. Volvé a armar tu escuadra.',
  INVALID_SQUAD_BEHAVIORS:
    'Algún comportamiento elegido ya no está disponible. Volvé a armar tu escuadra.',
}

const SQUAD_ERRORS = ['INVALID_SQUAD_PLAYERS', 'INVALID_SQUAD_BEHAVIORS']

function error_message(error, fallback) {
  if (!error?.status) return 'No se pudo contactar al servidor.'
  return ERROR_MESSAGES[error.error_code] ?? fallback
}

// Uses the /join error codes, so the page and the join notice share one message.
function join_block(league) {
  if (league.isEnrolled) return 'ENROLLED'
  if (!OPEN_LEAGUE_STATUSES.includes(league.status)) return 'LEAGUE_NOT_OPEN'
  if (is_league_full(league)) return 'LEAGUE_FULL'
  if (league.isPrivate) return 'WRONG_LEAGUE_PASSWORD'
  return null
}

function join_notice(error) {
  const code = error?.status ? error.error_code : null

  if (SQUAD_ERRORS.includes(code)) {
    return { kind: 'squad', title: 'Escuadra no válida', message: ERROR_MESSAGES[code] }
  }
  if (code && Object.hasOwn(ERROR_MESSAGES, code)) {
    return {
      kind: 'closed',
      code,
      title: code === 'LEAGUE_FULL' ? 'Liga completa' : 'No es posible unirse',
      message: ERROR_MESSAGES[code],
    }
  }
  return {
    kind: 'retry',
    title: 'No se pudo unir a la liga',
    message: error_message(error, 'No se pudo completar la inscripción. Intentá nuevamente.'),
  }
}

function LeagueFacts({ league }) {
  return (
    <section className="join-panel" aria-labelledby="league-name">
      <h2 id="league-name">{league.name}</h2>
      <dl className="join-league-facts">
        <div>
          <dt>Tipo</dt>
          <dd>{league.isPrivate ? 'Privada' : 'Pública'}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{LEAGUE_STATUS_LABELS[league.status] ?? league.status}</dd>
        </div>
        <div>
          <dt>Lugares libres</dt>
          <dd>{free_spots(league)} de {league.maxClubs}</dd>
        </div>
        <div>
          <dt>Mínimo para empezar</dt>
          <dd>{league.minClubs} clubes</dd>
        </div>
        <div>
          <dt>Duración de cada partido</dt>
          <dd>{league.matchDurationMinutes} minutos</dd>
        </div>
      </dl>
    </section>
  )
}

function ConfirmedSquad({ squad }) {
  return (
    <section className="join-panel" aria-labelledby="league-squad-title">
      <h2 id="league-squad-title">Tu escuadra</h2>
      <p role="status">
        Ya estás inscripto en esta liga. Tu escuadra quedó confirmada y no puede
        modificarse.
      </p>
      {squad?.length > 0 && (
        <ol className="join-list">
          {squad.map((player, index) => (
            <PlayerRow
              key={player.playerId}
              number={index + 1}
              player={player}
              side="home"
            />
          ))}
        </ol>
      )}
    </section>
  )
}

export default function JoinLeaguePage() {
  const navigate = useNavigate()
  const { league_id } = useParams()

  const [league, set_league] = useState(null)
  const [players, set_players] = useState([])
  const [behaviors, set_behaviors] = useState([])
  const [squad, set_squad] = useState(empty_squad)
  const [load_status, set_load_status] = useState('loading')
  const [load_error, set_load_error] = useState(null)
  const [attempt, set_attempt] = useState(0)
  const [submitting, set_submitting] = useState(false)
  const [notice, set_notice] = useState(null)
  const [closed_reason, set_closed_reason] = useState(null)

  useEffect(() => {
    if (!read_session()) {
      navigate('/login', { replace: true })
      return
    }

    const unauthorized = () => navigate('/login', { replace: true })
    window.addEventListener('futbot:unauthorized', unauthorized)
    return () => window.removeEventListener('futbot:unauthorized', unauthorized)
  }, [navigate])

  useEffect(() => {
    if (!read_session()) return

    const controller = new AbortController()
    const { signal } = controller

    Promise.all([
      get_league(league_id, { signal }),
      list_players({ signal }),
      list_behaviors({ signal }),
    ])
      .then(([loaded_league, loaded_players, loaded_behaviors]) => {
        if (signal.aborted) return
        set_league(loaded_league)
        set_players(loaded_players)
        set_behaviors(loaded_behaviors)
        set_load_status('ready')
      })
      .catch((cause) => {
        if (signal.aborted || cause.name === 'AbortError' || cause.status === 401) return
        set_load_error(cause)
        set_load_status('error')
      })

    return () => controller.abort()
  }, [league_id, attempt])

  const go_home = () => navigate('/home')

  function reload() {
    set_load_error(null)
    set_load_status('loading')
    set_attempt((current) => current + 1)
  }

  function retry_selection() {
    set_notice(null)
    set_squad(empty_squad())
    reload()
  }

  const is_complete = is_squad_complete(squad)

  async function confirm() {
    if (!is_complete || submitting) return

    set_submitting(true)

    try {
      await join_league(league_id, squad)
      set_league((current) => ({
        ...current,
        enrolledClubs: current.enrolledClubs + 1,
        isEnrolled: true,
        mySquad: squad_entries(squad, players, behaviors),
      }))
      set_notice({
        kind: 'success',
        title: '¡Te uniste a la liga!',
        message: `Tu club quedó inscripto en ${league.name}. Tu escuadra quedó confirmada y ya no puede modificarse.`,
      })
    } catch (cause) {
      if (cause.name === 'AbortError' || cause.status === 401) return
      const next_notice = join_notice(cause)
      if (next_notice.kind === 'closed') set_closed_reason(next_notice.code)
      set_notice(next_notice)
    } finally {
      set_submitting(false)
    }
  }

  const block = league ? (join_block(league) ?? closed_reason) : null

  return (
    <div className="home-page">
      <main className="home-content" aria-busy={load_status === 'loading'}>
        <section className="home-welcome" aria-labelledby="join-league-title">
          <h1 id="join-league-title">Unirse a liga</h1>
          <p>Revisá los datos de la liga, armá tu escuadra y confirmá la inscripción.</p>
          <div className="join-row">
            <button className="home-action" onClick={go_home}>
              Volver
            </button>
          </div>
        </section>

        {load_status === 'loading' && (
          <div className="home-notice" role="status">
            Cargando la liga…
          </div>
        )}

        {load_status === 'error' && (
          <>
            <p className="home-notice home-error" role="alert">
              {error_message(load_error, 'No se pudo cargar la liga.')}
            </p>
            {load_error?.error_code === 'LEAGUE_NOT_FOUND' ? (
              <button className="home-action" onClick={go_home}>
                Volver al menú
              </button>
            ) : (
              <button className="home-action" onClick={reload}>
                Reintentar
              </button>
            )}
          </>
        )}

        {load_status === 'ready' && (
          <>
            <LeagueFacts league={league} />

            {block === 'ENROLLED' && (
              <>
                <ConfirmedSquad squad={league.mySquad} />
                <button className="home-action" onClick={go_home}>
                  Volver al menú
                </button>
              </>
            )}

            {block && block !== 'ENROLLED' && (
              <>
                <p className="home-notice" role="alert">
                  {ERROR_MESSAGES[block]}
                </p>
                <button className="home-action" onClick={go_home}>
                  Volver al menú
                </button>
              </>
            )}

            {!block && (
              <>
                {players.length < 6 && (
                  <p className="home-notice" role="status">
                    Tenés {players.length} jugadores. Necesitás al menos 6 jugadores
                    distintos para completar titulares y suplentes.
                  </p>
                )}

                {behaviors.length === 0 && (
                  <p className="home-notice" role="status">
                    No hay comportamientos disponibles. Sin al menos uno no vas a
                    poder confirmar.
                  </p>
                )}

                <section className="join-panel" aria-labelledby="league-team-title">
                  <h2 id="league-team-title">Elegí tu escuadra</h2>
                  <p>
                    Seleccioná 3 titulares y 3 suplentes y asignale un comportamiento
                    a cada uno. Un jugador no puede ocupar dos puestos.
                  </p>

                  <fieldset className="join-league-squad" disabled={submitting}>
                    <SquadSelector
                      players={players}
                      behaviors={behaviors}
                      squad={squad}
                      setSquad={set_squad}
                    />
                  </fieldset>
                </section>

                <div className="join-row">
                  <button
                    className="home-action"
                    onClick={confirm}
                    disabled={!is_complete || submitting}
                    aria-busy={submitting || undefined}
                  >
                    {submitting ? 'Inscribiendo…' : 'Confirmar inscripción'}
                  </button>

                  {!is_complete && (
                    <p className="join-hint">
                      Completá los seis puestos con jugadores distintos y asignales un
                      comportamiento.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {notice && (
        <Modal title={notice.title} onClose={() => set_notice(null)}>
          <p>{notice.message}</p>
          <div className="join-actions">
            {notice.kind === 'squad' && (
              <button className="home-action" onClick={retry_selection}>
                Volver a seleccionar
              </button>
            )}
            {notice.kind !== 'squad' && (
              <button className="home-action" onClick={() => set_notice(null)}>
                {notice.kind === 'success' ? 'Aceptar' : 'Cerrar'}
              </button>
            )}
            {(notice.kind === 'success' || notice.kind === 'closed') && (
              <button className="home-action" onClick={go_home}>
                Volver al menú
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
