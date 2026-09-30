const SESSION_KEY = 'futbot.session'

export function save_session(session) {
  const { access_token, refresh_token, club_id, expires_at } = session ?? {}
  if (!Number.isFinite(expires_at) || expires_at * 1000 <= Date.now() ||
      typeof access_token !== 'string' || !access_token.trim() ||
      typeof refresh_token !== 'string' || !refresh_token.trim() ||
      typeof club_id !== 'string' || !club_id.trim()) {
    throw new Error('La respuesta de inicio de sesión está incompleta.')
  }
  // Nunca almacenar la contraseña. La sesión persiste al cerrar el navegador.
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ access_token, refresh_token, club_id, expires_at }))
  } catch {
    throw new Error('No se pudo guardar la sesión. Habilitá el almacenamiento del navegador e intentá nuevamente.')
  }
}

export function read_session() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY))
    if (!Number.isFinite(session?.expires_at) || session.expires_at * 1000 <= Date.now()) {
      clear_session()
      return null
    }
    return typeof session?.access_token === 'string' && session.access_token.trim() &&
      typeof session?.refresh_token === 'string' && session.refresh_token.trim() &&
      typeof session?.club_id === 'string' && session.club_id.trim() ? session : null
  } catch {
    return null
  }
}

export function clear_session() {
  localStorage.removeItem(SESSION_KEY)
}