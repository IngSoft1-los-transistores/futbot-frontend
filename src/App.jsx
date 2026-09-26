// import { useState } from 'react'
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Navbar = () => (
  <nav id="top-bar">
    <h1 className="text-2xl font-bold tracking-wider"> ⚽︎ Futbot</h1>
  </nav>
);

function App() {
//  const [count, setCount] = useState(0)
const Register = () => <h2>Pantalla de Registro </h2>;

  return (
    <BrowserRouter>
      {/* Defino la imagen de fondo */}
      <div className="bg-[url('/BackFutBot.png')]  bg-cover bg-center bg-no-repeat min-h-screen w-full text-white font-sans">
        
        <Navbar /> 
        
        <div className="container mx-auto p-4">
          <Routes>
            <Route path="/auth/register" element={<Register />} />
          </Routes>
        </div>

      </div>
    </BrowserRouter>
  )
}

export default App
