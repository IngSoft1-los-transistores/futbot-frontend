import { useCallback, useEffect, useState } from 'react'
import { get_friendly_room, start_friendly_match } from '../api/friendly_rooms'

// Loads the room on mount and refreshes it on explicit user actions.
// Named useXxx (not snake_case) so the react-hooks lint rules recognize it.
export function useFriendlyRoom(room_id, club_id) {
  const [room, set_room] = useState(null)
  const [load_error, set_load_error] = useState(null)
  const [is_starting, set_is_starting] = useState(false)
  const [start_error, set_start_error] = useState(null)

  useEffect(() => {
    let is_current = true
    get_friendly_room(room_id)
      .then((data) => is_current && set_room(data))
      .catch((error) => is_current && set_load_error(error))
    return () => {
      is_current = false
    }
  }, [room_id])

  const conexion_websocket = useCallback(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws/friendly/${room_id}?club_id=${club_id}`)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (!isValidRoom(data.room)) return
        if (data.type === 'room_updated') {
          set_room(data.room)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }
    return () => {
      ws.close()
    }
  }, [room_id])
  
  useEffect(() => {
    const close_ws = conexion_websocket()
    return () => {
      close_ws()
    }
  }, [conexion_websocket])

  // Returns the start response, or null if it failed (see start_error).
  const start = useCallback(async () => {
    set_is_starting(true)
    set_start_error(null)
    try {
      return await start_friendly_match(room_id)
    } catch (error) {
      set_start_error(error)
      return null
    } finally {
      set_is_starting(false)
    }
  }, [room_id])

  const refresh = useCallback(async () => {
    const data = await get_friendly_room(room_id)
    set_room(data)
    return data
  }, [room_id])

  return { room, load_error, is_starting, start_error, start, refresh }
}
