import { useEffect, useState, useRef, useCallback } from 'react';

export function use_league_lobby_socket(league_id, token) {
    const [lobby_data, set_lobby_data] = useState(null);
    const [loading, set_loading] = useState(true);
    const [error, set_error] = useState(null);
    const [last_toast, set_last_toast] = useState(null);
    const ws_ref = useRef(null);
    const reconnect_timeout_ref = useRef(null);

    // Fetch inicial HTTP
    const fetch_lobby = useCallback(async () => {
        try {
            set_loading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/leagues/${league_id}/live-lobby`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('No se pudo cargar el lobby de la liga.');
            }
            const data = await response.json();
            set_lobby_data(data);
            set_error(null);
        } catch (err) {
            set_error(err.message);
        } finally {
            set_loading(false);
        }
    }, [league_id, token]);

    useEffect(() => {
        fetch_lobby();
    }, [fetch_lobby]);

    // Conexión WebSocket para tiempo real y reconexión automática
    useEffect(() => {
        if (!league_id || !token) return;

        let is_connected = true;

        const connect_ws = () => {
            const ws_base = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
            const ws_url = `${ws_base}/api/leagues/${league_id}/ws?token=${token}`;
            const ws = new WebSocket(ws_url);
            ws_ref.current = ws;

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    // Mutar estado global de la vista en tiempo real
                    if (message.type === 'match_update' || message.type === 'league_update' || message.payload) {
                        set_lobby_data(prev => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                ...message.payload
                            };
                        });

                        // Mostrar Toast/Alerta sutil si hay resultado nuevo
                        if (message.toast || message.payload?.finished_match_summary) {
                            set_last_toast(message.toast || message.payload.finished_match_summary);
                            setTimeout(() => set_last_toast(null), 5000);
                        }
                    }
                } catch (e) {
                    console.error('Error procesando mensaje WS:', e);
                }
            };

            ws.onclose = () => {
                if (is_connected) {
                    // Reconexión automática ante microcortes tras 3 segundos
                    reconnect_timeout_ref.current = setTimeout(() => {
                        connect_ws();
                    }, 3000);
                }
            };

            ws.onerror = (err) => {
                console.error('Error en WebSocket de liga:', err);
                ws.close();
            };
        };

        connect_ws();

        return () => {
            is_connected = false;
            if (ws_ref.current) {
                ws_ref.current.close();
            }
            if (reconnect_timeout_ref.current) {
                clearTimeout(reconnect_timeout_ref.current);
            }
        };
    }, [league_id, token]);

    return { lobby_data, loading, error, last_toast };
}