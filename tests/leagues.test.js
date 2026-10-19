import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../src/api/client'
import {
  free_spots,
  get_league,
  is_league_full,
  join_league,
  OPEN_LEAGUE_STATUSES,
} from '../src/api/leagues'

vi.mock('../src/api/client', () => ({ request: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('free_spots and is_league_full', () => {
  it('counts the free spots and never goes below zero', () => {
    expect(free_spots({ maxClubs: 8, enrolledClubs: 5 })).toBe(3)
    expect(free_spots({ maxClubs: 3, enrolledClubs: 4 })).toBe(0)
  })

  it('a league is full when every spot is taken', () => {
    expect(is_league_full({ maxClubs: 3, enrolledClubs: 2 })).toBe(false)
    expect(is_league_full({ maxClubs: 3, enrolledClubs: 3 })).toBe(true)
  })
})

describe('get_league', () => {
  it('requests the league with an encoded id and forwards the options', () => {
    const { signal } = new AbortController()

    get_league('liga/1', { signal })

    expect(request).toHaveBeenCalledWith('/api/leagues/liga%2F1', { signal })
  })
})

describe('join_league', () => {
  it('posts titulares and suplentes with string ids and no password', () => {
    join_league('league-1', {
      starters: [
        { playerId: 1, behaviorId: 10 },
        { playerId: 2, behaviorId: 10 },
        { playerId: 3, behaviorId: 20 },
      ],
      substitutes: [
        { playerId: 4, behaviorId: 10 },
        { playerId: 5, behaviorId: 20 },
        { playerId: 6, behaviorId: 20 },
      ],
    })

    const [path, options] = request.mock.calls[0]

    expect(path).toBe('/api/leagues/league-1/join')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({
      titulares: [
        { playerId: '1', behaviorId: '10' },
        { playerId: '2', behaviorId: '10' },
        { playerId: '3', behaviorId: '20' },
      ],
      suplentes: [
        { playerId: '4', behaviorId: '10' },
        { playerId: '5', behaviorId: '20' },
        { playerId: '6', behaviorId: '20' },
      ],
    })
    expect(JSON.parse(options.body)).not.toHaveProperty('password')
  })

  it('adds the password for a private league', () => {
    const slot = { playerId: 'p', behaviorId: 'b' }

    join_league('league-1', {
      starters: [slot, slot, slot],
      substitutes: [slot, slot, slot],
      password: 'secreta',
    })

    const [, options] = request.mock.calls[0]
    expect(JSON.parse(options.body).password).toBe('secreta')
  })
})

describe('OPEN_LEAGUE_STATUSES', () => {
  it('only accepts clubs while the league is waiting or ready to start', () => {
    expect(OPEN_LEAGUE_STATUSES).toEqual(['waitingGuest', 'readyToStart'])
  })
})
