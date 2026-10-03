import { expect, test } from '@playwright/test'

const session = { expires_at: Math.floor(Date.now() / 1000) + 300, access_token: 'token-simulado', refresh_token: 'refresh-simulado', club_id: 'b7118fc1-a066-4fa4-b197-92e0ed6758fd' }

const ROOM_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ROOM_ID = '22222222-2222-4222-8222-222222222222'
const ROOM_CODE = 'ABC123'

const players = [
  { id: 'player-ana', name: 'Ana' }, { id: 'player-beto', name: 'Beto' }, { id: 'player-carla', name: 'Carla' },
  { id: 'player-dani', name: 'Dani' }, { id: 'player-eva', name: 'Eva' }, { id: 'player-fito', name: 'Fito' },
  { id: 'player-gus', name: 'Gus' },
]
const behaviors = [
  { id: 'behavior-front', name: 'Delantero' },
  { id: 'behavior-defense', name: 'Defensa' },
  { id: 'behavior-keeper', name: 'Arquero' },
]
const starters = ['Ana', 'Beto', 'Carla']
const substitutes = ['Dani', 'Eva', 'Fito']
const team = { Ana: 'Delantero', Beto: 'Defensa', Carla: 'Arquero', Dani: 'Delantero', Eva: 'Defensa', Fito: 'Arquero' }

