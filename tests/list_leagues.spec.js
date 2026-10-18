import { expect, test } from '@playwright/test'

const session = { expires_at: Math.floor(Date.now() / 1000) + 300, access_token: 'token-simulado', refresh_token: 'refresh-simulado', club_id: 'b7118fc1-a066-4fa4-b197-92e0ed6758fd' }

const LEAGUES_URL = /\/api\/leagues(\?.*)?$/

const leagues = [
  { id: 'league-norte', name: 'Liga Norte', participantsCount: 12, started: false, isPrivate: false },
  { id: 'league-sur', name: 'Copa Sur', participantsCount: 1, started: true, isPrivate: false },
  { id: 'league-centro', name: 'Liga del Centro', participantsCount: 0, started: false, isPrivate: false },
]

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

// Mockea GET /api/leagues filtrando por `name` como el backend, y registra los pedidos
async function mock_leagues(page, all = leagues) {
  const requests = []
  await page.route(LEAGUES_URL, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const name = url.searchParams.get('name')
    requests.push({ method: request.method(), search: url.search, headers: request.headers() })
    const result = name ? all.filter((league) => league.name.toLowerCase().includes(name.toLowerCase())) : all
    await route.fulfill({ json: result })
  })
  return requests
}

async function open_leagues(page) {
  await seed_session(page)
  await page.goto('/leagues')
  await expect(page.getByRole('heading', { name: 'Ligas disponibles' })).toBeVisible()
}

const league_card = (page, name) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) })

async function search_for(page, text) {
  await page.getByLabel('Buscar por nombre').fill(text)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
}

// --- Acceso ---

test('el menú ofrece ver las ligas y lleva al listado', async ({ page }) => {
  await mock_leagues(page)
  await seed_session(page)
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Menú principal' })).toBeVisible()
  await page.getByRole('link', { name: /ver ligas/i }).click()
  await expect(page).toHaveURL('/leagues')
  await expect(page.getByRole('heading', { name: 'Ligas disponibles' })).toBeVisible()
})

test('sin sesión, el listado lleva al login', async ({ page }) => {
  await page.goto('/leagues')
  await expect(page).toHaveURL('/login')
})

// --- Consulta y listado ---

test('al entrar consulta GET /api/leagues con el token y sin filtro', async ({ page }) => {
  const requests = await mock_leagues(page)
  await open_leagues(page)
  await expect(league_card(page, 'Liga Norte')).toBeVisible()
  expect(requests.length).toBeGreaterThan(0)
  for (const request of requests) {
    expect(request.method).toBe('GET')
    expect(request.search).toBe('')
    expect(request.headers.authorization).toBe(`Bearer ${session.access_token}`)
  }
})

test('muestra nombre, participantes y estado de cada liga', async ({ page }) => {
  await mock_leagues(page)
  await open_leagues(page)
  await expect(page.getByRole('listitem')).toHaveCount(3)
  await expect(league_card(page, 'Liga Norte')).toContainText('12 participantes')
  await expect(league_card(page, 'Liga Norte')).toContainText('Sin iniciar')
  await expect(league_card(page, 'Copa Sur')).toContainText('1 participante')
  await expect(league_card(page, 'Copa Sur')).not.toContainText('1 participantes')
  await expect(league_card(page, 'Copa Sur')).toContainText('Iniciada')
  await expect(league_card(page, 'Liga del Centro')).toContainText('0 participantes')
  await expect(page.getByText('3 ligas', { exact: true })).toBeVisible()
})

test('muestra el estado de carga mientras espera al servidor', async ({ page }) => {
  let respond
  const response = new Promise((resolve) => { respond = resolve })
  await page.route(LEAGUES_URL, async (route) => {
    await response
    await route.fulfill({ json: leagues })
  })
  await open_leagues(page)
  await expect(page.getByRole('status')).toContainText('Cargando ligas')
  respond()
  await expect(league_card(page, 'Liga Norte')).toBeVisible()
})

