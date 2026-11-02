import {useState, useEffect} from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { create_behavior } from '../api/behaviors.js'
import './behavior_editor_page.css'

const PLANTILLA_INICIAL = `# Presión alta
# Ejemplo inicial: adapta las decisiones de tu jugador.

def behavior(player):
    if player.tengo_pelota():
        objetivo = player.encontrar_arco_enemigo()
        player.patear_pelota(objetivo)
    else:
        pelota = player.encontrar_pelota()
        player.correr(pelota)

`

export default function BehaviorEditorPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [code, setCode] = useState(PLANTILLA_INICIAL)

  const [error, setError] = useState(null)
  const [is_saving, set_is_saving] = useState(false)

  // Personalizacion de los colores de editor
  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme('futbot-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#112219', // Verde oscuro del fondo
        'editor.lineHighlightBackground': '#1a3326', // Que resalte de linea actual
      },
    })
  }

  const handle_save = async (e) => {
    e.preventDefault()
    setError(null)
    set_is_saving(true)
    try {
      await create_behavior({ name, code })
      navigate('/behaviors')
    } catch (error) {
      setError(error.message || "Error al guardar comportamiento")
    } finally {
      set_is_saving(false)
    }
  }
  return (
    <div className="behavior-editor">
      <div className="behavior-editor__container">
        
        {/* HEADER */}
        <div className="behavior-editor__breadcrumb">
          &larr; Laboratorio táctico / Comportamientos / <span>Crear</span>
        </div>

        <div className="behavior-editor__header">
          <div className="behavior-editor__header-title">
            <div className="behavior-editor__header-icon">
              {'<>'}
            </div>
            <div>
              <h1>Crear comportamiento</h1>
              <p>Define la lógica de tu jugador y prepara una nueva estrategia para el campo.</p>
            </div>
          </div>
          <div className="behavior-editor__header-badge">
            LABORATORIO / PYTHON
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL (GRILLA) */}
        <div className="behavior-editor__grid">
          
          {/* COLUMNA IZQUIERDA: Formulario y Editor */}
          <div className="behavior-editor__panel behavior-editor__main-panel">
            {error && (
              <div className="behavior-editor__error">
                {error}
              </div>
            )}

            <form id="behavior-form" onSubmit={handle_save} className="behavior-editor__form">
              <div className="behavior-editor__field">
                <label className="behavior-editor__label">
                  Nombre del comportamiento <span>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="behavior-editor__input"
                  placeholder="Ej: Presión alta"
                />
                <p className="behavior-editor__field-hint">Usa un nombre que te ayude a identificar la estrategia.</p>
              </div>

              <div className="behavior-editor__form">
                <div className="behavior-editor__editor-header">
                  <label className="behavior-editor__label" style={{ marginBottom: 0 }}>
                    Código Python <span>*</span>
                  </label>
                  <span className="behavior-editor__editor-badge">PLANTILLA INICIAL</span>
                </div>
                
                {/* ENVOLTORIO DEL EDITOR */}
                <div className="behavior-editor__editor-wrapper">
                  <div className="behavior-editor__editor-topbar">
                    <span>📄 comportamiento.py</span>
                    <span>Python</span>
                  </div>
                  
                  <div className="behavior-editor__editor">
                    <Editor
                      height="100%"
                      language="python"
                      theme="futbot-dark"
                      value={code}
                      onChange={(val) => setCode(val || '')}
                      beforeMount={handleEditorWillMount}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        padding: { top: 16 },
                      }}
                    />
                  </div>

                  <div className="behavior-editor__editor-bottombar">
                    <span>UTF-8</span>
                    <span>Lin. 14, col. 1 &nbsp;&nbsp;&middot;&nbsp;&nbsp; Espacios: 4</span>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* COLUMNA DERECHA: Guía Rápida */}
          <div className="behavior-editor__panel behavior-editor__sidebar">
            <h3>📖 Guía rápida</h3>
            <p className="behavior-editor__sidebar-desc">
              Cada comportamiento define cómo toma decisiones tu jugador en el campo.
            </p>

            <div className="behavior-editor__sidebar-step">
              <h4>Nombra tu estrategia</h4>
              <p>Elige un nombre claro para reconocerla cuando configures a tus jugadores.</p>
            </div>
            
            <div className="behavior-editor__sidebar-step">
              <h4>Escribe tu lógica</h4>
              <p>Parte del ejemplo o reemplázalo por tu propio código Python. Cuida la indentación.</p>
            </div>
            
            <div className="behavior-editor__sidebar-step">
              <h4>Guarda el comportamiento</h4>
              <p>Una vez creado, podrás encontrarlo en la sección Comportamientos.</p>
            </div>

            <div className="behavior-editor__sidebar-note">
              <span>SOBRE EL EJEMPLO</span>
              <p>La plantilla es orientativa. Adapta los parámetros y las acciones a tu estrategia.</p>
            </div>
          </div>
        </div>

        {/* BARRA INFERIOR */}
        <div className="behavior-editor__footer">
          <span className="behavior-editor__footer-text">Se guardará en tus comportamientos.</span>
          <div className="behavior-editor__actions">
            <button 
              type="button"
              onClick={() => navigate('/behaviors')}
              className="behavior-editor__button behavior-editor__button--secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="behavior-form"
              disabled={is_saving || !name.trim() || !code.trim()}
              className="behavior-editor__button"
            >
              {is_saving ? 'Guardando...' : '+ Crear comportamiento'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
