import { read_session } from '../auth/session.js';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';


export const get_behaviors = async () => {
  const session = read_session()
  const response = await fetch(`${API_URL}/api/behaviors`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('401'); 
    }
    // Lanza un error general
    throw new Error(`Error del servidor: ${response.status}`);
  }
  return response.json();
}

