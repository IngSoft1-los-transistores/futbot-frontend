import { describe, it, expect } from 'vitest'
import { parse_change_result } from '../src/match/change_behavior_result'

describe('parse_change_result', () => {
  it('reconoce el acuse de éxito', () => {
    const raw = JSON.stringify({ type: 'behavior_change_accepted', playerId: 'p1', behaviorId: 'b2' })
    expect(parse_change_result(raw)).toEqual({ ok: true })
  })

  it('devuelve el mensaje del servidor en un error', () => {
    const raw = JSON.stringify({ type: 'error', status: 404, message: 'Comportamiento no disponible' })
    expect(parse_change_result(raw)).toEqual({ ok: false, message: 'Comportamiento no disponible' })
  })

  it('usa un mensaje por defecto si el error no trae texto', () => {
    const raw = JSON.stringify({ type: 'error', status: 400 })
    expect(parse_change_result(raw).message).toBe('No se pudo cambiar el comportamiento')
  })

  it('devuelve null con otros mensajes o JSON inválido', () => {
    expect(parse_change_result(JSON.stringify({ event: 'GOAL_SCORED' }))).toBeNull()
    expect(parse_change_result('no es json')).toBeNull()
  })
})