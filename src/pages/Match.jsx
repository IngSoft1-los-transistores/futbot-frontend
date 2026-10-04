import { Link, useParams } from 'react-router-dom'
import useMatchState from '../hooks/use_match_state'
import MatchPitch from '../components/match_pitch'
import './Match.css'

const statuses = { in_progress: 'En juego', paused: 'En pausa', finished: 'Finalizado' }
const actions = {
  movement: 'Movimiento', pass: 'Pase', shot: 'Remate', goal: 'Gol',
  substitution: 'Sustitución', behavior_changed: 'Cambio de comportamiento',
  pause: 'Pausa', resume: 'Reanudación',
}
const time = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const position = (point) => point ? `(${point.x}, ${point.y})` : 'Sin posición'

function MatchView({ match_id }) {
  const { state, error, loading } = useMatchState(match_id)
  return (
    <div className="match-page">
      <header className="match-header">
        <Link to="/home" className="match-brand" aria-label="FutBot · Volver al menú">
          <span className="match-brand-mark" aria-hidden="true">⚽</span>
          <span><span className="match-brand-name">FutBot</span><span className="match-brand-project">laboratorio / presión alta v4</span></span>
        </Link>
        <span className="match-connection"><i aria-hidden="true" />{error ? 'Sin sincronizar' : loading ? 'Conectando…' : 'Estado recibido'}</span>
      </header>
      <main className="match-arena">
      <h1 className="match-sr-only">Estado del partido</h1>
      {loading && <p role="status">Cargando partido…</p>}
      {error && <div className="match-warning" role="alert">{error}{state && <p>Se muestra el último estado recibido; puede estar desactualizado.</p>}</div>}
      {state && <>
        <section className="match-scoreboard" aria-label="Marcador" aria-live="polite">
          <div className="match-score">
            <h2><i className="match-team-color match-team-color--home" aria-hidden="true" />{state.home_club.name}</h2>
            <strong aria-label={`Marcador: ${state.score.home} a ${state.score.away}`}>{state.score.home}<span>–</span>{state.score.away}</strong>
            <h2><i className="match-team-color match-team-color--away" aria-hidden="true" />{state.away_club.name}</h2>
          </div>
          <div className="match-clock"><span className={`match-status match-status--${state.status}`}>{statuses[state.status]}</span><time aria-label="Tiempo transcurrido">{time(state.current_time)}</time></div>
          <span className="match-format">Partido amistoso</span>
        </section>
        <MatchPitch state={state} />
        <div className="match-pitch-footer"><Link to="/home">← Volver al menú</Link><span>Restante: <time>{time(state.remaining_time)}</time></span></div>
        <details className="match-details">
          <summary>Jugadores y acciones del partido</summary>
        <div className="match-teams">
          {[state.home_club, state.away_club].map((club) => <section className="match-panel" key={club.club_id}>
            <h2>{club.name}</h2>
            <ul className="match-players">{state.players.filter((player) => player.club_id === club.club_id).map((player) => <li key={player.player_id}>
              <strong>{player.name}</strong><span>{player.on_field ? 'En cancha' : 'Fuera de cancha'}{player.has_ball ? ' · Con pelota' : ''}</span>
              <span>Posición: {position(player.position)}</span>
              <small>Comportamiento: {player.behavior_id}</small>
            </li>)}</ul>
          </section>)}
        </div>
        <section className="match-panel">
          <h2>Pelota</h2><p>Posición: {position(state.ball)} · {state.ball.owner_player_id ? `Posesión: ${state.players.find((player) => player.player_id === state.ball.owner_player_id)?.name ?? 'Jugador'}` : 'Pelota libre'}</p>
        </section>
        <section className="match-panel">
          <h2>Acciones del último estado recibido</h2>
          {state.actions.length === 0 ? <p>Sin acciones en esta actualización.</p> : <ul className="match-actions">{state.actions.map((action, index) => {
            const player = state.players.find((item) => item.player_id === action.player_id)
            const club = [state.home_club, state.away_club].find((item) => item.club_id === action.club_id)
            return <li key={`${state.revision}-${index}`}><strong>{actions[action.type] ?? action.type}</strong>{player && ` · ${player.name}`}{club && ` · ${club.name}`}{action.destination && ` → ${position(action.destination)}`}</li>
          })}</ul>}
        </section>
        </details>
      </>}
      </main>
    </div>
  )
}

export default function Match() {
  const { match_id } = useParams()
  return <MatchView key={match_id} match_id={match_id.toLowerCase()} />
}
