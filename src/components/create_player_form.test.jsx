import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CreatePlayerForm from './create_player_form';


const ATTRS = [/Power/i, /Agility/i, /Control/i, /Speed/i, /Strength/i];

// LLenar el formulario con un nombre y un array de valores para los atributos
async function fill_form(user, name, values) {
  if (name) await user.type(screen.getByLabelText(/Nombre/i), name);
  for (let i = 0; i < ATTRS.length; i++) {
    await user.type(screen.getByLabelText(ATTRS[i]), values[i]);
  }
}

// Tests para el componente CreatePlayerForm
describe('CreatePlayerForm', () => {
  it('Debe renderizar el nombre y los cinco atributos', () => {
    render(<CreatePlayerForm />);
    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
    ATTRS.forEach((attr) => {
      expect(screen.getByLabelText(attr)).toBeInTheDocument();
    });
  });

  it('Debe arrancar con el botón Crear deshabilitado y sin errores visibles', () => {
    render(<CreatePlayerForm />);
    expect(screen.getByRole('button', { name: /Crear/i })).toBeDisabled();
    expect(screen.queryByText(/obligatorio/i)).not.toBeInTheDocument();
  });

  it('Debe mostrar el error de un campo recién después de tocarlo', async () => {
    const user = userEvent.setup();
    render(<CreatePlayerForm />);
    await user.click(screen.getByLabelText(/Nombre/i));
    await user.tab();
    expect(screen.getByText(/nombre es obligatorio/i)).toBeInTheDocument();
  });

  it('No debe permitir caracteres no numéricos en los atributos', async () => {
    const user = userEvent.setup();
    render(<CreatePlayerForm />);
    const power = screen.getByLabelText(/Power/i);
    await user.type(power, 'a1b2');
    expect(power).toHaveValue('12');
  });

  it('Debe mantener el botón deshabilitado con un nombre de menos de 3 caracteres', async () => {
    const user = userEvent.setup();
    render(<CreatePlayerForm />);
    await fill_form(user, 'Jo', ['60', '60', '60', '60', '60']);
    expect(screen.getByRole('button', { name: /Crear/i })).toBeDisabled();
  });

  it('Debe mantener el botón deshabilitado con un atributo menor a 20', async () => {
    const user = userEvent.setup();
    render(<CreatePlayerForm />);
    await fill_form(user, 'Messi', ['19', '60', '60', '60', '101']);
    expect(screen.getByRole('button', { name: /Crear/i })).toBeDisabled();
  });

  it('Debe mantener el botón deshabilitado si la suma no es 300', async () => {
    const user = userEvent.setup();
    render(<CreatePlayerForm />);
    await fill_form(user, 'Messi', ['59', '60', '60', '60', '60']);
    expect(screen.getByRole('button', { name: /Crear/i })).toBeDisabled();
    expect(screen.getByText(/exactamente 300/i)).toBeInTheDocument();
  });

  it('Debe habilitar el botón con datos válidos y suma 300', async () => {
    const user = userEvent.setup();
    render(<CreatePlayerForm />);
    await fill_form(user, 'Messi', ['60', '60', '60', '60', '60']);
    expect(screen.getByRole('button', { name: /Crear/i })).toBeEnabled();
  });

  it('Debe mostrar la suma parcial mientras se completan los atributos', async () => {
    const user = userEvent.setup();
    render(<CreatePlayerForm />);
    await user.type(screen.getByLabelText(/Power/i), '50');
    await user.type(screen.getByLabelText(/Agility/i), '40');
    expect(screen.getByText('Suma: 90 / 300')).toBeInTheDocument();
  });

  it('Debe llamar a onCancel al presionar Cancelar', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<CreatePlayerForm onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});