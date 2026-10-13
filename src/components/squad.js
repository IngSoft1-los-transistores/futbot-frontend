const SLOTS_PER_ROLE = 3

const empty_slot = () => ({ playerId: '', behaviorId: '' })

export function empty_squad() {
  return {
    starters: Array.from({ length: SLOTS_PER_ROLE }, empty_slot),
    substitutes: Array.from({ length: SLOTS_PER_ROLE }, empty_slot),
  }
}

const is_filled = (value) => value !== '' && value != null

// Every slot has a player and a behavior, and no player is repeated.
export function is_squad_complete(squad) {
  const slots = [...squad.starters, ...squad.substitutes]

  return (
    slots.length === SLOTS_PER_ROLE * 2 &&
    slots.every((slot) => is_filled(slot.playerId) && is_filled(slot.behaviorId)) &&
    new Set(slots.map((slot) => String(slot.playerId))).size === slots.length
  )
}

// Same shape as the backend's mySquad, built from the local selection.
export function squad_entries(squad, players, behaviors) {
  const name_of = (items, id) =>
    items.find((item) => String(item.id) === String(id))?.name ?? ''

  const entries = (slots, role) =>
    slots.map((slot) => ({
      playerId: String(slot.playerId),
      name: name_of(players, slot.playerId),
      role,
      behaviorId: String(slot.behaviorId),
      behaviorName: name_of(behaviors, slot.behaviorId),
    }))

  return [
    ...entries(squad.starters, 'starter'),
    ...entries(squad.substitutes, 'substitute'),
  ]
}
