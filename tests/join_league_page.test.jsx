import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import JoinLeaguePage from '../src/pages/join_league_page'
import { list_behaviors, list_players } from '../src/api/client'
import { get_league, join_league } from '../src/api/leagues'
import { clear_session, save_session } from '../src/auth/session'

vi.mock('../src/api/client', () => ({
  request: vi.fn(),
  list_players: vi.fn(),
  list_behaviors: vi.fn(),
}))

vi.mock('../src/api/leagues', async (import_original) => ({
  ...(await import_original()),
  get_league: vi.fn(),
  join_league: vi.fn(),
}))

const LEAGUE_ID = '11111111-1111-4111-8111-111111111111'

const players = ['Ana', 'Beto', 'Carla', 'Dani', 'Eva', 'Fito'].map((name, index) => ({
  id: `player-${index + 1}`,
  name,
}))

const behaviors = [
  { id: 'behavior-1', name: 'Delantero' },
  { id: 'behavior-2', name: 'Defensa' },
]

const league = (overrides = {}) => ({
  leagueId: LEAGUE_ID,
  name: 'Liga del Barrio',
  isPrivate: false,
  status: 'waitingGuest',
  minClubs: 3,
  maxClubs: 8,
  enrolledClubs: 5,
  matchDurationMinutes: 10,
  isEnrolled: false,
  mySquad: null,
  ...overrides,
})

// Player i gets behavior-1 or behavior-2, alternating.
const chosen = (index) => ({
  playerId: `player-${index + 1}`,
  behaviorId: behaviors[index % 2].id,
})

const api_error = (status, error_code) =>
  Object.assign(new Error('error del backend'), { status, error_code })

beforeEach(() => {
  vi.resetAllMocks()
  save_session({
    access_token: 'token',
    refresh_token: 'refresh',
    club_id: 'club',
    expires_at: Date.now() / 1000 + 3600,
  })
  get_league.mockResolvedValue(league())
  list_players.mockResolvedValue(players)
  list_behaviors.mockResolvedValue(behaviors)
})

afterEach(() => {
  clear_session()
})

async function mount() {
  render(
    <MemoryRouter initialEntries={[`/ligas/${LEAGUE_ID}/unirse`]}>
      <Routes>
        <Route path="/ligas/:league_id/unirse" element={<JoinLeaguePage />} />
        <Route path="/home" element={<p>Menú principal</p>} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>
  )
  await screen.findByRole('heading', { name: 'Liga del Barrio' })
  return userEvent.setup()
}

// SquadSelector renders a player select and a behavior select per slot, in order.
async function fill_squad(user, { skip_last_behavior = false } = {}) {
  const selects = screen.getAllByRole('combobox')

  for (let index = 0; index < 6; index += 1) {
    await user.selectOptions(selects[index * 2], chosen(index).playerId)
    if (skip_last_behavior && index === 5) continue
    await user.selectOptions(selects[index * 2 + 1], chosen(index).behaviorId)
  }
}

const confirm_button = () => screen.getByRole('button', { name: 'Confirmar inscripción' })

