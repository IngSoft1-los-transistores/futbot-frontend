import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ModalPlayer from './modal_player';
import * as playersApi from '../api/players';

vi.mock('../api/players', () => ({ createPlayer: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

// Test para el componente ModalPlayer
describe('ModalPlayer', () => {
  it('Debe mostrar el botón Crear Jugador y ningún formulario al inicio', () => {
    render(<ModalPlayer />);
    expect(screen.getByRole('button', { name: /Crear Jugador/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Debe abrir el formulario al presionar Crear Jugador', async () => {
    const user = userEvent.setup();
    render(<ModalPlayer />);
    await user.click(screen.getByRole('button', { name: /Crear Jugador/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
  });

  it('Debe cerrar el formulario al presionar Cancelar', async () => {
    const user = userEvent.setup();
    render(<ModalPlayer />);
    await user.click(screen.getByRole('button', { name: /Crear Jugador/i }));
    await user.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Debe mostrar "Jugador creado con éxito" cuando la creación sale bien', async () => {
    const user = userEvent.setup();
    playersApi.createPlayer.mockResolvedValueOnce({});
    render(<ModalPlayer />);

    await user.click(screen.getByRole('button', { name: /Crear Jugador/i }));
    await user.type(screen.getByLabelText(/Nombre/i), 'Messi');
    for (const attr of [/Power/i, /Agility/i, /Control/i, /Speed/i, /Strength/i]) {
      await user.type(screen.getByLabelText(attr), '60');
    }

    // Regex exacta: con el modal abierto también existe el botón "Crear Jugador"
    await user.click(screen.getByRole('button', { name: /^Crear$/i }));

    expect(await screen.findByText(/Jugador creado con éxito/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nombre/i)).not.toBeInTheDocument();
  });
});