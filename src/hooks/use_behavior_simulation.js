import {useEffect, useState} from 'react'
import {connect_to_simulation_ticket} from '../api/behaviors.js'

export const useBehaviorSimulation = (ticketId) => {
  const [simulationData, setSimulationData] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('connecting') // 'connecting', 'online', 'offline'
  const [error, setError] = useState(null)
  
  useEffect(() => {
    // Si no hay ticketId no se conecta
    if (!ticketId) {
      setConnectionStatus('offline')
      return 
    }
    // uso active para evitar actualizar el estado si el componente se desmonta antes de recibir datos
    let active = true
    setConnectionStatus('connecting')
    setSimulationData(null)
    setError(null)
    const socket = connect_to_simulation_ticket(ticketId)
    socket.onopen = () => {
      if (active) setConnectionStatus('online')
    }
    // Escucha los mensajes
    socket.onmessage = (event) => {
      try {
        if (!active) return
        const data = JSON.parse(event.data)
        console.log('Mensaje recibido del WebSocket:', data)
        //
        if (data.type === 'tick') {
          // Guarda los datos de la simulación en el estado
          setSimulationData(data)
          return
        }
        if (data.type === 'error') {
          setError(data.message || 'Error desconocido en la simulación')
          return
        }
      }
      catch (error) {
        console.error('Error parsing simulation data:', error)
        setError(error)
      }
    }
    socket.onerror = (event) => {
      console.error('WebSocket error:', event)
      if (active) setConnectionStatus('offline')
    }
    // al cerrar la conexión, cambia el estado a offline
    socket.onclose = () => {
      if (active) setConnectionStatus('offline')
    }
    return () => {
      active = false
      socket.close() // cierra la conexión al desmontar el componente o cambiar de ticketId
    }
  }, [ticketId])
  return {simulationData, connectionStatus, error}
}