const player_id = (name) => players.find((player) => player.name === name).id
const behavior_id = (label) => behaviors.find((behavior) => behavior.name === label).id
const selection_of = (names) => names.map((name) => ({ playerId: player_id(name), behaviorId: behavior_id(team[name]) }))
const expected_body = { code: ROOM_CODE, titulares: selection_of(starters), suplentes: selection_of(substitutes) }
const joined = { roomId: ROOM_ID, status: 'readyToStart', awayClub: session.club_id }

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/logout', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/auth/me', async (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${session.access_token}`)
    await route.fulfill({ json: { user_id: 'test-user', club_id: session.club_id } })
  })
  await page.route('**/api/players', async (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${session.access_token}`)
    await route.fulfill({ json: players })
  })
  await page.route('**/api/behaviors/preprogrammed', async (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${session.access_token}`)
    await route.fulfill({ json: behaviors })
  })
})

// --- Ayudas ---

async function stored_session(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('futbot.session')))
}

async function seed_session(page) {
  await page.goto('/login')
  await page.evaluate((value) => localStorage.setItem('futbot.session', JSON.stringify(value)), session)
}

async function open_home(page) {
  await seed_session(page)
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Menú principal' })).toBeVisible()
}

async function open_join_modal(page) {
  await page.getByRole('button', { name: 'Unirse a un amistoso', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Unirse a un amistoso' })).toBeVisible()
}

async function fill_modal(page, room_id, code) {
  await page.getByLabel('ID de la sala').fill(room_id)
  await page.getByLabel('Código de la sala').fill(code)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
}

// Llega a la pantalla de selección pasando por el menú y la ventana emergente
async function open_join_page(page) {
  await open_home(page)
  await open_join_modal(page)
  await fill_modal(page, ROOM_ID, ROOM_CODE)
  await expect(page).toHaveURL('/friendly/join')
  await expect(page.getByRole('heading', { name: 'Unirse a amistoso', exact: true })).toBeVisible()
}

// Fila de un jugador (en la lista de disponibles o en el equipo)
const row = (page, name) => page.getByRole('listitem').filter({ hasText: new RegExp(`^${name}`) })

async function pick(page, name, role) {
  await row(page, name).getByRole('button', { name: role, exact: true }).click()
}

async function choose_behavior(page, name, label) {
  await page.getByLabel(`Comportamiento de ${name}`).selectOption({ label })
}

async function pick_team(page) {
  for (const name of starters) await pick(page, name, 'Titular')
  for (const name of substitutes) await pick(page, name, 'Suplente')
}

async function fill_team(page) {
  await pick_team(page)
  for (const name of [...starters, ...substitutes]) await choose_behavior(page, name, team[name])
}

const confirm_button = (page) => page.getByRole('button', { name: /^(Confirmar|Uniéndote…)$/ })

// Mockea el POST de unirse y registra lo que recibe
async function mock_join(page, status, json) {
  const requests = []
  await page.route('**/api/friendly/rooms/*/join', async (route) => {
    const request = route.request()
    requests.push({ method: request.method(), url: request.url(), headers: request.headers(), body: request.postDataJSON() })
    await route.fulfill({ status, json })
  })
  return requests
}

// --- Opción "Unirse a amistoso" y ventana emergente ---

test('el menú ofrece unirse a un amistoso y abre la ventana de ID y código', async ({ page }) => {
  await open_home(page)
  await open_join_modal(page)
  await expect(page.getByLabel('ID de la sala')).toBeVisible()
  await expect(page.getByLabel('Código de la sala')).toBeVisible()
})

test('valida el ID y el código antes de continuar', async ({ page }) => {
  await open_home(page)
  await open_join_modal(page)
  const dialog = page.getByRole('dialog')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('El ID de la sala no tiene un formato válido')
  await page.getByLabel('ID de la sala').fill(ROOM_ID)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('El código debe tener 6 caracteres')
  await page.getByLabel('Código de la sala').fill('AB1')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('El código debe tener 6 caracteres')
  await expect(page).toHaveURL('/home')
})

test('el código se escribe en mayúsculas', async ({ page }) => {
  await open_home(page)
  await open_join_modal(page)
  await page.getByLabel('Código de la sala').fill('abc123')
  await expect(page.getByLabel('Código de la sala')).toHaveValue('ABC123')
})

test('Cancelar y Escape cierran la ventana sin navegar y limpian los campos', async ({ page }) => {
  await open_home(page)
  await open_join_modal(page)
  await page.getByLabel('ID de la sala').fill(ROOM_ID)
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await open_join_modal(page)
  await expect(page.getByLabel('ID de la sala')).toHaveValue('')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).toHaveURL('/home')
})

test('con ID y código válidos pasa a la selección de jugadores', async ({ page }) => {
  await open_join_page(page)
  await expect(page.getByText(`Sala: ${ROOM_ID}`)).toBeVisible()
})

// --- Acceso a la pantalla de selección ---

test('sin sesión, la pantalla de selección lleva al login', async ({ page }) => {
  await page.goto('/friendly/join')
  await expect(page).toHaveURL('/login')
})

test('con sesión pero sin sala elegida, vuelve al menú', async ({ page }) => {
  await seed_session(page)
  await page.goto('/friendly/join')
  await expect(page).toHaveURL('/home')
  await expect(page.getByRole('heading', { name: 'Menú principal' })).toBeVisible()
})

// --- Selección de jugadores y comportamientos ---

test('muestra los jugadores del club y el estado inicial del equipo', async ({ page }) => {
  await open_join_page(page)
  await expect(page.getByRole('heading', { name: 'Tus jugadores (7)' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tu equipo (0/6)' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Titulares (0/3)' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Suplentes (0/3)' })).toBeVisible()
  await expect(confirm_button(page)).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('Faltan 6 jugador(es) por elegir.')
})

test('cada jugador pasa a titulares o suplentes y muestra su comportamiento', async ({ page }) => {
  await open_join_page(page)
  await pick(page, 'Ana', 'Titular')
  await pick(page, 'Dani', 'Suplente')
  await expect(page.getByRole('heading', { name: 'Titulares (1/3)' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Suplentes (1/3)' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tu equipo (2/6)' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tus jugadores (5)' })).toBeVisible()
  await expect(page.getByLabel('Comportamiento de Ana')).toHaveValue('')
  await choose_behavior(page, 'Ana', 'Defensa')
  await expect(page.getByLabel('Comportamiento de Ana')).toHaveValue('behavior-defense')
})

test('no permite más de 3 titulares', async ({ page }) => {
  await open_join_page(page)
  for (const name of starters) await pick(page, name, 'Titular')
  await expect(page.getByRole('heading', { name: 'Titulares (3/3)' })).toBeVisible()
  await expect(row(page, 'Dani').getByRole('button', { name: 'Titular', exact: true })).toBeDisabled()
  await expect(row(page, 'Dani').getByRole('button', { name: 'Suplente', exact: true })).toBeEnabled()
})

test('Quitar devuelve el jugador a la lista de disponibles', async ({ page }) => {
  await open_join_page(page)
  await pick(page, 'Ana', 'Titular')
  await row(page, 'Ana').getByRole('button', { name: 'Quitar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tu equipo (0/6)' })).toBeVisible()
  await expect(row(page, 'Ana').getByRole('button', { name: 'Titular', exact: true })).toBeVisible()
})

test('no permite confirmar sin los 6 jugadores', async ({ page }) => {
  await open_join_page(page)
  for (const name of starters) await pick(page, name, 'Titular')
  for (const name of ['Dani', 'Eva']) await pick(page, name, 'Suplente')
  for (const name of [...starters, 'Dani', 'Eva']) await choose_behavior(page, name, team[name])
  await expect(confirm_button(page)).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('Faltan 1 jugador(es) por elegir.')
})

test('no permite confirmar si a un jugador le falta el comportamiento', async ({ page }) => {
  await open_join_page(page)
  await pick_team(page)
  for (const name of [...starters, 'Dani', 'Eva']) await choose_behavior(page, name, team[name])
  await expect(confirm_button(page)).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('Asigná un comportamiento a 1 jugador(es).')
  await choose_behavior(page, 'Fito', team.Fito)
  await expect(confirm_button(page)).toBeEnabled()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('con menos de 6 jugadores creados avisa y no deja confirmar', async ({ page }) => {
  await page.route('**/api/players', (route) => route.fulfill({ json: players.slice(0, 3) }))
  await open_join_page(page)
  await expect(page.getByRole('heading', { name: 'Tus jugadores (3)' })).toBeVisible()
  await expect(page.getByText('Necesitás al menos 6 jugadores creados')).toBeVisible()
  await pick(page, 'Ana', 'Titular')
  await expect(confirm_button(page)).toBeDisabled()
})

test('un error al cargar los jugadores permite reintentar', async ({ page }) => {
  let failing = true
  await page.route('**/api/players', (route) => (
    failing
      ? route.fulfill({ status: 500, json: { detail: 'Servidor caído', error_code: 'INTERNAL_SERVER_ERROR' } })
      : route.fulfill({ json: players })
  ))
  await open_join_page(page)
  await expect(page.getByRole('alert')).toContainText('Servidor caído')
  failing = false
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tus jugadores (7)' })).toBeVisible()
})

test('una sesión vencida al cargar los jugadores lleva al login', async ({ page }) => {
  await page.route('**/api/players', (route) => route.fulfill({ status: 401, json: { detail: 'Sesión vencida', error_code: 'UNAUTHORIZED' } }))
  await open_join_page(page).catch(() => {})   // la navegación al login interrumpe la ayuda: es lo esperado
  await expect(page).toHaveURL('/login')
  expect(await stored_session(page)).toBeNull()
})

// --- Confirmar ---

test('confirmar envía el POST con token, código y plantilla, informa el éxito y vuelve al menú', async ({ page }) => {
  const requests = await mock_join(page, 200, joined)
  await open_join_page(page)
  await fill_team(page)
  await expect(page.getByRole('heading', { name: 'Tu equipo (6/6)' })).toBeVisible()
  await expect(confirm_button(page)).toBeEnabled()
  await confirm_button(page).click()
  const notice = page.getByRole('dialog')
  await expect(notice.getByRole('heading', { name: '¡Te uniste al amistoso!' })).toBeVisible()
  await expect(notice.getByRole('alert')).toContainText('Te uniste correctamente')
  expect(requests).toHaveLength(1)
  expect(requests[0].method).toBe('POST')
  expect(requests[0].url).toMatch(new RegExp(`/api/friendly/rooms/${ROOM_ID}/join$`))
  expect(requests[0].headers.authorization).toBe(`Bearer ${session.access_token}`)
  expect(requests[0].body).toEqual(expected_body)
  await notice.getByRole('button', { name: 'Volver al menú' }).click()
  await expect(page).toHaveURL('/home')
})

test('bloquea Confirmar mientras espera al servidor', async ({ page }) => {
  let respond
  const response = new Promise((resolve) => { respond = resolve })
  await page.route('**/api/friendly/rooms/*/join', async (route) => {
    await response
    await route.fulfill({ json: joined })
  })
  await open_join_page(page)
  await fill_team(page)
  await confirm_button(page).click()
  await expect(page.getByRole('button', { name: 'Uniéndote…' })).toBeDisabled()
  respond()
  await expect(page.getByRole('dialog').getByRole('heading', { name: '¡Te uniste al amistoso!' })).toBeVisible()
})

test('código de sala inválido (404) avisa y permite ingresar otro sin perder la selección', async ({ page }) => {
  const requests = []
  await page.route('**/api/friendly/rooms/*/join', async (route) => {
    requests.push({ url: route.request().url(), body: route.request().postDataJSON() })
    if (route.request().url().includes(ROOM_ID)) {
      await route.fulfill({ status: 404, json: { detail: 'Sala no encontrada o codigo incorrecto', error_code: 'NOT_FOUND' } })
    } else {
      await route.fulfill({ json: { ...joined, roomId: OTHER_ROOM_ID } })
    }
  })
  await open_join_page(page)
  await fill_team(page)
  await confirm_button(page).click()
  const notice = page.getByRole('dialog')
  await expect(notice.getByRole('heading', { name: 'La sala no existe' })).toBeVisible()
  await expect(notice.getByRole('alert')).toContainText('no son válidos')
  await notice.getByRole('button', { name: 'Ingresar otro código' }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Unirse a un amistoso' })).toBeVisible()
  await fill_modal(page, OTHER_ROOM_ID, 'ZZZ999')
  await expect(page.getByText(`Sala: ${OTHER_ROOM_ID}`)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tu equipo (6/6)' })).toBeVisible()
  await confirm_button(page).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: '¡Te uniste al amistoso!' })).toBeVisible()
  expect(requests).toHaveLength(2)
  expect(requests[1].url).toMatch(new RegExp(`/${OTHER_ROOM_ID}/join$`))
  expect(requests[1].body.code).toBe('ZZZ999')
})

test('sala completa (400) informa que no puede unirse', async ({ page }) => {
  await mock_join(page, 400, { detail: 'La sala esta completa o fue iniciada.', error_code: 'BAD_REQUEST' })
  await open_join_page(page)
  await fill_team(page)
  await confirm_button(page).click()
  const notice = page.getByRole('dialog')
  await expect(notice.getByRole('heading', { name: 'Sala completa' })).toBeVisible()
  await expect(notice.getByRole('alert')).toContainText('No podés unirte')
  await expect(notice.getByRole('button', { name: 'Volver a seleccionar' })).toHaveCount(0)
  await notice.getByRole('button', { name: 'Volver al menú' }).click()
  await expect(page).toHaveURL('/home')
})

test('jugadores no seleccionables (400) avisan y permiten elegir de nuevo', async ({ page }) => {
  let players_requests = 0
  await page.route('**/api/players', (route) => {
    players_requests++
    return route.fulfill({ json: players })
  })
  const detail = 'Al menos un jugador seleccionado no pertenece a tu club o no esta disponible.'
  await mock_join(page, 400, { detail, error_code: 'BAD_REQUEST' })
  await open_join_page(page)
  await fill_team(page)
  await confirm_button(page).click()
  const notice = page.getByRole('dialog')
  await expect(notice.getByRole('heading', { name: 'Selección no válida' })).toBeVisible()
  await expect(notice.getByRole('alert')).toContainText(detail)
  const before = players_requests   // la carga inicial puede hacerse más de una vez en desarrollo
  await notice.getByRole('button', { name: 'Volver a seleccionar' }).click()
  await expect(page.getByRole('heading', { name: 'Tus jugadores (7)' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tu equipo (0/6)' })).toBeVisible()
  await expect(confirm_button(page)).toBeDisabled()
  await expect.poll(() => players_requests).toBeGreaterThan(before)   // recargó los jugadores
})

test('datos no válidos (422) avisan y conservan la selección', async ({ page }) => {
  await mock_join(page, 422, { detail: [{ loc: ['body'], msg: 'Field required', type: 'missing' }], error_code: 'VALIDATION_ERROR' })
  await open_join_page(page)
  await fill_team(page)
  await confirm_button(page).click()
  const notice = page.getByRole('dialog')
  await expect(notice.getByRole('heading', { name: 'Datos no válidos' })).toBeVisible()
  await notice.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Tu equipo (6/6)' })).toBeVisible()
})

test('un error de conexión avisa y permite reintentar', async ({ page }) => {
  await page.route('**/api/friendly/rooms/*/join', (route) => route.abort())
  await open_join_page(page)
  await fill_team(page)
  await confirm_button(page).click()
  const notice = page.getByRole('dialog')
  await expect(notice.getByRole('heading', { name: 'No se pudo unir' })).toBeVisible()
  await expect(notice.getByRole('alert')).toContainText('No se pudo conectar con el servidor')
  await notice.getByRole('button', { name: 'Cerrar' }).click()
  await expect(confirm_button(page)).toBeEnabled()
})

test('Escape no cierra los avisos: hay que elegir una de sus acciones', async ({ page }) => {
  await page.route('**/api/friendly/rooms/*/join', (route) => route.abort())
  await open_join_page(page)
  await fill_team(page)
  await confirm_button(page).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'No se pudo unir' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'No se pudo unir' })).toBeVisible()
})

test('un 401 al confirmar borra la sesión y lleva al login', async ({ page }) => {
  await mock_join(page, 401, { detail: 'Sesión inválida o vencida', error_code: 'UNAUTHORIZED' })
  await open_join_page(page)
  await fill_team(page)
  await confirm_button(page).click()
  await expect(page).toHaveURL('/login')
  expect(await stored_session(page)).toBeNull()
})