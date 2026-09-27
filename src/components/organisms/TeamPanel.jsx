import Chip from '../atoms/Chip'
import Icon from '../atoms/Icon'
import Panel from '../atoms/Panel'
import PlayerRow from '../molecules/PlayerRow'
import './organisms.css'

const SIDE_LABELS = { home: 'Local', away: 'Visitante' }

// club is null while the away seat is still empty.
function TeamPanel({ club, side }) {
  return (
    <Panel className="fb-team-panel" aria-label={club ? club.club_name : SIDE_LABELS[side]}>
      <header className="fb-team-panel__header">
        <span className={`fb-team-panel__color fb-team-panel__color--${side}`} />
        <div className="fb-team-panel__title">
          <h2 className="fb-heading fb-team-panel__name">
            {club ? club.club_name : 'Esperando rival'}
          </h2>
          <span className="fb-label">{SIDE_LABELS[side]}</span>
        </div>
        {club ? (
          <Chip variant="ok">
            <Icon name="check" size={12} />
            Listo
          </Chip>
        ) : (
          <Chip variant="warning">Pendiente</Chip>
        )}
      </header>

      {club ? (
        <ol className="fb-team-panel__players">
          {club.players.map((player, index) => (
            <PlayerRow
              key={player.player_id}
              number={index + 1}
              player={player}
              side={side}
            />
          ))}
        </ol>
      ) : (
        <p className="fb-team-panel__empty">
          Compartí el código de la sala para que otro club se una.
        </p>
      )}
    </Panel>
  )
}

export default TeamPanel
