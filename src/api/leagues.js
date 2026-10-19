import { request } from "./client";
import { read_session } from "../auth/session";

// Convierte un jugador al formato de selección de escuadra.
function to_squad_selection(player) {
  return {
    player_id: String(player.playerId),
    behavior_id: String(player.behaviorId),
  };
}

export async function createLeague({
  name,
  is_private,
  password,
  min_clubs,
  max_clubs,
  match_duration,
  starters,
  substitutes,
}) {
  const session = read_session();

  if (!session) {
    throw new Error("Tu sesión venció. Iniciá sesión de nuevo.");
  }
  const req = {
    name: name.trim(),
    is_private: is_private === true,
    min_clubs: Number(min_clubs),
    max_clubs: Number(max_clubs),
    match_duration: Number(match_duration),
    starters: starters.map(to_squad_selection),
    substitutes: substitutes.map(to_squad_selection),
  };

  // Si es privada, agrega contraseña
  if (is_private === true) {
    req.password = String(password);
  }

  return request("/api/leagues", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(req),
  });
}