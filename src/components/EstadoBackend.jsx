import { useEffect, useState } from 'react'
import { API_URL, getHealth } from '../api/client'


// Indicador del estado de la conexion con el backend y su base de datos.
// El endpoint /api/health ejecuta una consulta real contra la base.
function EstadoBackend() {
  const [conectado, setConectado] = useState(null)
  const [detalle, setDetalle] = useState('')

  useEffect(() => {
    getHealth()
      .then((salud) => {
        const isDbOk = salud.database_connected ?? salud.databaseConnected ?? false;

        setConectado(isDbOk)
        setDetalle(
          isDbOk
            ? 'API y base de datos respondiendo'
            : 'La API responde pero la base no',
        )
      })
      .catch((error) => {
        setConectado(false)
        setDetalle(
          error.status
            ? `${error.errorCode}: ${error.message}`
            : 'No se pudo contactar al backend (revisar que este levantado y el CORS)',
        )
      })
  }, [])

  const colores = {
    null: '#9ca3af',
    true: '#16a34a',
    false: '#dc2626',
  }

  const etiquetas = {
    null: 'Consultando...',
    true: 'Backend conectado',
    false: 'Backend no disponible',
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.75rem 1rem',
        margin: '1rem auto',
        maxWidth: '32rem',
        border: `1px solid ${colores[conectado]}`,
        borderRadius: '0.3rem',
        fontSize: '0.875rem',
        textAlign: 'left',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '0.7rem',
          height: '0.7rem',
          borderRadius: '50%',
          background: colores[conectado],
          flexShrink: 0,
        }}
      />
      <div>
        <strong style={{ color: colores[conectado] }}>
          {etiquetas[conectado]}
        </strong>
        <div style={{ opacity: 0.75 }}>{detalle}</div>
        <div style={{ opacity: 0.5, fontSize: '0.75rem' }}>{API_URL}</div>
      </div>
    </div>
  )
}

export default EstadoBackend
