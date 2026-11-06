import { expect, test } from '@playwright/test'

const session = { expires_at: Math.floor(Date.now() / 1000) + 300, access_token: 'token-simulado', refresh_token: 'refresh-simulado', club_id: 'b7118fc1-a066-4fa4-b197-92e0ed6758fd' }

const PUBLIC_ROOMS_URL = /\/api\/friendly\/rooms\/public$/

test.use({ locale: 'es-AR', timezoneId: 'America/Argentina/Cordoba' })   // fechas deterministas: UTC-3

const rooms = [
  { roomId: 'room-1', status: 'waitingGuest', homeClub: 'club-a', homeClubName: 'Club Atlético Norte', createdAt: '2026-11-05T15:30:00' },
  { roomId: 'room-2', status: 'waitingGuest', homeClub: 'club-b', homeClubName: 'Racing del Sur', createdAt: '2026-11-04T18:45:00Z' },
]
const new_room = { roomId: 'room-3', status: 'waitingGuest', homeClub: 'club-c', homeClubName: 'Unión del Este', createdAt: '2026-11-05T16:00:00' }

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/logout', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user_id: 'test-user', club_id: session.club_id } }))
})

// --- Ayudas ---

async function stored_session(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('futbot.session')))
}

async function seed_session(page) {
  await page.goto('/login')
  await page.evaluate((value) => localStorage.setItem('futbot.session', JSON.stringify(value)), session)
}

// Mockea GET /api/friendly/rooms/public y registra los pedidos
async function mock_rooms(page, data = rooms) {
  const mock = { data, requests: [] }
  await page.route(PUBLIC_ROOMS_URL, async (route) => {
    const request = route.request()
    mock.requests.push({ method: request.method(), headers: request.headers() })
    await route.fulfill({ json: mock.data })
  })
  return mock
}

async function open_list(page) {
  await seed_session(page)
  await page.goto('/friendly')
  await expect(page.getByRole('heading', { name: 'Amistosos disponibles' })).toBeVisible()
}

const room_card = (page, club) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: club, exact: true }) })

// --- Acceso ---

test('el menú ofrece unirse a un amistoso y lleva al listado', async ({ page }) => {
  await mock_rooms(page)
  await seed_session(page)
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Menú principal' })).toBeVisible()
  await page.getByRole('link', { name: 'Unirse a un amistoso', exact: true }).click()
  await expect(page).toHaveURL('/friendly')
  await expect(page.getByRole('heading', { name: 'Amistosos disponibles' })).toBeVisible()
})

test('sin sesión, el listado lleva al login', async ({ page }) => {
  await page.goto('/friendly')
  await expect(page).toHaveURL('/login')
})

// --- Listado ---

test('al entrar consulta GET /api/friendly/rooms/public con el token', async ({ page }) => {
  const mock = await mock_rooms(page)
  await open_list(page)
  await expect(room_card(page, 'Club Atlético Norte')).toBeVisible()
  expect(mock.requests.length).toBeGreaterThan(0)
  for (const request of mock.requests) {
    expect(request.method).toBe('GET')
    expect(request.headers.authorization).toBe(`Bearer ${session.access_token}`)
  }
})

test('muestra el club local, el estado y la fecha de creación de cada sala', async ({ page }) => {
  await mock_rooms(page)
  await open_list(page)
  const norte = room_card(page, 'Club Atlético Norte')
  await expect(norte).toContainText('Esperando rival')
  await expect(norte).toContainText('12:30')    // 15:30 UTC = 12:30 en Córdoba (sin "Z" se toma como UTC)
  await expect(norte.locator('time')).toHaveAttribute('datetime', '2026-11-05T15:30:00.000Z')
  const sur = room_card(page, 'Racing del Sur')
  await expect(sur).toContainText('15:45')      // 18:45 UTC = 15:45 en Córdoba
  await expect(sur.locator('time')).toHaveAttribute('datetime', '2026-11-04T18:45:00.000Z')
})

