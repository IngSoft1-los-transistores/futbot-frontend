import { useEffect, useRef, useState } from "react";

export function use_league_waiting_socket(league_id, club_id){
    const [room_info, setRoom_info] = useState(null);
    const [error, setError] = useState(null);
    const [redirect_url, setRedirect_url] = useState(null);
    const socket_ref = useRef(null);

    useEffect(() =>{
        if (!league_id || !club_id) return;

        const ws_protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws_host = import.meta.env.VITE_ES_URL || window.location.host;
        const ws_url = `${ws_protocol}//${ws_host}/ws/league/${league_id}/waiting?club_id=${club_id}`;
        
        const ws = new WebSocket(ws_url);
        socket_ref.current = ws;

        ws.onmessage = (event) => {
            try{
                const data = JSON.parse(event.data);

                if(data.type === 'room.info' || data.type === 'club_joined_waiting' || data.type === 'club_left_waiting') {
                    setRoom_info((prev) => {
                        if (data.type === 'room_info') return data;
                        return {
                            ...prev,
                            current_participants: data.current_participants ?? prev?.current_participants,
                            can_start: (data.current_participants ?? prev?.current_participants) >= (prev?.min_clubs || 0)
                        };
                    });
                } else if (data.type === 'league_started') {
                    setRedirect_url(data.redirect_url);
                } else if (data.type === 'league_cancelled') {
                    setRedirect_url(data.redirect_url);
                } else if (data.type === 'error') {
                    setError(data.message);
                }
            } catch (err) {
                console.error('Error al procesar mensaje de WS:', err);
            }
        };
        
        ws.onerror = () => {
            setError('Error en la conexion con el servidor.');
        }
        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        };
    }, [league_id, club_id]);

    const send_action = (action) => {
        if (socket_ref.current && socket_ref.current.readyState === WebSocket.OPEN) {
            socket_ref.current.send(JSON.stringify({ action }));
        }
    };

    return { room_info, error, redirect_url, send_action};
}