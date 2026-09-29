import { chromium, expect, test } from '@playwright/test'

const session = { expires_at: Math.floor(Date.now() / 1000) + 300, access_token: 'old-access', refresh_token: 'old-refresh', club_id: 'club' }

async function mock_auth(context, expired = false) {
  await context.route('**/api/auth/login', route => route.fulfill({ json: session }))
  await context.route('**/api/auth/me', route => {
    const invalid = expired && route.request().headers().authorization === 'Bearer old-access'
    return route.fulfill({ status: invalid ? 401 : 200, json: invalid ? { detail: 'Vencido' } : { user_id: 'user', club_id: 'club' } })
  })
  await context.route('**/api/auth/logout', route => route.fulfill({ status: 204 }))
}

test('conserva sesión vigente al cerrar el navegador y recuerda el logout', async ({ baseURL: base_url }, test_info) => {
  const profile = test_info.outputPath('browser-profile')
  let context = await chromium.launchPersistentContext(profile)
  try {
    await mock_auth(context)
    let page = await context.newPage()
    await page.goto(`${base_url}/login`)
    await page.getByLabel('Email').fill('user@example.com')
    await page.getByLabel('Contraseña').fill('password')
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Menú principal' })).toBeVisible()
    await context.close()

    context = await chromium.launchPersistentContext(profile)
    await mock_auth(context)
    let refresh_count = 0
    await context.route('**/api/auth/refresh', route => {
      refresh_count++
      expect(route.request().postDataJSON()).toEqual({ refresh_token: 'old-refresh' })
      return route.fulfill({ status: 401, json: { detail: 'Deshabilitado' } })
    })
    page = await context.newPage()
    await page.goto(`${base_url}/`)
    await expect(page.getByRole('heading', { name: 'Menú principal' })).toBeVisible()
    expect(refresh_count).toBe(0)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('futbot.session')))).toEqual(session)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(`${base_url}/login`)
    await context.close()

    context = await chromium.launchPersistentContext(profile)
    await mock_auth(context)
    page = await context.newPage()
    await page.goto(`${base_url}/home`)
    await expect(page).toHaveURL(`${base_url}/login`)
    expect(await page.evaluate(() => localStorage.getItem('futbot.session'))).toBeNull()
  } finally {
    await context.close()
  }
})

test('dos pestañas comparten la sesión y ambas reflejan el logout', async ({ page, context }) => {
  await mock_auth(context)
  let refresh_count = 0
  await context.route('**/api/auth/refresh', async route => {
    refresh_count++
    await new Promise(resolve => setTimeout(resolve, 100))
    await route.fulfill({ status: 401, json: { detail: 'Deshabilitado' } })
  })
  await page.goto('/login')
  await page.evaluate(value => localStorage.setItem('futbot.session', JSON.stringify(value)), session)
  const second = await context.newPage()
  await Promise.all([page.goto('/home'), second.goto('/home')])
  await expect(page.getByRole('heading', { name: 'Menú principal' })).toBeVisible()
  await expect(second.getByRole('heading', { name: 'Menú principal' })).toBeVisible()
  expect(refresh_count).toBe(0)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL('/login')
  await expect(second).toHaveURL('/login')
})
