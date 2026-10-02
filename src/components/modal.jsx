import { useEffect } from 'react';

// Contenedor genérico de modal: se cierra con la tecla Escape
export default function Modal({ title, description, onClose, children }) {
  useEffect(() => {
    const on_key_down = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    // Agregamos un listener para cerrar el modal con la tecla Escape
    document.addEventListener('keydown', on_key_down);
    return () => document.removeEventListener('keydown', on_key_down);
  }, [onClose]);
// Renderizamos el modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-lg border border-[#2F5A36] bg-[#1E3B24] p-6 text-white shadow-2xl"
      >
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && (
          <p className="mb-5 mt-1 font-mono text-xs text-[#C9D6C5]">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}