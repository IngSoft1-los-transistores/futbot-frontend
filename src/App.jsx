import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import RegisterPage from './pages/register_page'
import EstadoBackend from './components/EstadoBackend'
import './App.css'

function Registration() {
  return (
    <div className="registration-layout bg-[url('/BackFutBot.png')] bg-cover bg-center bg-no-repeat text-white font-sans">
      <nav id="top-bar">
        <h1 className="text-2xl font-bold tracking-wider">⚽︎ Futbot</h1>
      </nav>
      <main className="container mx-auto p-4 flex justify-center">
        <RegisterPage />
      </main>
      <EstadoBackend />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Navigate to="/auth/register" replace />} />
        <Route path="/auth/register" element={<Registration />} />
        <Route path="/auth/login" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<div className="auth-layout"><Login /></div>} />
        <Route path="/home" element={<div className="auth-layout"><Home /></div>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
