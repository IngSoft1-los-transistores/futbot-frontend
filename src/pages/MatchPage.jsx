import { useParams } from 'react-router-dom'
import RoomHeader from '../components/organisms/RoomHeader'
import './FriendlyRoomPage.css'

// Placeholder until the live match view exists.
function MatchPage() {
  const { matchId } = useParams()

  return (
    <main className="fb-room-page">
      <RoomHeader
        title="Partido en curso"
        status={{ label: 'En juego', variant: 'ok' }}
        description={`La transmisión en vivo del partido ${matchId} estará disponible próximamente.`}
      />
    </main>
  )
}

export default MatchPage
