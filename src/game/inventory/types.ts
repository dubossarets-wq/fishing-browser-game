export interface InventoryStack {
  id: string
  itemId: string
  category: string
  quantity: number
  condition: number // 0-100, 100 = pristine; relevant for durable gear
}

export interface InventoryState {
  stacks: InventoryStack[]
}

function makeId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_${Math.random()}`
}

export function addToInventory(inv: InventoryState, itemId: string, category: string, quantity: number, condition = 100): InventoryState {
  const isDurable = category === 'rod' || category === 'reel'
  if (!isDurable) {
    const existing = inv.stacks.find((s) => s.itemId === itemId)
    if (existing) {
      return {
        stacks: inv.stacks.map((s) => (s.itemId === itemId ? { ...s, quantity: s.quantity + quantity } : s)),
      }
    }
  }
  return { stacks: [...inv.stacks, { id: makeId(), itemId, category, quantity, condition }] }
}

export function removeFromInventory(inv: InventoryState, itemId: string, quantity: number): InventoryState {
  const existing = inv.stacks.find((s) => s.itemId === itemId)
  if (!existing) return inv
  if (existing.quantity <= quantity) {
    return { stacks: inv.stacks.filter((s) => s.itemId !== itemId) }
  }
  return {
    stacks: inv.stacks.map((s) => (s.itemId === itemId ? { ...s, quantity: s.quantity - quantity } : s)),
  }
}

export function removeStackById(inv: InventoryState, stackId: string): InventoryState {
  return { stacks: inv.stacks.filter((s) => s.id !== stackId) }
}

export function getQuantity(inv: InventoryState, itemId: string): number {
  return inv.stacks.filter((s) => s.itemId === itemId).reduce((sum, s) => sum + s.quantity, 0)
}
