import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Match from './Match'
import { get_match_state } from '../api/matches'
import { save_session } from '../auth/session'

vi.mock('../api/matches', () => ({ get_match_state: vi.fn() }))
const snapshot = (changes = {}) => ({
  match_id: 'match-1', revision: 1, status: 'in_progress',
  home_club: { club_id: 'home', name: 'Local FC' }, away_club: { club_id: 'away', name: 'Visitante FC' },
  score: { home: 0, away: 0 }, current_time: 5, remaining_time: 295,
  ball: { x: 10, y: 20, owner_player_id: null },
  players: [{ player_id: 'p1', club_id: 'home', name: 'Ana', behavior_id: 'b1', on_field: true, has_ball: false, position: { x: 5, y: 3 } }],
  actions: [], ...changes,
})
const mount = () => render(<MemoryRouter initialEntries={['/matches/match-1']}><Routes>
  <Route path="/matches/:match_id" element={<Match />} />
  <Route path="/login" element={<p>Inicio de sesión</p>} />
</Routes></MemoryRouter>)
const flush = async () => act(async () => {})
const tick = async () => act(async () => { await vi.advanceTimersByTimeAsync(1000) })

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetAllMocks()
  save_session({ access_token: 'token', refresh_token: 'refresh', club_id: 'home', expires_at: Date.now() / 1000 + 3600 })
})
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear() })

describe('Estado del partido', () => {
  it('actualiza marcador, tiempos, jugadores y acciones, y se detiene al finalizar', async () => {
    get_match_state.mockResolvedValueOnce(snapshot()).mockResolvedValueOnce(snapshot({
      revision: 2, score: { home: 1, away: 0 }, current_time: 42, remaining_time: 258,
      actions: [{ type: 'goal', player_id: 'p1', club_id: 'home' }],
      players: [{ ...snapshot().players[0], position: { x: 12, y: 8 }, has_ball: true, behavior_id: 'b2' }],
    })).mockResolvedValue(snapshot({ revision: 3, status: 'finished' }))
    mount(); await flush()
    expect(screen.getAllByText('Local FC')).toHaveLength(2)
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByLabelText('Marcador: 0 a 0')).toBeInTheDocument()
    await tick()
    expect(screen.getByLabelText('Marcador: 1 a 0')).toBeInTheDocument()
    expect(screen.getByText('00:42')).toBeInTheDocument()
    expect(screen.getByText('Gol')).toBeInTheDocument()
    expect(screen.getByText('Posición: (12, 8)')).toBeInTheDocument()
    expect(screen.getByText('Comportamiento: b2')).toBeInTheDocument()
    expect(screen.getByText('En cancha · Con pelota')).toBeInTheDocument()
    await tick()
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
    await tick()
    expect(get_match_state).toHaveBeenCalledTimes(3)
  })

  it('conserva el último estado ante errores y se recupera automáticamente', async () => {
    get_match_state.mockResolvedValueOnce(snapshot()).mockRejectedValueOnce(new TypeError('Network')).mockResolvedValue(snapshot({ revision: 2, status: 'paused' }))
    mount(); await flush(); await tick()
    expect(screen.getByRole('alert')).toHaveTextContent('desactualizado')
    expect(screen.getByLabelText('Marcador: 0 a 0')).toBeInTheDocument()
    await tick()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('En pausa')).toBeInTheDocument()
  })

  it('espera el estado inicial y no retrocede a una revisión anterior', async () => {
    get_match_state.mockRejectedValueOnce({ status: 409 }).mockResolvedValueOnce(snapshot({ revision: 3, score: { home: 2, away: 0 } })).mockResolvedValue(snapshot())
    mount(); await flush()
    expect(screen.getByRole('alert')).toHaveTextContent('Esperando el estado inicial')
    await tick(); await tick()
    expect(screen.getByLabelText('Marcador: 2 a 0')).toBeInTheDocument()
  })

  it.each([403, 404, 422])('detiene las consultas ante un error %s', async (status) => {
    get_match_state.mockRejectedValue({ status })
    mount(); await flush(); await tick()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(get_match_state).toHaveBeenCalledTimes(1)
  })

  it('redirige cuando no hay sesión y ante un 401', async () => {
    get_match_state.mockRejectedValue({ status: 401 })
    mount(); await flush()
    expect(screen.getByText('Inicio de sesión')).toBeInTheDocument()
    cleanup(); localStorage.clear(); get_match_state.mockClear()
    mount(); await flush()
    expect(screen.getByText('Inicio de sesión')).toBeInTheDocument()
    expect(get_match_state).not.toHaveBeenCalled()
  })

  it('no superpone consultas y cancela al desmontar', async () => {
    get_match_state.mockImplementation(() => new Promise(() => {}))
    const view = mount(); await tick(); await tick()
    expect(get_match_state).toHaveBeenCalledTimes(1)
    const signal = get_match_state.mock.calls[0][1].signal
    view.unmount()
    expect(signal.aborted).toBe(true)
    await tick()
    expect(get_match_state).toHaveBeenCalledTimes(1)
  })
})
