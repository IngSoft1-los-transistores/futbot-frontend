import { clear_session, read_session } from '../auth/session'

/*
 * Cliente HTTP del backend de FutBot.
*/

// Vite solo expone al navegador las variables que empiezan con VITE_
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

// Error de la API con el formato que define el contrato.
export class ApiError extends Error {
  constructor(status, detail, error_code) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.error_code = error_code
  }
}

/*
 * Hace una peticion a la API y devuelve el JSON de la respuesta
 * @param {string} path Ruta de la API, incluido el prefijo /api
 * @param {RequestInit} options Opciones de fetch (method, body, headers)
 */
let signing_out = false

function with_session_lock(operation) {
  // Coordina el cierre de sesión entre pestañas.
  return navigator.locks
    ? navigator.locks.request('futbot.session', operation)
    : operation()
}

function expire_session(session) {
  if (read_session()?.refresh_token === session?.refresh_token) {
    clear_session()
    window.dispatchEvent(new Event('futbot:unauthorized'))
  }
}

async function response_body(response) {
  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) {
    throw new ApiError(response.status, body?.detail ?? 'Error desconocido', body?.error_code)
  }
  return body
}

export async function request(path, options = {}) {
  const { authenticated = true, ...fetch_options } = options
  const session = authenticated ? read_session() : null
  const send = () => {
    const headers = new Headers(fetch_options.headers)
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    if (session) headers.set('Authorization', `Bearer ${session.access_token}`)
    return fetch(`${API_URL}${path}`, { ...fetch_options, headers })
  }
  const response = await send()
  if (response.status === 401 && session && !signing_out) {
    expire_session(session)
  }
  if (authenticated && signing_out) throw new DOMException('Sesión cerrándose', 'AbortError')
  return response_body(response)
}

export async function logout() {
  signing_out = true
  try {
    await with_session_lock(async () => {
      const session = read_session()
      if (!session) return
      // Revoca la sesión compartida antes de borrar los datos locales.
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (response.status !== 401) await response_body(response)
      expire_session(session)
    })
  } finally {
    signing_out = false
  }
}

// Consulta el estado del backend y de la base de datos.
export function get_health() {
  return request('/api/health', { authenticated: false })
}
  //envia credenciales al endpoint
export function login({ email, password }) {
  return request('/api/auth/login', {
    authenticated: false,
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}


export function get_current_user(options = {}) {
  return request('/api/auth/me', options)
}

