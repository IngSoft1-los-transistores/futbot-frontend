import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/client'
import { read_session, save_session } from '../auth/session'

export default function Login() {
  const [email, set_email] = useState('')
  const [password, set_password] = useState('')
  const [error, set_error] = useState('')
  const [status, set_status] = useState('idle')
  const submitting = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (read_session()) navigate('/home', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => navigate('/home', { replace: true }), 1000)
    return () => clearTimeout(timer)
  }, [status, navigate])

  async function handle_submit(event) {
    event.preventDefault()
    if (submitting.current || !event.currentTarget.reportValidity()) return
    submitting.current = true
    set_error('')
    set_status('loading')
    try {
      const session = await login({ email, password })
      save_session(session)
      set_password('')
      set_status('success')
    } catch (cause) {
      set_error(cause.status === 401
        ? `Credenciales inválidas.${cause.message && cause.message !== 'Credenciales inválidas' ? ` ${cause.message}` : ''}`
        : cause.status
          ? cause.message
          : cause instanceof TypeError
            ? 'No se pudo conectar con el servidor. Intentá nuevamente.'
            : cause.message || 'No se pudo iniciar sesión. Intentá nuevamente.')
      set_status('idle')
      submitting.current = false
    }
  }

  const busy = status !== 'idle'
  return (
    <main className="card">
      <p className="brand">FutBot</p>
      <h1>Iniciar sesión</h1>
      <p className="intro">Ingresá a tu cuenta para gestionar tu club.</p>
      <form onSubmit={handle_submit} aria-busy={status === 'loading'}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username"
          required value={email} onChange={(event) => set_email(event.target.value)} disabled={busy} />
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password"
          required value={password} onChange={(event) => set_password(event.target.value)} disabled={busy} />
        {error && <p className="message error" role="alert">{error}</p>}
        {status === 'success' && <p className="message success" role="status">Sesión iniciada correctamente. Redirigiendo al menú principal…</p>}
        <button type="submit" disabled={busy}>
          {status === 'loading' ? 'Iniciando sesión…' : status === 'success' ? 'Sesión iniciada' : 'Iniciar sesión'}
        </button>
      </form>
      <p className="auth-switch">
        ¿No tenés cuenta? <Link to="/auth/register">Crear cuenta</Link>
      </p>
    </main>
  )
}
