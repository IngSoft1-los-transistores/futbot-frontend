// import { useState } from 'react'
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/register_page';
import LandingPage from './pages/landing_page';
import Home from './pages/Home';

const Navbar = () => (
  <nav id="top-bar">
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-md bg-[#e09a4b] flex items-center justify-center" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </svg>
      </span>
      <div>
        <p className="font-plex-sans text-lg leading-tight">FutBot</p>
        <p className="font-plex-mono text-[11px] text-[#b5c2b3]">laboratorio / presión alta v4</p>
      </div>
    </div>
    <p className="flex items-center gap-2 font-plex-mono text-[10px] tracking-widest uppercase text-[#d8dccf]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#7fae7f]" aria-hidden="true" />
      Vestuario digital abierto
    </p>
  </nav>
);

function App() {
//  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      {/* Defino la imagen de fondo */}
      <div className="bg-[url('/BackFutBot.png')]  bg-cover bg-center bg-no-repeat min-h-dvh w-full flex flex-col text-white font-sans">
        
        <Navbar /> 
        
        <div className="container mx-auto p-4 flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/auth/register" element={<RegisterPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
