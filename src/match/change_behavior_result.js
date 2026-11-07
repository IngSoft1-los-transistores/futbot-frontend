export function parse_change_result(raw) {
  let message
  try {
    message = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
  if (message?.type === 'behavior_change_accepted') return { ok: true }
  if (message?.type === 'error') {
    return { ok: false, message: message.message || 'No se pudo cambiar el comportamiento' }
  }
  return null
}