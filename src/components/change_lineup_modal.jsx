import { useState } from 'react'
import { update_league_lineup } from '../api/leagues'
import './change_lineup_modal.css'

const MAX_PLAYERS = 3

export default function ChangeLineupModal({ league_id, squad, onClose, onSuccess }) {
  const [starters, set_starters] = useState(
    squad.filter((player) => player.role === 'starter')
  )
  const [substitutes, set_substitutes] = useState(
    squad.filter((player) => player.role === 'substitute')
  )
  const [saving, set_saving] = useState(false)
  const [error, set_error] = useState(null)

  const is_valid = starters.length === 3 && substitutes.length === 3

  function move_to_substitutes(player) {
    set_starters((current) =>
      current.filter((item) => item.player_id !== player.player_id)
    )
    set_substitutes((current) => [...current, player])
  }

  function move_to_starters(player) {
    set_substitutes((current) =>
      current.filter((item) => item.player_id !== player.player_id)
    )
    set_starters((current) => [...current, player])
  }

  async function handle_submit(event) {
    event.preventDefault()
    if (!is_valid || saving) return

    set_saving(true)
    set_error(null)

    try {
      await update_league_lineup(league_id, {
        starters: starters.map((player) => player.player_id),
        substitutes: substitutes.map((player) => player.player_id),
      })

      onSuccess(
        'Alineación actualizada. Se implementará a partir de tu siguiente partido'
      )
      onClose()
    } catch (request_error) {
      set_error(request_error.message)
    } finally {
      set_saving(false)
    }
  }

  return (
    <div className="lineup-modal-overlay" role="dialog" aria-modal="true">
      <div className="lineup-modal">
        <form onSubmit={handle_submit}>

          <div role="dialog" aria-modal="true" aria-labelledby="lineup-title">
            <form onSubmit={handle_submit}>
              <h2 id="lineup-title">Cambiar alineación</h2>
              <div>
                <h3>Titulares: {starters.length}/3</h3>
                {starters.map((player) => (
                  <div key={player.player_id}>
                    <span>{player.name}</span>
                    <button
                      type="button"
                      onClick={() => move_to_substitutes(player)}
                      aria-label={`Mover ${player.name} a suplentes`}
                    >
                      ↓
                    </button>
                  </div>
                ))}
              </div>

            <div>
              <h3>Suplentes: {substitutes.length}/3</h3>

              {substitutes.map((player) => (
                <div key={player.player_id}>
                  <span>{player.name}</span>
                  <button
                    type="button"
                    onClick={() => move_to_starters(player)}
                    aria-label={`Mover ${player.name} a titulares`}
                  >
                    ↑
                  </button>
                </div>
              ))}
            </div>
            {!is_valid && (
              <p role="alert">
                Debes seleccionar exactamente 3 titulares y 3 suplentes.
              </p>
            )}

            {error && <p role="alert">{error}</p>}

            <p>
              El cambio regirá desde tu próximo partido.
            </p>

            <button type="button" onClick={onClose}>
              Cancelar
            </button>

            <button type="submit" disabled={!is_valid || saving}>
              {saving ? 'Guardando...' : 'Confirmar alineación'}
            </button>
        </form>
      </div>
    </form>
    </div>
  </div>
  )
}
