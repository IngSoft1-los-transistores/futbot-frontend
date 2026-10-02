import { useCallback, useEffect, useState } from 'react'
import { getFriendlyRoom, startFriendlyMatch } from '../api/friendlyRooms'

// Loads the room once on mount; live updates belong to the room WebSocket.
export function useFriendlyRoom(roomId) {
  const [room, setRoom] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState(null)

  useEffect(() => {
    let isCurrent = true
    getFriendlyRoom(roomId)
      .then((data) => isCurrent && setRoom(data))
      .catch((error) => isCurrent && setLoadError(error))
    return () => {
      isCurrent = false
    }
  }, [roomId])

  // Returns the start response, or null if it failed (see startError).
  const start = useCallback(async () => {
    setIsStarting(true)
    setStartError(null)
    try {
      return await startFriendlyMatch(roomId)
    } catch (error) {
      setStartError(error)
      return null
    } finally {
      setIsStarting(false)
    }
  }, [roomId])

  return { room, loadError, isStarting, startError, start }
}
