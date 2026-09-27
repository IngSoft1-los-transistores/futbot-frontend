// Access token storage. The login screen stores the token with setToken().
const TOKEN_KEY = 'futbot_access_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Storage unavailable (e.g. private mode): the session won't persist.
  }
}
