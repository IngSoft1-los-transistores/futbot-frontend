// import { useState } from 'react'
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Navbar = () => (
   <nav className="bg-[#233a24] text-white px-6 py-4 shadow-lg flex items-center gap-3">
    <span className="text-3xl">⚽︎ </span>
    <h1 className="text-2xl font-bold tracking-wider">Futbot</h1>
  </nav>
);

function App() {
//  const [count, setCount] = useState(0)
const Register = () => <h2>Pantalla de Registro </h2>;

  return (
    <BrowserRouter>
      {/* Defino la imagen de fondo */}
      <div className="bg-[url('/FondoVerde.jpg')] bg-repeat min-h-screen w-full text-white font-sans">
        
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
