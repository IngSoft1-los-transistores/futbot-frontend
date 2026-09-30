import { useState } from 'react';
import { validate_player } from './player_validation';

const INITIAL_FORM = {
  name: '',
  power: '',
  agility: '',
  control: '',
  speed: '',
  strength: '',
};

const ATTRIBUTES = [
  { key: 'power', label: 'Power' },
  { key: 'agility', label: 'Agility' },
  { key: 'control', label: 'Control' },
  { key: 'speed', label: 'Speed' },
  { key: 'strength', label: 'Strength' },
];

// Componente de formulario para crear un jugador
export default function CreatePlayerForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState({});

  const { errors } = validate_player(form);

  // Maneja el cambio de los campos del formulario
  const handle_change = (e) => {
    const { name, value } = e.target;

    // En los atributos se descarta todo lo que no sea un dígito
    const newValue = name === 'name' ? value : value.replace(/\D/g, '');

    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  // Cuando el usuario sale de un campo, guardamos que ese campo ya fue tocado 
  const handle_blur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };


  const handle_submit = (e) => {
    e.preventDefault();
    // TODO: reemplazar por la llamada a createPlayer (api/players.js)
    console.log(form);
  };

  // Se calcula la suma de los atributos para mostrarla en el formulario
  const sum = ATTRIBUTES.reduce((total, attr) => {
    const value = form[attr.key];

    if (value !== '') {
      return total + Number(value);
    }

    return total;
  }, 0);

  return (
    <form onSubmit={handle_submit}>
      <div>
        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handle_change}
          onBlur={handle_blur}
        />
        {touched.name && errors.name && <p role="alert">{errors.name}</p>}
      </div>
      {/*  Renderizamos los cinco atributos usando un map sobre el array ATTRIBUTES */}
      {ATTRIBUTES.map((attr) => (
        <div key={attr.key}>
          <label htmlFor={attr.key}>{attr.label}</label>
          <input
            id={attr.key}
            name={attr.key}
            type="text"
            inputMode="numeric"
            value={form[attr.key]}
            onChange={handle_change}
            onBlur={handle_blur}
          />
          {/* Mostramos el error del atributo solo si el campo fue tocado y hay un error */}
          {touched[attr.key] && errors[attr.key] && (
            <p role="alert">{errors[attr.key]}</p>
          )}
        </div>
      ))}

      <p>Suma: {sum} / 300</p>
      {errors.sum && <p role="alert">{errors.sum}</p>}

      <button type="submit" disabled={Object.keys(errors).length > 0}>
        Crear
      </button>

      <button type="button" onClick={onCancel}>
        Cancelar
      </button>
    </form>
  );
}