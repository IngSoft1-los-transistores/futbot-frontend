import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMatchSocket } from './use_match_socket'
import { read_session } from '../auth/session'

vi.mock('../auth/session', () => ({ read_session: vi.fn() }))

class FakeWS {
  static instances = []
  constructor(url) {
    this.url = url
    this.close = vi.fn()
    FakeWS.instances.push(this)
  }
}
const last_ws = () => FakeWS.instances.at(-1)
const send = (ws, event, payload = {}) => act(() => ws.onmessage({ data: JSON.stringify({ event, payload }) }))
const close_with = (ws, code) => act(() => ws.onclose({ code }))
const advance = (ms) => act(() => vi.advanceTimersByTime(ms))

describe('useMatchSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeWS.instances = []
    vi.stubGlobal('WebSocket', FakeWS)
    vi.mocked(read_session).mockReturnValue({ access_token: 'tok' })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('se conecta a /ws/match/{id} con el rol y el token de la sesión', () => {
    renderHook(() => useMatchSocket('7'))
    expect(last_ws().url).toContain('/ws/match/7?')
    expect(last_ws().url).toContain('role=player')
    expect(last_ws().url).toContain('token=tok')
  })

  it('no se conecta si no hay match_id', () => {
    renderHook(() => useMatchSocket(null))
    expect(FakeWS.instances).toHaveLength(0)
  })

  it('procesa mensajes del servidor', () => {
    const { result } = renderHook(() => useMatchSocket('7'))
    send(last_ws(), 'SIMULATION_TICK', { currentTime: 5, players: [{ playerId: 'p1', clubId: 'c', x: 1, y: 2 }] })
    expect(result.current.state.players.p1).toBeDefined()
    expect(result.current.state.current_time).toBe(5)
  })

  it('reconecta tras un cierre anormal', () => {
    const { result } = renderHook(() => useMatchSocket('7'))
    send(last_ws(), 'MATCH_CONNECTED', { status: 'notStarted' })
    close_with(last_ws(), 1006)
    expect(result.current.state.connection).toBe('reconnecting')
    advance(500)
    expect(FakeWS.instances).toHaveLength(2)
  })

  it('no reconecta con cierre normal (1000)', () => {
    const { result } = renderHook(() => useMatchSocket('7'))
    close_with(last_ws(), 1000)
    advance(60000)
    expect(FakeWS.instances).toHaveLength(1)
    expect(result.current.state.connection).toBe('closed')
  })

  it('al recibir MATCH_FINISHED cierra el socket y no reconecta', () => {
    const { result } = renderHook(() => useMatchSocket('7'))
    send(last_ws(), 'MATCH_FINISHED', { finalScore: { home: 2, away: 1 } })
    expect(last_ws().close).toHaveBeenCalledWith(1000)
    close_with(last_ws(), 1006)
    advance(60000)
    expect(FakeWS.instances).toHaveLength(1)
    expect(result.current.state.status).toBe('finished')
  })

  it('con token inválido avisa y no reconecta', () => {
    const on_unauthorized = vi.fn()
    window.addEventListener('futbot:unauthorized', on_unauthorized)
    renderHook(() => useMatchSocket('7'))
    close_with(last_ws(), 4401)
    advance(60000)
    window.removeEventListener('futbot:unauthorized', on_unauthorized)
    expect(on_unauthorized).toHaveBeenCalledTimes(1)
    expect(FakeWS.instances).toHaveLength(1)
  })

  it('con partido inexistente (4404) no reconecta', () => {
    const { result } = renderHook(() => useMatchSocket('7'))
    close_with(last_ws(), 4404)
    advance(60000)
    expect(FakeWS.instances).toHaveLength(1)
    expect(result.current.state.connection).toBe('closed')
  })

  it('si nunca llega un mensaje, deja de reintentar rápido', () => {
    const { result } = renderHook(() => useMatchSocket('7'))
    for (let i = 0; i < 10; i++) {
      close_with(last_ws(), 1006)
      advance(8000)
    }
    expect(FakeWS.instances.length).toBeLessThanOrEqual(4)
    expect(result.current.state.connection).toBe('closed')
  })

  it('deja de reintentar tras el máximo de intentos seguidos', () => {
    const { result } = renderHook(() => useMatchSocket('7'))
    send(last_ws(), 'MATCH_CONNECTED', { status: 'running' })
    for (let i = 0; i < 15; i++) {
      close_with(last_ws(), 1006)
      advance(8000)
    }
    expect(FakeWS.instances.length).toBeLessThanOrEqual(11)
    expect(result.current.state.connection).toBe('closed')
  })

  it('al desmontar cierra el socket y no reconecta', () => {
    const { unmount } = renderHook(() => useMatchSocket('7'))
    const ws = last_ws()
    unmount()
    expect(ws.close).toHaveBeenCalled()
    close_with(ws, 1006)
    advance(60000)
    expect(FakeWS.instances).toHaveLength(1)
  })
})