import { useState } from 'react'
import Modal from './modal'

export default function ChangeBehaviorModal({ starters, behaviors, on_confirm, on_close }) {
  const [selected_behaviors, set_selected_behaviors] = useState(() =>
    Object.fromEntries(starters.map((p) => [p.id, p.behavior_id ? p.behavior_id : ''])),
  )

  const changes = starters
    .filter((p) => selected_behaviors[p.id] && selected_behaviors[p.id] !== p.behavior_id)
    .map((p) => ({ playerId: p.id, behaviorId: selected_behaviors[p.id] }))

  return (
    <Modal title="Cambiar comportamiento" description="Rige desde el próximo tick" onClose={on_close}>
      {starters.map((p) => (
        <label key={p.id} className="change-behavior-row">
          {p.name}
          <select
            className="change-behavior-select"
            aria-label={`Comportamiento de ${p.name}`}
            value={selected_behaviors[p.id]}
            onChange={(e) => set_selected_behaviors({ ...selected_behaviors, [p.id]: e.target.value })}
          >
            <option value="">Elegir…</option>
            {behaviors.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
      ))}
      <div className="change-behavior-actions">
        <button
          type="button"
          className="change-behavior-btn change-behavior-btn--primary"
          disabled={changes.length === 0}
          onClick={() => on_confirm(changes)}
        >
          Confirmar
        </button>
        <button type="button" className="change-behavior-btn" onClick={on_close}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}