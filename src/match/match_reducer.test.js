import { describe, expect, it } from 'vitest'
import { initial_match_state, match_reducer } from './match_reducer'

const msg = (message) => ({ type: 'message', message })
const snapshot = { type: 'snapshot', seq: 1, state: { status: 'running', tick: 0, score: { home: 0, away: 0 }, ball: { x: 52, y: 34 }, players: [{ id: 1, team: 'home', x: 10, y: 10 }] } }

describe('match_reducer', () => {
  it('aplica el snapshot inicial', () => {
    const s = match_reducer(initial_match_state, msg(snapshot))
    expect(s.players[1]).toMatchObject({ x: 10, y: 10 })
    expect(s.status).toBe('running')
  })

  it('procesa updates sucesivos (posición, pelota, marcador, eventos)', () => {
    let s = match_reducer(initial_match_state, msg(snapshot))
    s = match_reducer(s, msg({ type: 'update', seq: 2, players: [{ id: 1, x: 12, y: 11, action: 'kick' }], ball: { x: 60, y: 34 }, events: [{ type: 'kick', player_id: 1 }] }))
    s = match_reducer(s, msg({ type: 'update', seq: 3, score: { home: 1, away: 0 } }))
    expect(s.players[1]).toMatchObject({ x: 12, y: 11, team: 'home', action: 'kick' })
    expect(s.ball).toEqual({ x: 60, y: 34 })
    expect(s.score.home).toBe(1)
    expect(s.events).toHaveLength(1)
  })

  it('ignora updates duplicados o fuera de orden', () => {
    let s = match_reducer(initial_match_state, msg(snapshot))
    s = match_reducer(s, msg({ type: 'update', seq: 3, players: [{ id: 1, x: 20, y: 20 }] }))
    const after = match_reducer(s, msg({ type: 'update', seq: 2, players: [{ id: 1, x: 99, y: 99 }] }))
    expect(after.players[1].x).toBe(20)
  })

  it('un error no destruye el último estado válido', () => {
    let s = match_reducer(initial_match_state, msg(snapshot))
    s = match_reducer(s, msg({ type: 'error', message: 'timeout', player_id: 1 }))
    expect(s.errors).toHaveLength(1)
    expect(s.players[1]).toBeDefined()
    expect(s.status).toBe('running')
  })

  it('ignora mensajes desconocidos y datos mal formados', () => {
    let s = match_reducer(initial_match_state, msg(snapshot))
    s = match_reducer(s, msg({ type: 'algo_raro' }))
    s = match_reducer(s, msg({ type: 'update', seq: 5, players: [{ id: 1, x: 'NaN' }], ball: 'x' }))
    expect(s.players[1]).toMatchObject({ x: 10, y: 10 })
    expect(s.ball).toEqual({ x: 52, y: 34 })
  })

  it('marca el partido como finalizado', () => {
    const s = match_reducer(match_reducer(initial_match_state, msg(snapshot)), msg({ type: 'finished', score: { home: 2, away: 1 } }))
    expect(s.status).toBe('finished')
    expect(s.score).toEqual({ home: 2, away: 1 })
  })

  it('un update parcial conserva el equipo y la acción del jugador', () => {
  let s = match_reducer(initial_match_state, msg({
    ...snapshot,
    state: { ...snapshot.state, players: [{ id: 1, team: 'home', x: 10, y: 10, action: 'kick' }] },
  }))
  s = match_reducer(s, msg({ type: 'update', seq: 2, players: [{ id: 1, x: 15, y: 12 }] }))
  expect(s.players[1]).toMatchObject({ x: 15, y: 12, team: 'home', action: 'kick' })
 })
})