describe('loading', () => {
  it('shows the basic league information', async () => {
    await mount()

    const facts = screen.getByRole('region', { name: 'Liga del Barrio' })
    expect(within(facts).getByText('Pública')).toBeInTheDocument()
    expect(within(facts).getByText('Esperando clubes')).toBeInTheDocument()
    expect(within(facts).getByText('3 de 8')).toBeInTheDocument()
    expect(within(facts).getByText('3 clubes')).toBeInTheDocument()
    expect(within(facts).getByText('10 minutos')).toBeInTheDocument()
    expect(get_league).toHaveBeenCalledWith(LEAGUE_ID, expect.anything())
  })

  it('offers to go back without retrying when the league does not exist', async () => {
    get_league.mockRejectedValue(api_error(404, 'LEAGUE_NOT_FOUND'))
    render(
      <MemoryRouter initialEntries={[`/ligas/${LEAGUE_ID}/unirse`]}>
        <Routes>
          <Route path="/ligas/:league_id/unirse" element={<JoinLeaguePage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La liga no existe o el ID no es válido.'
    )
    expect(screen.getByRole('button', { name: 'Volver al menú' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('lets the user retry after a failed load', async () => {
    get_league.mockRejectedValueOnce(api_error(500, 'INTERNAL_SERVER_ERROR'))
    render(
      <MemoryRouter initialEntries={[`/ligas/${LEAGUE_ID}/unirse`]}>
        <Routes>
          <Route path="/ligas/:league_id/unirse" element={<JoinLeaguePage />} />
        </Routes>
      </MemoryRouter>
    )
    const user = userEvent.setup()

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la liga.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'Liga del Barrio' })).toBeInTheDocument()
    expect(get_league).toHaveBeenCalledTimes(2)
  })

  it('sends the user to the login without a session', async () => {
    clear_session()
    render(
      <MemoryRouter initialEntries={[`/ligas/${LEAGUE_ID}/unirse`]}>
        <Routes>
          <Route path="/ligas/:league_id/unirse" element={<JoinLeaguePage />} />
          <Route path="/login" element={<p>Pantalla de login</p>} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument()
    expect(get_league).not.toHaveBeenCalled()
  })
})

describe('squad selection', () => {
  it('shows three starter and three substitute slots', async () => {
    await mount()

    expect(screen.getByText('Titulares (3 requeridos)')).toBeInTheDocument()
    expect(screen.getByText('Suplentes (3 requeridos)')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(12)
  })

  it('keeps confirm disabled until every player has a behavior', async () => {
    const user = await mount()
    expect(confirm_button()).toBeDisabled()

    await fill_squad(user, { skip_last_behavior: true })
    expect(confirm_button()).toBeDisabled()

    await user.selectOptions(screen.getAllByRole('combobox')[11], chosen(5).behaviorId)
    expect(confirm_button()).toBeEnabled()
  })

  it('warns when the club has fewer than six players', async () => {
    list_players.mockResolvedValue(players.slice(0, 3))
    await mount()

    expect(
      screen.getByText(/Tenés 3 jugadores. Necesitás al menos 6 jugadores distintos/)
    ).toBeInTheDocument()
    expect(confirm_button()).toBeDisabled()
  })
})

describe('leagues that cannot be joined', () => {
  it.each([
    ['already started', { status: 'inProgress' }, 'La liga ya no admite inscripciones.'],
    ['full', { enrolledClubs: 8 }, 'La liga está completa: ya no es posible unirse.'],
    ['private', { isPrivate: true }, 'Esta liga es privada: para unirte necesitás su contraseña.'],
  ])('a %s league shows the reason and no squad selector', async (_, overrides, message) => {
    get_league.mockResolvedValue(league(overrides))
    await mount()

    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Volver al menú' })).toBeInTheDocument()
  })

  it('shows the confirmed squad, read only, when the club is already enrolled', async () => {
    get_league.mockResolvedValue(
      league({
        isEnrolled: true,
        mySquad: [
          { playerId: 'player-1', name: 'Ana', role: 'starter', behaviorId: 'behavior-1', behaviorName: 'Delantero' },
          { playerId: 'player-4', name: 'Dani', role: 'substitute', behaviorId: 'behavior-2', behaviorName: 'Defensa' },
        ],
      })
    )
    await mount()

    const squad = screen.getByRole('region', { name: 'Tu escuadra' })
    expect(within(squad).getByText(/Tu escuadra quedó confirmada y no puede modificarse/)).toBeInTheDocument()
    expect(within(squad).getByText('Ana')).toBeInTheDocument()
    expect(within(squad).getByText('Defensa')).toBeInTheDocument()
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Confirmar inscripción' })).not.toBeInTheDocument()
  })
})

describe('confirming', () => {
  it('joins with the selected squad and then locks it', async () => {
    join_league.mockResolvedValue({ enrollmentId: 'e-1', clubId: 'club', leagueId: LEAGUE_ID })
    const user = await mount()

    await fill_squad(user)
    await user.click(confirm_button())

    expect(join_league).toHaveBeenCalledWith(LEAGUE_ID, {
      starters: [chosen(0), chosen(1), chosen(2)],
      substitutes: [chosen(3), chosen(4), chosen(5)],
    })
    expect(await screen.findByRole('dialog', { name: '¡Te uniste a la liga!' })).toBeInTheDocument()

    const squad = screen.getByRole('region', { name: 'Tu escuadra' })
    expect(within(squad).getByText('Ana')).toBeInTheDocument()
    expect(within(squad).getByText('Fito')).toBeInTheDocument()
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Confirmar inscripción' })).not.toBeInTheDocument()

    // The own join takes one spot: 5 of 8 clubs before, 6 after.
    expect(screen.getByText('2 de 8')).toBeInTheDocument()
  })

  it('locks the squad and the button while the request is in flight', async () => {
    let respond
    join_league.mockReturnValue(new Promise((resolve) => { respond = resolve }))
    const user = await mount()

    await fill_squad(user)
    await user.click(confirm_button())

    expect(screen.getByRole('button', { name: 'Inscribiendo…' })).toBeDisabled()
    screen.getAllByRole('combobox').forEach((select) => expect(select).toBeDisabled())

    respond({})
    expect(await screen.findByRole('dialog', { name: '¡Te uniste a la liga!' })).toBeInTheDocument()
  })

  it('reports that the league is full and stops offering the selector', async () => {
    join_league.mockRejectedValue(api_error(400, 'LEAGUE_FULL'))
    const user = await mount()

    await fill_squad(user)
    await user.click(confirm_button())

    const dialog = await screen.findByRole('dialog', { name: 'Liga completa' })
    expect(within(dialog).getByText('La liga está completa: ya no es posible unirse.')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('La liga está completa')
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
  })

  it.each([
    ['LEAGUE_NOT_OPEN', 'La liga ya no admite inscripciones.'],
    ['ALREADY_IN_LEAGUE', 'Tu club ya está inscripto en esta liga.'],
    ['LEAGUE_LIMIT_REACHED', 'Ya participás en la cantidad máxima de ligas activas.'],
  ])('shows the message for %s', async (error_code, message) => {
    join_league.mockRejectedValue(api_error(400, error_code))
    const user = await mount()

    await fill_squad(user)
    await user.click(confirm_button())

    const dialog = await screen.findByRole('dialog', { name: 'No es posible unirse' })
    expect(within(dialog).getByText(message)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Volver al menú' })).toBeInTheDocument()
  })

  it('an invalid squad lets the user pick again from scratch', async () => {
    join_league.mockRejectedValue(api_error(400, 'INVALID_SQUAD_PLAYERS'))
    const user = await mount()

    await fill_squad(user)
    await user.click(confirm_button())

    const dialog = await screen.findByRole('dialog', { name: 'Escuadra no válida' })
    await user.click(within(dialog).getByRole('button', { name: 'Volver a seleccionar' }))

    await screen.findByRole('heading', { name: 'Liga del Barrio' })
    screen.getAllByRole('combobox').forEach((select) => expect(select).toHaveValue(''))
    expect(get_league).toHaveBeenCalledTimes(2)
  })

  it('a network error keeps the selection so the user can retry', async () => {
    join_league.mockRejectedValue(new TypeError('Failed to fetch'))
    const user = await mount()

    await fill_squad(user)
    await user.click(confirm_button())

    const dialog = await screen.findByRole('dialog', { name: 'No se pudo unir a la liga' })
    expect(within(dialog).getByText('No se pudo contactar al servidor.')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('player-1')
    expect(confirm_button()).toBeEnabled()
  })
})
