import { useGameLoop } from '@/app/useGameLoop'
import { useNetworkInit } from '@/app/useNetworkInit'
import { useUiStore } from '@/app/uiStore'
import { TopBar } from '@/ui/hud/TopBar'
import { RightPanel } from '@/ui/hud/RightPanel'
import { RodDock } from '@/ui/rods/RodDock'
import { RodSetupModal } from '@/ui/rods/RodSetupModal'
import { FightOverlay } from '@/ui/rods/FightOverlay'
import { CastButton } from '@/ui/rods/CastButton'
import { BaseModal } from '@/ui/base/BaseModal'
import { SocialPanel } from '@/ui/social/SocialPanel'
import { AuthModal } from '@/ui/social/AuthModal'
import { HelpModal, MenuModal } from '@/ui/hud/HelpMenuModals'
import { SettingsModal } from '@/ui/hud/SettingsModal'
import { AdminPanel } from '@/ui/admin/AdminPanel'
import { DevOverlay } from '@/ui/admin/DevOverlay'
import { FishingCanvas } from '@/engine/canvas/FishingCanvas'
import { SceneBackdrop } from '@/engine/canvas/SceneBackdrop'

function App() {
  useGameLoop()
  useNetworkInit()
  const modal = useUiStore((s) => s.modal)

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopBar />

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="relative isolate flex-1 min-h-0 bg-black">
            <SceneBackdrop />
            <FishingCanvas />
            <FightOverlay />
            <CastButton />
            <DevOverlay />
          </div>
          <RodDock />
        </div>

        <div className="w-[300px] shrink-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <RightPanel />
          </div>
          <div className="h-48 shrink-0">
            <SocialPanel />
          </div>
        </div>
      </div>

      {modal === 'setup' && <RodSetupModal />}
      {modal === 'base' && <BaseModal />}
      {modal === 'help' && <HelpModal />}
      {modal === 'menu' && <MenuModal />}
      {modal === 'auth' && <AuthModal />}
      {modal === 'settings' && <SettingsModal />}
      {modal === 'admin' && <AdminPanel />}
    </div>
  )
}

export default App
