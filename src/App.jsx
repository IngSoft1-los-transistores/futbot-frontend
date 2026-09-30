// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EstadoBackend from './components/EstadoBackend'
import Amistosos from './pages/Amistosos'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <EstadoBackend />
      <Routes>
        <Route path="/amistosos" element={<Amistosos />} />
        {/* Podes agregar mas rutas cuando los otros devs las terminen */}
      </Routes>
    </BrowserRouter>
  )
}

export default App