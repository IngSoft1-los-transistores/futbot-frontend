// import { useState } from 'react'
import EstadoBackend from './components/EstadoBackend'
import './styles/tokens.css'
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/register_page';
import FriendlyRoomPage from './pages/FriendlyRoomPage'
import MatchPage from './pages/MatchPage'

const Navbar = () => (
  <nav id="top-bar">
    <h1 className="text-2xl font-bold tracking-wider"> ⚽︎ Futbot</h1>
  </nav>
);

function App() {
//  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      {/* Defino la imagen de fondo */}
      <div className="bg-[url('/BackFutBot.png')]  bg-cover bg-center bg-no-repeat min-h-screen w-full text-white font-sans">
        
        <Navbar /> 
        
        <div className="container mx-auto p-4">
          <Routes>
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/amistosos/:roomId/sala" element={<FriendlyRoomPage />} />
            <Route path="/partidos/:matchId" element={<MatchPage />} />
          </Routes>
        </div>
      {/* Verifica el circuito frontend -> backend -> base de datos. */}
      <EstadoBackend />

      </div>
    </BrowserRouter>
  )
}

export default App
