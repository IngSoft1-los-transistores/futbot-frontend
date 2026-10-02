import { useState } from 'react';
import Modal from '../components/modal';
import CreatePlayerForm from '../components/create_player_form';

const gold_button =
  'h-10 rounded-[5px] bg-[#C9973B] px-3 text-xs font-semibold uppercase tracking-wide text-[#1A1A1A] hover:bg-[#D9A94D]';

// Componente principal de la pagina de jugadores se encarga de mostrar el boton "Crear Jugador" y los modales de formulario y exito
export default function ModalPlayer() {
  const [show_form, setShow_form] = useState(false);
  const [show_success, setShow_success] = useState(false);

  // Al crear el jugador se cierra el formulario y se muestra el pop-up de éxito
  const handle_success = () => {
    setShow_form(false);
    setShow_success(true);
  };

  // Renderizamos el boton de crear jugador y los modales de formulario
  return (
    <div>
      <section className="max-w-md rounded-lg border border-[#2F5A36] bg-[#1E3B24] p-4">
        <h2 className="text-lg text-[#C9D6C5] font-bold">Jugadores</h2>
        <p className="mb-3 mt-1 font-mono text-xs text-[#C9D6C5]">
          Creá jugadores para tu club y repartí sus atributos.
        </p>
        <button type="button" onClick={() => setShow_form(true)} className={gold_button}>
          Crear Jugador
        </button>
      </section>

      {/* Modal de formulario para crear un jugador, se muestra cuando show_form es true */}
      {show_form && (
        <Modal
          title="Crear Jugador"
          description="Elegí un nombre y repartí exactamente 300 puntos entre los cinco atributos (20 a 100 cada uno)."
          onClose={() => setShow_form(false)}
        >
          <CreatePlayerForm
            onSuccess={handle_success}
            onCancel={() => setShow_form(false)}
          />
        </Modal>
      )}
      {/* Pop-up de exito que se muestra al crear un jugador correctamente */}
      {show_success && (
        <Modal title="Listo" onClose={() => setShow_success(false)}>
          <p className="mb-4">Jugador creado con éxito</p>
          <div className="flex justify-end">
            <button type="button" onClick={() => setShow_success(false)} className={gold_button}>
              Aceptar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}