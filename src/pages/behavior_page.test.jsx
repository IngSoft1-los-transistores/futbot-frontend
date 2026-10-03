import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BehaviorPage from './behavior_page.jsx'
import * as sessionModule from '../auth/session'
import * as apiModule from '../api/behaviors'
import userEvent from '@testing-library/user-event';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../api/behaviors', () => ({
    get_behaviors: vi.fn(),
}));

vi.mock('../auth/session', () => ({
    read_session: vi.fn(),
}));

describe('BehaviorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {}); // Silencio de errores en la consola durante las pruebas
  });

  it('Debe redirigir a /login si no hay sesión', () => {
    vi.mocked(sessionModule.read_session).mockReturnValue(null);
    render(<BehaviorPage />);
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    expect(apiModule.get_behaviors).not.toHaveBeenCalled(); // no se llama a la api
    });

  it('Muestra el estado de carga inicialmente', () => {
    vi.mocked(sessionModule.read_session).mockReturnValue({ access_token: 'fake-token' });
    vi.mocked(apiModule.get_behaviors).mockImplementation(
        () => new Promise(() => {})
    ); // Simula una promesa pendiente
    render(<BehaviorPage />);
    expect(apiModule.get_behaviors).toHaveBeenCalledTimes(1); // se llama a la api
    expect(screen.getByText(/CARGANDO TÁCTICAS.../i)).toBeInTheDocument();
    expect(screen.queryByText('Comportamientos')).not.toBeInTheDocument();
  });

  it('Debe mostrar un mensaje de error si la API devuelve un error', async () => {
    vi.mocked(sessionModule.read_session).mockReturnValue({ access_token: 'fake-token' });
    vi.mocked(apiModule.get_behaviors).mockRejectedValue(new Error('500'));

    render(<BehaviorPage />);
    expect(apiModule.get_behaviors).toHaveBeenCalledTimes(1); // se hizo una unica petición a la API
    expect(await screen.findByText(/Error al obtener los comportamientos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
    expect(screen.queryByText(/CARGANDO TÁCTICAS/i)).not.toBeInTheDocument(); // ya no está cargando
  })

  it('Debe mostrar la lista de comportamientos si la API responde correctamente', async () => {
    const mockBehaviors = [
      { id: 1, name: 'Comportamiento 1', code: 'C1', isDefault: true },
      { id: 2, name: 'Comportamiento 2', code: 'C2', isDefault: false },
    ];
    vi.mocked(sessionModule.read_session).mockReturnValue({
        access_token: 'fake-token',
    });
    vi.mocked(apiModule.get_behaviors).mockResolvedValue(mockBehaviors);
    render(<BehaviorPage/>);
    expect(apiModule.get_behaviors).toHaveBeenCalledTimes(1); // se hizo una unica petición a la API
    expect(await screen.findByText('Comportamiento 1')).toBeInTheDocument();
    expect(screen.getByText('Comportamiento 2')).toBeInTheDocument();
    expect(screen.getByText('Preprogramado')).toBeInTheDocument();
    expect(screen.getByText('Propio')).toBeInTheDocument();
    expect(screen.queryByText(/Error al obtener/i)).not.toBeInTheDocument(); // no muestra error
  })
  
  it('Debe mostrar la lista de comportamientos vacía si la API responde con una lista vacía', async () => {
    vi.mocked(sessionModule.read_session).mockReturnValue({
        access_token: 'fake-token',
    });
    vi.mocked(apiModule.get_behaviors).mockResolvedValue([]);
    render(<BehaviorPage/>);
    expect(await screen.findByText('Comportamientos')).toBeInTheDocument();
    expect(screen.queryByText('Comportamiento 1')).not.toBeInTheDocument();
  });

  it('Debe mostrar un mensaje de error si la API devuelve un error 401', async () => {
    vi.mocked(sessionModule.read_session).mockReturnValue({
        access_token: 'fake-token',
    });
    vi.mocked(apiModule.get_behaviors).mockRejectedValue(new Error('401'));
    render(<BehaviorPage />);
    expect(apiModule.get_behaviors).toHaveBeenCalledTimes(1);

    expect(await screen.findByText(/Error al obtener los comportamientos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
    expect(screen.queryByText(/CARGANDO TÁCTICAS/i)).not.toBeInTheDocument(); // ya no está cargando
  });

  it ('El boton "Reintentar" recarga la página', async () => {
    vi.mocked(sessionModule.read_session).mockReturnValue({
        access_token: 'fake-token',
    });
    vi.mocked(apiModule.get_behaviors).mockRejectedValue(new Error('500'));
    render(<BehaviorPage />);
    expect(await screen.findByText(/Error al obtener los comportamientos/i)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /Reintentar/i });
    const user = userEvent.setup();
    await user.click(retryButton);
    
  });
})