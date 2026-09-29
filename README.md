# FutBot — Frontend

Interfaz web del juego FutBot: registro de clubes, creación de jugadores y comportamientos, ligas, amistosos y visualización del partido en vivo en 2D.

Este repositorio maneja únicamente la interacción con el usuario. Toda la lógica de negocio y los datos viven en [futbot-backend](https://github.com/IngSoft1-los-transistores/futbot-backend).

**Materia:** Ingeniería de Software I· **Equipo:** Los Transistores

> ⚠️ **Esta aplicación no funciona sola: necesita el backend corriendo.** Antes de levantar el frontend, seguir las instrucciones de instalación del repositorio [futbot-backend](https://github.com/IngSoft1-los-transistores/futbot-backend).


## Stack

| Componente | Tecnología |
|---|---|
| Librería | React 19 |
| Build y dev server | Vite |
| Lenguaje | JavaScript |
| Ruteo | React Router |
| HTTP | axios |
| Tiempo real | WebSocket nativo del navegador |
| Linter | ESLint |

## Requisitos previos

- **Node.js 20 LTS o superior** — verificar con `node --version`
- **npm** (viene con Node) — verificar con `npm --version`
- **El backend corriendo** en `http://localhost:8000`

## Instalación

**1. Clonar el repositorio**

```bash
git clone https://github.com/IngSoft1-los-transistores/futbot-frontend.git
cd futbot-frontend
```

**2. Instalar las dependencias**

```bash
npm install
```

Esto crea la carpeta `node_modules/`, que no se sube al repositorio.

**3. Configurar las variables de entorno**

```bash
cp .env.example .env
```

Los valores por defecto funcionan si el backend corre en el puerto 8000. Si se cambió el puerto del backend, hay que actualizar las dos variables.

## Correr la aplicación

Con el backend ya levantado, en otra terminal:

```bash
npm run dev
```

La aplicación queda en **http://localhost:5173**.

Para detenerla: `Ctrl+C`.

### Otros comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo, con recarga automática al guardar |
| `npm run build` | Compila la versión de producción en `dist/` |
| `npm run preview` | Sirve lo compilado, para verificar el build |
| `npm run lint` | Revisa el código con ESLint |

## Variables de entorno

| Variable | Para qué | Valor en desarrollo |
|---|---|---|
| `VITE_API_URL` | URL base de la API REST | `http://localhost:8000` |
| `VITE_WS_URL` | URL base de los WebSockets | `ws://localhost:8000` |

El prefijo `VITE_` es obligatorio: Vite sólo expone al navegador las variables que lo llevan.

El archivo `.env` no se sube al repositorio. Se usa `.env.example` como plantilla.



## Comunicación con el backend

| Canal | Para qué |
|---|---|
| **HTTP** | Autenticación, plantel, comportamientos, ligas y amistosos |
| **WebSocket** | Partido en vivo, lobby de liga y sala de amistoso |


## Problemas frecuentes

**Errores de CORS en la consola del navegador**
El backend no está autorizando este origen. Verificar que `CORS_ORIGINS` en el `.env` del backend incluya `http://localhost:5173`.

Antes de tocar el `.env` del backend, **mirar en qué puerto arrancó Vite**: si el 5173 está ocupado (por ejemplo por otra instancia que quedó abierta), Vite salta al 5174 sin más aviso que su propia línea `Local:`. El backend sólo autoriza el 5173, así que todas las peticiones fallan con un error de CORS que parece un problema del backend y no lo es. La solución es cerrar la instancia vieja y levantar de nuevo en el 5173, no agregar el 5174 a `CORS_ORIGINS`.

**`Failed to fetch` o `ERR_CONNECTION_REFUSED`**
El backend no está corriendo, o `VITE_API_URL` apunta al puerto equivocado.

**Cambié el `.env` y no toma los valores nuevos**
Vite lee las variables de entorno al arrancar. Hay que reiniciar `npm run dev`.

**El WebSocket se cierra apenas se conecta**
El token es inválido o falta. El navegador no permite enviar el header `Authorization` en un WebSocket, por eso el token viaja como query param (`?token=...`).

**El puerto 5173 está ocupado**

```bash
npm run dev -- --port 5174
```

Si se cambia el puerto, hay que agregar el nuevo origen a `CORS_ORIGINS` en el backend.

### Pruebas de interfaz

```bash
### requiere node.js 20 o mayor para instalar playwright.
node -v

### en caso de tener una version menor que 20

sudo apt remove nodejs
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

npx playwright install chromium
npm run test:e2e
```

