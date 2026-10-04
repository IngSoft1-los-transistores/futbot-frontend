import React, { useState , useEffect } from "react"
import { createFriendlyRoom , getMyPlayers , getMyBehaviors } from "../api/friendly"
import SquadSelector from './SquadSelector'
import './CreateFriendlyModal.css'

export default function CreateFriendlyModal({ isOpen, onClose }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [players, setPlayers] = useState([])
    const [behaviors, setBehaviors] = useState([])

    const [squad, setSquad] = useState({
        starters: Array(3).fill({ playerId: '', behaviorId: '' }),
        substitutes: Array(3).fill({ playerId: '', behaviorId: '' }),
    })

    const [createdRoom, setCreatedRoom] = useState(null)

    useEffect(() => {
        if (isOpen) {
            setError(null)
            setCreatedRoom(null)
            Promise.all([getMyPlayers(), getMyBehaviors()])
                .then(([playersData, behaviorsData]) => {
                    setPlayers(playersData)
                    setBehaviors(behaviorsData)
                })
                .catch(() => setError('Error al cargar la pantalla de jugadores y estrategias.'))
        }
    }, [isOpen])

    if (!isOpen) return null

    const isSquadComplete = () => {
        const isSlotValid = (slot) => slot.playerId !== '' && slot.behaviorId !== ''
        return squad.starters.every(isSlotValid) && squad.substitutes.every(isSlotValid)
    }

    const handleCreateFriendly = async () => {
        setError(null)
        setLoading(true)

        const payload = {
            starters: squad.starters.map((s) => ({
                player_id: String(s.playerId),
                behavior_id: String(s.behaviorId),
            })),
            substitutes: squad.substitutes.map((s) => ({
                player_id: String(s.playerId),
                behavior_id: String(s.behaviorId),
            })),
        }

        try {
            const roomData = await createFriendlyRoom(payload)
            setCreatedRoom(roomData)
        } catch (err) {
            let errorMsg = 'No fue posible crear amistoso.'
            const detailObj = err.detail || err.message
            if (Array.isArray(detailObj)) {
                errorMsg = detailObj
                    .map((e) => `Campo '${e.loc ? e.loc.join('.') : 'campo'}': ${e.msg}`)
                    .join(' | ')
            }else if (typeof detailObj === 'string') {
                errorMsg = detailObj
            }
            setError(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Partido Amistoso</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="modal-alert modal-alert-danger">{error}</div>}

        {createdRoom ? (
          <div className="modal-success-box">
            <h3>¡Amistoso Creado Exitosamente!</h3>
            <p>Comparte la siguiente información con tu rival:</p>
            <div className="room-info">
              <div><strong>Código de Sala:</strong> <span className="room-code">{createdRoom.roomCode || createdRoom.room_code}</span></div>
              <div><small>ID: {createdRoom.roomId || createdRoom.room_id}</small></div>
            </div>
            <div className="status-badge">Estado: Esperando a un rival (waitingGuest)</div>
            <button className="home-action" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <div className="modal-body">
            <SquadSelector
              players={players}
              behaviors={behaviors}
              squad={squad}
              setSquad={setSquad}
            />
            <div className="modal-actions">
              <button
                className="home-action"
                disabled={!isSquadComplete() || loading}
                onClick={handleCreateFriendly}
              >
                {loading ? 'Creando...' : 'Confirmar y Crear Sala'}
              </button>
              <button className="home-action secondary" disabled={loading} onClick={onClose}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}