import { useState } from 'react';
import {registerUser} from '../api/auth';

function RegisterForm() {
  const [formulario, setFormulario] = useState({
    username: '',
    email: '',
    password: '',
    clubName: '',
    avatar: '',
  });

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  function handleInputChange(evento) {
    const { name, value } = evento.target;

    setFormulario({
      ...formulario,
      [name]: value,
    });
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');

    const payload   = {
        username: formulario.username,
        email: formulario.email,
        password: formulario.password,
        club_name: formulario.clubName,
        avatar_url: formulario.avatar,
    };

    try {
      const response = await registerUser(payload);
      setMensaje('Usuario registrado correctamente');

      setFormulario({
        username: '',
        email: '',
        password: '',
        clubName: '',
        avatar: '',
      });
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="mb-8">
        <p className="text-[#f0a95b] font-mono text-xs mb-2 tracking-widest">⬡ INCORPORACIÓN A CLUB TÁCTICO</p>
        <h3 className="text-3xl font-bold mb-2">Prepara tu nueva temporada</h3>
        <p className="text-gray-400 text-sm font-mono">Crea tu cuenta de FutBot y toma el control del banquillo.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Campo de Usuario  */}
          <div>
            <label htmlFor="username" className="label-futbot">Nombre de usuario</label>
            <div className="input-container">
              <input 
                id="username"
                name="username"
                type="text" 
                value={formulario.username}
                onChange={handleInputChange}
                placeholder="nombre_de_usuario" 
                className="input-field" 
                required
              />
            </div>
          </div>
          {/* Campo Correo */}
          <div>
            <label htmlFor="email" className="label-futbot">Correo</label>
            <div className="input-container">
              <input 
                id="email"
                name="email"
                type="email" 
                value={formulario.email}
                onChange={handleInputChange}
                placeholder="nombre@club.com" 
                className="input-field" 
                required
              />
            </div>
          </div>
        </div>
        {/* Segunda Fila */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Campo nombre del club */}
          <div>
            <label htmlFor="clubName" className="label-futbot">Nombre del Club</label>
            <div className="input-container">
              <input 
                id="clubName"
                name="clubName"
                type="text" 
                value={formulario.clubName}
                onChange={handleInputChange}
                placeholder="Nombre de tu club" 
                className="input-field" 
                required
              />
            </div>
          </div>
            {/* Campo Contraseña */}
          <div>
            <label htmlFor="password" className="label-futbot">Contraseña</label>
            <div className="input-container">
              <input 
                id="password"
                name="password"
                type="password" 
                value={formulario.password}
                onChange={handleInputChange}
                placeholder="••••••••" 
                className="input-field" 
                required
              />
            </div>
          </div>
        </div>

        {/* Selector de Avatar */}
        <div>
          <label className="block text-green-300 font-mono text-xs mb-2 uppercase">Avatar</label>
          <div className="bg-[#0f2217] border border-green-800 rounded-md p-3 flex items-center justify-between">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button key={num} type="button" className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${num === 1 ? 'bg-[#f0a95b] text-black' : 'border border-green-700 text-green-600 hover:border-[#f0a95b]'}`}>
                  {num}
                </button>
              ))}
            </div>
            <span className="text-green-600">→</span>
          </div>
        </div>

        {/* Botón */}
        <div className="pt-2">
          <button type="submit" className="w-full bg-[#f0a95b] hover:bg-[#e0984a] text-black font-bold py-4 rounded-md transition-colors flex items-center justify-center gap-2">
            CREAR MI CUENTA <span>→</span>
          </button>
          {/* Mensaje de éxito */}
          {mensaje && (
            <div className="mt-4 p-3 bg-green-900/30 border border-green-800 rounded text-green-400 text-sm font-mono text-center">
              {mensaje}
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm font-mono text-center">
              {error}
            </div>
          )}
        </div>
      </form>
    </div>
    
  );
}

export default RegisterForm;
