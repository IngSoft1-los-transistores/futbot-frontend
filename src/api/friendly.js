const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function createFriendlyRoom(squadData, token) {
    const response = await fetch(`${API_URL}/api/friendly/rooms`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(squadData),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || 'Error al crear la sala de amistoso');
    }

    return data;
}

// Funciones auxiliares para obtener la lista de jugadores y comportamientos del usuario
export async function getMyPlayers(token) {
    const response = await fetch(`${API_URL}/api/players/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Error al cargar jugadores');
    return response.json();
}

export async function getMyBehaviors(token){
    const response = await fetch(`${API_URL}/api/behaviors/me`, {
        heraders: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Error al cargar comportamientos');
    return response.json();
}