test('cada sala tiene su botón Unirse', async ({ page }) => {
  await mock_rooms(page)
  await open_list(page)
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /^Unirse a la sala de/ })).toHaveCount(2)
  await expect(room_card(page, 'Racing del Sur').getByRole('button', { name: 'Unirse a la sala de Racing del Sur' })).toBeVisible()
})

test('respeta el orden que manda el servidor (más recientes primero)', async ({ page }) => {
  await mock_rooms(page, [new_room, ...rooms])
  await open_list(page)
  await expect(page.getByRole('listitem').getByRole('heading')).toHaveText(['Unión del Este', 'Club Atlético Norte', 'Racing del Sur'])
})

// --- Estados ---

test('muestra el estado de carga mientras espera al servidor', async ({ page }) => {
  let release
  const gate = new Promise((resolve) => { release = resolve })
  await page.route(PUBLIC_ROOMS_URL, async (route) => {
    await gate
    await route.fulfill({ json: rooms })
  })
  await open_list(page)
  await expect(page.getByRole('status')).toContainText('Cargando amistosos')
  release()
  await expect(room_card(page, 'Club Atlético Norte')).toBeVisible()
  await expect(page.getByText('Cargando amistosos')).toHaveCount(0)
})

test('sin salas muestra "No hay amistosos disponibles"', async ({ page }) => {
  await mock_rooms(page, [])
  await open_list(page)
  await expect(page.getByText('No hay amistosos disponibles')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('un error del servidor se informa y permite reintentar', async ({ page }) => {
  let failing = true
  await page.route(PUBLIC_ROOMS_URL, (route) => (
    failing
      ? route.fulfill({ status: 500, json: { detail: 'Servidor caído', error_code: 'INTERNAL_SERVER_ERROR' } })
      : route.fulfill({ json: rooms })
  ))
  await open_list(page)
  await expect(page.getByRole('alert')).toContainText('Servidor caído')
  failing = false
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(room_card(page, 'Club Atlético Norte')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('una falla de red se informa', async ({ page }) => {
  await page.route(PUBLIC_ROOMS_URL, (route) => route.abort())
  await open_list(page)
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar con el servidor')
  await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible()
})

test('una sesión vencida (401) borra la sesión y lleva al login', async ({ page }) => {
  await page.route(PUBLIC_ROOMS_URL, (route) => route.fulfill({ status: 401, json: { detail: 'Sesión vencida', error_code: 'UNAUTHORIZED' } }))
  await seed_session(page)
  await page.goto('/friendly')
  await expect(page).toHaveURL('/login')
  expect(await stored_session(page)).toBeNull()
})

// --- Actualizar ---

test('Actualizar vuelve a consultar y muestra las salas nuevas', async ({ page }) => {
  const mock = await mock_rooms(page)
  await open_list(page)
  await expect(page.getByRole('listitem')).toHaveCount(2)
  mock.data = [new_room, ...rooms]
  const request = page.waitForRequest(PUBLIC_ROOMS_URL)
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click()
  expect((await request).headers().authorization).toBe(`Bearer ${session.access_token}`)
  await expect(room_card(page, 'Unión del Este')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(3)
})

// --- Unirse ---

test('Unirse lleva a la selección del equipo con la sala elegida', async ({ page }) => {
  await mock_rooms(page)
  await page.route(/\/api\/players/, (route) => route.fulfill({ json: [] }))
  await page.route(/\/api\/behaviors/, (route) => route.fulfill({ json: [] }))
  await open_list(page)
  await room_card(page, 'Racing del Sur').getByRole('button', { name: /^Unirse/ }).click()
  await expect(page).toHaveURL('/friendly/join')
  await expect(page.getByRole('heading', { name: 'Unirse a amistoso', exact: true })).toBeVisible()
  await expect(page.getByText('Sala de Racing del Sur')).toBeVisible()
})

test('abrir la pantalla de unión sin haber elegido una sala vuelve al listado', async ({ page }) => {
  await mock_rooms(page)
  await seed_session(page)
  await page.goto('/friendly/join')
  await expect(page).toHaveURL('/friendly')
  await expect(page.getByRole('heading', { name: 'Amistosos disponibles' })).toBeVisible()
})