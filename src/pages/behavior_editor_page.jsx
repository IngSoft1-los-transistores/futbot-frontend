import {useState, useEffect} from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { create_behavior } from '../api/behaviors.js'

const PLANTILLA_INICIAL = `# Presión alta
# Ejemplo inicial: adapta las decisiones de tu jugador.

def comportamiento(tiene_balon, rival_cerca):
    """Define una decisión según la situación de juego."""
    if tiene_balon:
        if rival_cerca:
            return "pasar"
        return "avanzar"
    
    # Sin balón, recuperar la iniciativa.
    return "presionar"
def behavior(player):
    # Lógica de comportamiento del jugador
    decision = comportamiento(player.has_ball, player.is_opponent_nearby)
    return decision

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
    <div className="min-h-screen p-4 md:p-8 text-gray-200 font-sans">
      
      {/* HEADER  */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="inline-block bg-[#1f3328] px-4 py-2 rounded-md text-sm text-gray-400 mb-4">
          &larr; Laboratorio táctico / Comportamientos / <span className="text-[#d4a373]">Crear</span>
        </div>

        <div className="bg-[#1f3328] rounded-xl p-6 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border border-gray-500 rounded flex items-center justify-center text-xl font-mono">
              {'<>'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Crear comportamiento</h1>
              <p className="text-gray-400 text-sm mt-1">Define la lógica de tu jugador y prepara una nueva estrategia para el campo.</p>
            </div>
          </div>
          <div className="text-xs tracking-widest text-gray-500">
            LABORATORIO / PYTHON
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: Formulario y Editor */}
        <div className="lg:col-span-2 bg-[#1f3328] rounded-xl p-6 flex flex-col shadow-lg">
          
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6">
              {error}
            </div>
          )}

          <form id="behavior-form" onSubmit={handle_save} className="flex-1 flex flex-col">
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">
                Nombre del comportamiento <span className="text-[#d4a373]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#112219] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-[#d4a373]"
                placeholder="Ej: Presión alta"
              />
              <p className="text-gray-400 text-xs mt-2">Usa un nombre que te ayude a identificar la estrategia.</p>
            </div>

            <div className="flex-1 flex flex-col mb-4">
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold">
                  Código Python <span className="text-[#d4a373]">*</span>
                </label>
                <span className="text-xs tracking-widest text-gray-500">PLANTILLA INICIAL</span>
              </div>
              
              {/* ENVOLTORIO DEL EDITOR (Para simular editor de código) */}
              <div className="border border-gray-700 rounded-lg overflow-hidden flex flex-col h-[450px]">
                {/* Barra superior del editor */}
                <div className="bg-[#15291e] px-4 py-2 flex justify-between items-center border-b border-gray-700">
                  <span className="text-sm text-gray-300 flex items-center gap-2">
                    📄 comportamiento.py
                  </span>
                  <span className="text-xs text-[#d4a373]">Python</span>
                </div>
                
                {/* Editor Monaco */}
                <div className="flex-1 relative">
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
              </div>
            </div>
          </form>
        </div>

        {/* COLUMNA DERECHA: Guía Rápida */}
        <div className="bg-[#1f3328] rounded-xl p-6 shadow-lg h-fit">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            📖 Guía rápida
          </h3>
          <p className="text-sm text-gray-300 mb-6 border-b border-gray-700 pb-6">
            Cada comportamiento define cómo toma decisiones tu jugador en el campo.
          </p>

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-white mb-1">Nombra tu estrategia</h4>
              <p className="text-sm text-gray-400">Elige un nombre claro para reconocerla cuando configures a tus jugadores.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Escribe tu lógica</h4>
              <p className="text-sm text-gray-400">Parte del ejemplo o reemplázalo por tu propio código Python. Cuida la indentación.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Guarda el comportamiento</h4>
              <p className="text-sm text-gray-400">Una vez creado, podrás encontrarlo en la sección Comportamientos.</p>
            </div>
          </div>

          <div className="mt-8 bg-[#2a4535] p-4 rounded-lg border border-gray-600">
            <span className="text-xs tracking-widest text-[#d4a373] block mb-2">SOBRE EL EJEMPLO</span>
            <p className="text-xs text-gray-300">
              La plantilla es orientativa. Adapta los parámetros y las acciones a tu estrategia.
            </p>
          </div>
        </div>
      </div>

      {/* BARRA DE INFERIOR */}
      <div className="max-w-6xl mx-auto mt-6 flex justify-between items-center">
        <span className="text-sm text-gray-500">Se guardará en tus comportamientos.</span>
        <div className="flex gap-4">
          <button 
            type="button"
            onClick={() => navigate('/behaviors')}
            className="px-6 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="behavior-form"
            disabled={is_saving || !name.trim() || !code.trim()}
            className="px-6 py-2 rounded bg-[#d4a373] text-black font-semibold hover:bg-[#e0b488] transition-colors disabled:opacity-50"
          >
            {is_saving ? 'Guardando...' : '+ Crear comportamiento'}
          </button>
        </div>
      </div>

    </div>
  )
}