test('sin ligas informa que no hay disponibles', async ({ page }) => {
  await mock_leagues(page, [])
  await open_leagues(page)
  await expect(page.getByText('Todavía no hay ligas disponibles.')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

// --- Búsqueda ---

test('buscar por nombre consulta ?name= y actualiza el listado', async ({ page }) => {
  const requests = await mock_leagues(page)
  await open_leagues(page)
  await expect(page.getByRole('listitem')).toHaveCount(3)
  await search_for(page, 'liga')
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(league_card(page, 'Liga Norte')).toBeVisible()
  await expect(league_card(page, 'Liga del Centro')).toBeVisible()
  await expect(league_card(page, 'Copa Sur')).toHaveCount(0)
  await expect(page.getByText('2 ligas para "liga"', { exact: true })).toBeVisible()
  const last = requests[requests.length - 1]
  expect(last.search).toBe('?name=liga')
  expect(last.headers.authorization).toBe(`Bearer ${session.access_token}`)
})

test('la búsqueda ignora los espacios de los costados', async ({ page }) => {
  const requests = await mock_leagues(page)
  await open_leagues(page)
  await search_for(page, '  sur  ')
  await expect(league_card(page, 'Copa Sur')).toBeVisible()
  expect(requests[requests.length - 1].search).toBe('?name=sur')
})

test('buscar con Enter también filtra', async ({ page }) => {
  await mock_leagues(page)
  await open_leagues(page)
  await page.getByLabel('Buscar por nombre').fill('copa')
  await page.getByLabel('Buscar por nombre').press('Enter')
  await expect(page.getByRole('listitem')).toHaveCount(1)
})

test('una búsqueda sin coincidencias informa al usuario', async ({ page }) => {
  await mock_leagues(page)
  await open_leagues(page)
  await search_for(page, 'zzz')
  await expect(page.getByText('No hay ligas que coincidan con "zzz".')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('Limpiar vuelve a mostrar todas las ligas', async ({ page }) => {
  const requests = await mock_leagues(page)
  await open_leagues(page)
  await search_for(page, 'sur')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click()
  await expect(page.getByRole('listitem')).toHaveCount(3)
  await expect(page.getByLabel('Buscar por nombre')).toHaveValue('')
  expect(requests[requests.length - 1].search).toBe('')
})

// --- Selección ---

test('seleccionar una liga la resalta y la muestra como elegida', async ({ page }) => {
  await mock_leagues(page)
  await open_leagues(page)
  await league_card(page, 'Liga Norte').getByRole('button', { name: 'Seleccionar', exact: true }).click()
  const button = league_card(page, 'Liga Norte').getByRole('button', { name: 'Seleccionada', exact: true })
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Liga seleccionada: Liga Norte' })).toBeVisible()
})

test('solo se puede elegir una liga a la vez y volver a tocarla la quita', async ({ page }) => {
  await mock_leagues(page)
  await open_leagues(page)
  await league_card(page, 'Liga Norte').getByRole('button', { name: 'Seleccionar', exact: true }).click()
  await league_card(page, 'Copa Sur').getByRole('button', { name: 'Seleccionar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Liga seleccionada: Copa Sur' })).toBeVisible()
  await expect(league_card(page, 'Liga Norte').getByRole('button', { name: 'Seleccionar', exact: true })).toBeVisible()
  await league_card(page, 'Copa Sur').getByRole('button', { name: 'Seleccionada', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Liga seleccionada/ })).toHaveCount(0)
})

test('Quitar selección descarta la liga elegida', async ({ page }) => {
  await mock_leagues(page)
  await open_leagues(page)
  await league_card(page, 'Liga Norte').getByRole('button', { name: 'Seleccionar', exact: true }).click()
  await page.getByRole('button', { name: 'Quitar selección', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Liga seleccionada/ })).toHaveCount(0)
  await expect(league_card(page, 'Liga Norte').getByRole('button', { name: 'Seleccionar', exact: true })).toBeVisible()
})

test('la liga elegida se conserva al cambiar la búsqueda', async ({ page }) => {
  await mock_leagues(page)
  await open_leagues(page)
  await league_card(page, 'Liga Norte').getByRole('button', { name: 'Seleccionar', exact: true }).click()
  await search_for(page, 'copa')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Liga seleccionada: Liga Norte' })).toBeVisible()
})

// --- Errores ---

test('un error del servidor se informa y permite reintentar', async ({ page }) => {
  let failing = true
  await page.route(LEAGUES_URL, (route) => (
    failing
      ? route.fulfill({ status: 500, json: { detail: 'Servidor caído', error_code: 'INTERNAL_SERVER_ERROR' } })
      : route.fulfill({ json: leagues })
  ))
  await open_leagues(page)
  await expect(page.getByRole('alert')).toContainText('Servidor caído')
  failing = false
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(league_card(page, 'Liga Norte')).toBeVisible()
})

test('un error de conexión se informa', async ({ page }) => {
  await page.route(LEAGUES_URL, (route) => route.abort())
  await open_leagues(page)
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar con el servidor')
})

test('una sesión vencida (401) borra la sesión y lleva al login', async ({ page }) => {
  await page.route(LEAGUES_URL, (route) => route.fulfill({ status: 401, json: { detail: 'Sesión vencida', error_code: 'UNAUTHORIZED' } }))
  await seed_session(page)
  await page.goto('/leagues')
  await expect(page).toHaveURL('/login')
  expect(await stored_session(page)).toBeNull()
})