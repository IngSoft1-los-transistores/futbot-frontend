
// src/pages/Amistosos.jsx
import React, { useState, useEffect } from 'react';
import { createFriendlyRoom, getMyPlayers, getMyBehaviors } from '../api/friendly';
import SquadSelector from '../components/SquadSelector';

// Función para obtener el token sin depender de useAuth
const getToken = () => {
  return localStorage.getItem('token') || 'fake_token';
};

export default function Amistosos() {
  const token = getToken();

  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Datos del usuario cargados del backend
  const [players, setPlayers] = useState([]);
  const [behaviors, setBehaviors] = useState([]);

  // Estado del equipo (3 titulares + 3 suplentes)
  const [squad, setSquad] = useState({
    starters: Array(3).fill({ playerId: '', behaviorId: '' }),
    substitutes: Array(3).fill({ playerId: '', behaviorId: '' }),
  });

  // Estado de la sala creada al recibir 201 Created
  const [createdRoom, setCreatedRoom] = useState(null);

  // Carga de recursos disponibles usando el token local
  useEffect(() => {
    if (token) {
      Promise.all([getMyPlayers(token), getMyBehaviors(token)])
        .then(([playersData, behaviorsData]) => {
          setPlayers(playersData);
          setBehaviors(behaviorsData);
        })
        .catch(() => setError('Error al cargar tus datos de plantilla.'));
    }
  }, [token]);

  // Valida que los 6 slots tengan jugador y comportamiento asignados
  const isSquadComplete = () => {
    const isSlotValid = (slot) => slot.playerId !== '' && slot.behaviorId !== '';
    return squad.starters.every(isSlotValid) && squad.substitutes.every(isSlotValid);
  };

  const handleCreateFriendly = async () => {
    setError(null);
    setLoading(true);

    const payload = {
      starters: squad.starters.map((s) => ({ playerId: s.playerId, behaviorId: s.behaviorId })),
      substitutes: squad.substitutes.map((s) => ({ playerId: s.playerId, behaviorId: s.behaviorId })),
    };

    try {
      const roomData = await createFriendlyRoom(payload, token);
      setCreatedRoom(roomData);
      setShowConfig(false);
    } catch (err) {
      setError(err.message || 'No fue posible crear el amistoso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Partidos Amistosos</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* 1. Vista si la sala ya fue creada exitosamente */}
      {createdRoom ? (
        <div className="card border-success p-4 text-center shadow-sm">
          <h4 className="text-success mb-3">¡Amistoso Creado Exitosamente!</h4>
          <p className="mb-2">Comparte la siguiente información con tu rival:</p>
          
          <div className="bg-light p-3 rounded mb-3 border">
            <div><strong>Código de Sala:</strong> <span className="fs-4 text-primary">{createdRoom.roomCode}</span></div>
            <div><small className="text-muted">Room ID: {createdRoom.roomId}</small></div>
          </div>

          <div className="badge bg-warning text-dark p-2 mb-3 fs-6">
            Estado: Esperando a un rival (waitingGuest)
          </div>

          <div>
            <button
              className="btn btn-outline-primary"
              onClick={() => {
                setCreatedRoom(null);
                setShowConfig(false);
              }}
            >
              Crear otro amistoso
            </button>
          </div>
        </div>
      ) : (
        /* 2. Botón inicial / Formulario de Configuración */
        <div>
          {!showConfig ? (
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setShowConfig(true)}
            >
              Crear Amistoso
            </button>
          ) : (
            <div className="card p-4 shadow-sm">
              <h4 className="mb-3">Configurar Equipo para el Amistoso</h4>

              <SquadSelector
                players={players}
                behaviors={behaviors}
                squad={squad}
                setSquad={setSquad}
              />

              <div className="d-flex gap-2 mt-4">
                <button
                  className="btn btn-success"
                  disabled={!isSquadComplete() || loading}
                  onClick={handleCreateFriendly}
                >
                  {loading ? 'Creando...' : 'Confirmar y Crear Sala'}
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={loading}
                  onClick={() => setShowConfig(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}