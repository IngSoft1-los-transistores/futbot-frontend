import { describe, expect, it } from 'vitest'
import { empty_squad, is_squad_complete, squad_entries } from '../src/components/squad'

const slot = (playerId, behaviorId = 'behavior-1') => ({ playerId, behaviorId })

const full_squad = () => ({
  starters: [slot('player-1'), slot('player-2'), slot('player-3')],
  substitutes: [slot('player-4'), slot('player-5'), slot('player-6', 'behavior-2')],
})

describe('empty_squad', () => {
  it('builds three empty starters and three empty substitutes', () => {
    const empty = { playerId: '', behaviorId: '' }

    expect(empty_squad()).toEqual({
      starters: [empty, empty, empty],
      substitutes: [empty, empty, empty],
    })
  })

  it('returns a new squad on every call', () => {
    const squad = empty_squad()
    squad.starters[0].playerId = 'player-1'

    expect(empty_squad().starters[0].playerId).toBe('')
  })
})

describe('is_squad_complete', () => {
  it('is false for an empty squad', () => {
    expect(is_squad_complete(empty_squad())).toBe(false)
  })

  it('is true with six different players and a behavior each', () => {
    expect(is_squad_complete(full_squad())).toBe(true)
  })

  it('is false when a slot has no player', () => {
    const squad = full_squad()
    squad.substitutes[2] = slot('')

    expect(is_squad_complete(squad)).toBe(false)
  })

  it('is false when a player has no behavior', () => {
    const squad = full_squad()
    squad.starters[1] = slot('player-2', '')

    expect(is_squad_complete(squad)).toBe(false)
  })

  it('is false when a player is repeated', () => {
    const squad = full_squad()
    squad.substitutes[0] = slot('player-1')

    expect(is_squad_complete(squad)).toBe(false)
  })
})

describe('squad_entries', () => {
  it('builds the six entries with role and names, starters first', () => {
    const players = Array.from({ length: 6 }, (_, index) => ({
      id: `player-${index + 1}`,
      name: `Jugador ${index + 1}`,
    }))
    const behaviors = [
      { id: 'behavior-1', name: 'Delantero' },
      { id: 'behavior-2', name: 'Defensa' },
    ]

    const entries = squad_entries(full_squad(), players, behaviors)

    expect(entries).toHaveLength(6)
    expect(entries[0]).toEqual({
      playerId: 'player-1',
      name: 'Jugador 1',
      role: 'starter',
      behaviorId: 'behavior-1',
      behaviorName: 'Delantero',
    })
    expect(entries[5]).toEqual({
      playerId: 'player-6',
      name: 'Jugador 6',
      role: 'substitute',
      behaviorId: 'behavior-2',
      behaviorName: 'Defensa',
    })
    expect(entries.map((entry) => entry.role)).toEqual([
      'starter', 'starter', 'starter', 'substitute', 'substitute', 'substitute',
    ])
  })
})
