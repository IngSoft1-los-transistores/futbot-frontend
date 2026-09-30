import { useNavigate, useParams } from 'react-router-dom'
import { ROOM_STATUS } from '../api/friendlyRooms'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import Spinner from '../components/atoms/Spinner'
import Alert from '../components/molecules/Alert'
import RoomHeader from '../components/organisms/RoomHeader'
import TeamPanel from '../components/organisms/TeamPanel'
import { useFriendlyRoom } from '../hooks/useFriendlyRoom'
import './FriendlyRoomPage.css'

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

function errorMessage(error, fallback) {
  if (!error?.status) return 'No se pudo contactar al servidor.'
  return ERROR_MESSAGES[error.errorCode] ?? fallback
}

function FriendlyRoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { room, loadError, isStarting, startError, start } = useFriendlyRoom(roomId)

  if (loadError) {
    return (
      <main className="fb-room-page">
        <Alert>{errorMessage(loadError, 'No se pudo cargar la sala.')}</Alert>
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

  const isFull = Boolean(room.home_club && room.away_club)
  const isReady = room.status === ROOM_STATUS.READY_TO_START

  async function handleStart() {
    const result = await start()
    if (result) navigate(`/partidos/${result.match_id}`)
  }

  let action
  if (room.match_id) {
    action = (
      <Button onClick={() => navigate(`/partidos/${room.match_id}`)}>
        <Icon name="play" />
        Ir al partido
      </Button>
    )
  } else {
    let label = 'Iniciar partido'
    if (isStarting) label = 'Iniciando…'
    else if (!isFull) label = 'Esperando rival'
    else if (!isReady) label = 'Sala no disponible'

    action = (
      <Button
        onClick={handleStart}
        disabled={!isFull || !isReady}
        isLoading={isStarting}
      >
        {!isStarting && <Icon name="play" />}
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
        roomCode={room.room_code}
        actions={action}
      />

      {startError && (
        <Alert>{errorMessage(startError, 'No se pudo iniciar el partido.')}</Alert>
      )}

      <div className="fb-room-page__teams">
        <TeamPanel club={room.home_club} side="home" />
        <span className="fb-room-page__versus" aria-hidden="true">
          VS
        </span>
        <TeamPanel club={room.away_club} side="away" />
      </div>

      <Alert variant="info">
        Una vez iniciado, el partido se juega completo: sin pausas, sin
        sustituciones y sin cambios de comportamiento.
      </Alert>
    </main>
  )
}

export default FriendlyRoomPage
