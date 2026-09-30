/*
 * Cliente HTTP del backend de FutBot.
*/

import { getToken } from './token'

// Vite solo expone al navegador las variables que empiezan con VITE_
export const API_URL = import.meta.env.VITE_API_URL

// Error de la API con el formato que define el contrato.
export class ApiError extends Error {
  constructor(status, detail, errorCode) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.errorCode = errorCode
  }
}

/*
 * Hace una peticion a la API y devuelve el JSON de la respuesta
 * @param {string} path Ruta de la API, incluido el prefijo /api
 * @param {RequestInit} options Opciones de fetch (method, body, headers)
 */
export async function request(path, options = {}) {
  const token = getToken()
  const respuesta = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  const cuerpo = respuesta.status === 204 ? null : await respuesta.json()

  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      cuerpo?.detail ?? 'Error desconocido',
      cuerpo?.error_code ?? 'UNKNOWN_ERROR',
    )
  }

  return cuerpo
}

// Consulta el estado del backend y de la base de datos.
export function getHealth() {
  return request('/api/health')
}

