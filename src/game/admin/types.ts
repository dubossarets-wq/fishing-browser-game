export type Permission =
  | 'unlock.all'
  | 'economy.unlimited'
  | 'debug.god-mode'
  | 'debug.no-wear'
  | 'debug.no-bait-cost'
  | 'debug.instant-catch'
  | 'debug.no-travel-cost'
  | 'debug.overlay'

export interface AdminState {
  isAdmin: boolean
  godMode: boolean
  noWear: boolean
  noBaitCost: boolean
  instantCatch: boolean
  noTravelCost: boolean
  showDebugOverlay: boolean
}

export function createDefaultAdminState(): AdminState {
  return {
    isAdmin: false,
    godMode: false,
    noWear: false,
    noBaitCost: false,
    instantCatch: false,
    noTravelCost: false,
    showDebugOverlay: false,
  }
}

// Single choke point for every admin-only bypass — nothing else in the
// codebase should branch on `player.isAdmin` directly.
export const PermissionService = {
  has(admin: AdminState, permission: Permission): boolean {
    if (!admin.isAdmin) return false
    switch (permission) {
      case 'unlock.all': return true
      case 'economy.unlimited': return true
      case 'debug.god-mode': return admin.godMode
      case 'debug.no-wear': return admin.noWear
      case 'debug.no-bait-cost': return admin.noBaitCost
      case 'debug.instant-catch': return admin.instantCatch
      case 'debug.no-travel-cost': return admin.noTravelCost
      case 'debug.overlay': return admin.showDebugOverlay
      default: return false
    }
  },
}

export const ADMIN_UNLOCK_CODE = 'zaton-dev-2026'
