const MIN_CLUBS = 3;
const MAX_CLUBS = 30;
const REQUIRED_PLAYERS = 3;
const MIN_PASSWORD_LENGTH = 6;

// Verifica si el valor es numerico y no es una cadena
function is_valid_integer(value) {
  if (typeof value === "number") { 
    return Number.isSafeInteger(value);
  }

  if (typeof value !== "string") { 
    return false;
  }

  const normalized = value.trim();

  //Valida que sea un numero entero positivo
  return (
    /^\d+$/.test(normalized) &&
    Number.isSafeInteger(Number(normalized))
  );
}
function validate_password(password) {
  if (typeof password !== "string") {
    return "La contraseña debe ser un texto";
  }

  if (password.length === 0) {
    return "La contraseña no puede estar vacia";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }

  if (/\s/.test(password)) {
    return "La contraseña no puede contener espacios";
  }

  return null;
}

export function validate_league({
  name,
  password,
  is_private,
  min_clubs,
  max_clubs,
  match_duration,
  starters,
  substitutes,
}) {
  const errors = {};
  // Chqueo que name sea no vacio
  if (typeof name !== "string" || !name.trim()) { 
    errors.name = "El nombre es obligatorio";
  }

  // Si es privada, la contraseña es obligatoria
  if (is_private === true) {
    const pass_error = validate_password(password);
    if (pass_error) {
      errors.password = pass_error;
    }
  }

  // Chequo el minimo de clubes 
  if (!is_valid_integer(min_clubs)) { 
    errors.min_clubs = "Ingresar un número entero valido";
  } else if (Number(min_clubs) < MIN_CLUBS) { 
    errors.min_clubs = `Ingresar al menos ${MIN_CLUBS} clubes`;
  }

  // Chequeo el maximo de clubes y chequeo maximo respecto de minimo.
  if (!is_valid_integer(max_clubs)) { 
    errors.max_clubs = "Ingresar un número entero valido";
  } else {
    const maxClubs = Number(max_clubs);

    if (maxClubs < MIN_CLUBS) { 
      errors.max_clubs = `Ingresar al menos ${MIN_CLUBS} clubes`;
    } else if (maxClubs > MAX_CLUBS) { 
      errors.max_clubs = `Ingresar como maximo ${MAX_CLUBS} clubes`;
    } else if (
      is_valid_integer(min_clubs) &&
      maxClubs < Number(min_clubs) 
    ) {
      errors.max_clubs =
        `Ingresar un número mayor o igual a ${Number(min_clubs)} `;
    }
  }
  // Verifica que la duración sea un entero valido y positivo.
  if (!is_valid_integer(match_duration)) {
    errors.match_duration =
      "La duración debe ser un número entero valido";
  } else if (Number(match_duration) <= 0) {
    errors.match_duration =
      "La duración debe ser mayor que cero";
  }
  // Verifica que haya exactamente tres titulares.
  if (
    !Array.isArray(starters) ||
    starters.length !== REQUIRED_PLAYERS
  ) {
    errors.starters =
      `Debes seleccionar exactamente ${REQUIRED_PLAYERS} titulares`;
  }
  // Verifica que haya exactamente tres suplentes.
  if (
    !Array.isArray(substitutes) ||
    substitutes.length !== REQUIRED_PLAYERS
  ) {
    errors.substitutes =
      `Debes seleccionar exactamente ${REQUIRED_PLAYERS} suplentes`;
  }

  // Verifica que tengan id, que no haya jugadores repetidos y que c/u tenga comportamiento.
  if (Array.isArray(starters) && Array.isArray(substitutes)) {
    const players = [...starters, ...substitutes];
    const ids = players.map((player) => player && player.playerId);

    if (ids.some((id) => id === undefined || id === null || id === "")) { 
      errors.playerIds =
        "Todos los jugadores deben tener un identificador";
    } else if (new Set(ids).size !== ids.length) { 
      errors.duplicatePlayers =
        "No se puede seleccionar un jugador mas de una vez";
    }

    if (players.some((player) => !player || !player.behaviorId)) { 
      errors.behaviorIds =
        "Todos los jugadores deben tener un comportamiento asignado";
    }
  }

  return errors; 
}
