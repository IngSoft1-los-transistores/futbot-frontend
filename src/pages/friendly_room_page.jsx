import { useNavigate, useParams } from 'react-router-dom'
import { ROOM_STATUS } from '../api/friendly_rooms'
import Button from '../components/atoms/button'
import Icon from '../components/atoms/icon'
import Spinner from '../components/atoms/spinner'
import Alert from '../components/molecules/alert'
import RoomHeader from '../components/organisms/room_header'
import TeamPanel from '../components/organisms/team_panel'
import { useFriendlyRoom } from '../hooks/use_friendly_room'
import './friendly_room_page.css'

const STATUS_CHIPS = {
  [ROOM_STATUS.WAITING_GUEST]: { label: 'Esperando rival', variant: 'warning' },
  [ROOM_STATUS.READY_TO_START]: { label: 'Lista para iniciar', variant: 'ok' },
  [ROOM_STATUS.IN_PROGRESS]: { label: 'Partido en curso', variant: 'ok' },
  [ROOM_STATUS.FINISHED]: { label: 'Finalizada', variant: 'default' },
  [ROOM_STATUS.CANCELLED]: { label: 'Cancelada', variant: 'default' },
}

const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Tu sesión no es válida o venció. Iniciá sesión nuevamente.',
  ROOM_NOT_FOUND: 'La sala no existe.',
  NOT_ROOM_MEMBER: 'Tu club no pertenece a esta sala.',
  ROOM_NOT_FULL: 'Falta que otro club se una a la sala.',
  ROOM_NOT_READY: 'La sala no está lista para iniciar el partido.',
  MATCH_ALREADY_STARTED: 'El partido ya fue iniciado.',
  INVALID_SQUAD:
    'Algún club no tiene sus 3 titulares y 3 suplentes con comportamientos válidos.',
}

function error_message(error, fallback) {
  if (!error?.status) return 'No se pudo contactar al servidor.'
  return ERROR_MESSAGES[error.error_code] ?? fallback
}

export default function FriendlyRoomPage() {
  const { room_id } = useParams()
  const navigate = useNavigate()
  const { room, load_error, is_starting, start_error, start } = useFriendlyRoom(room_id)

  if (load_error) {
    return (
      <main className="fb-room-page">
        <Alert>{error_message(load_error, 'No se pudo cargar la sala.')}</Alert>
      </main>
    )
  }

  if (!room) {
    return (
      <main className="fb-room-page fb-room-page--loading" aria-busy="true">
        <Spinner />
        Cargando sala…
      </main>
    )
  }

  const is_full = Boolean(room.homeClub && room.awayClub)
  const is_ready = room.status === ROOM_STATUS.READY_TO_START

  function open_match(match_id) {
    const behavior_names = Object.fromEntries(
      [room.homeClub, room.awayClub].flatMap((club) => club?.players ?? [])
        .filter((player) => player.behaviorId && player.behaviorName)
        .map((player) => [player.behaviorId, player.behaviorName]),
    )
    navigate(`/partidos/${match_id}`, { state: { behavior_names } })
  }

  async function handle_start() {
    const result = await start()
    if (result) open_match(result.matchId)
  }

  let action
  if (room.matchId) {
    action = (
      <Button onClick={() => open_match(room.matchId)}>
        <Icon name="play" />
        Ir al partido
      </Button>
    )
  } else {
    let label = 'Iniciar partido'
    if (is_starting) label = 'Iniciando…'
    else if (!is_full) label = 'Esperando rival'
    else if (!is_ready) label = 'Sala no disponible'

    action = (
      <Button
        onClick={handle_start}
        disabled={!is_full || !is_ready}
        isLoading={is_starting}
      >
        {!is_starting && <Icon name="play" />}
        <span key={label}>{label}</span>
      </Button>
    )
  }

  return (
    <main className="fb-room-page">
      <RoomHeader
        title="Amistoso"
        status={STATUS_CHIPS[room.status] ?? { label: room.status, variant: 'default' }}
        description="Cuando ambos clubes estén en la sala, cualquiera de los dos puede iniciar el partido."
        roomCode={room.roomCode}
        actions={action}
      />

      {start_error && (
        <Alert>{error_message(start_error, 'No se pudo iniciar el partido.')}</Alert>
      )}

      <div className="fb-room-page__teams">
        <TeamPanel club={room.homeClub} side="home" />
        <span className="fb-room-page__versus" aria-hidden="true">
          VS
        </span>
        <TeamPanel club={room.awayClub} side="away" />
      </div>

      <Alert variant="info">
        Una vez iniciado, el partido se juega completo: sin pausas, sin
        sustituciones y sin cambios de comportamiento.
      </Alert>
    </main>
  )
}
