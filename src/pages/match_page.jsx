import { useParams } from 'react-router-dom'
import RoomHeader from '../components/organisms/room_header'
import './friendly_room_page.css'

// Placeholder until the live match view exists.
export default function MatchPage() {
  const { match_id } = useParams()

  return (
    <main className="fb-room-page">
      <RoomHeader
        title="Partido en curso"
        status={{ label: 'En juego', variant: 'ok' }}
        description={`La transmisión en vivo del partido ${match_id} estará disponible próximamente.`}
      />
    </main>
  )
}
