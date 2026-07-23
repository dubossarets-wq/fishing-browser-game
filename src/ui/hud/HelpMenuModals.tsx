import { useUiStore } from '@/app/uiStore'
import { useGameStore } from '@/app/store'
import { useNetworkStore } from '@/app/networkStore'
import { Button, Panel } from '@/ui/common/Panel'
import { useBackdropClose } from '@/ui/common/useBackdropClose'

export function HelpModal() {
  const closeModal = useUiStore((s) => s.closeModal)
  const backdrop = useBackdropClose(closeModal)
  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-6" {...backdrop}>
      <Panel paper className="w-full max-w-lg p-5" >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Как играть</h2>
            <button onClick={closeModal} className="text-lg opacity-60 hover:opacity-100">✕</button>
          </div>
          <ol className="text-sm space-y-1.5 list-decimal pl-5">
            <li>Нажмите «Настроить» на удочке и соберите снасть: удилище, катушка, леска, крючок, наживка.</li>
            <li>Выберите дистанцию и направление заброса — от этого зависит глубина и тип дна.</li>
            <li>Нажмите «Забросить» и дождитесь поклёвки.</li>
            <li>Когда появится кнопка «ПОДСЕЧКА!» — нажимайте быстро, иначе рыба уйдёт.</li>
            <li>Во время вываживания следите за натяжением лески, регулируйте фрикцион и подматывайте.</li>
            <li>Поймали — положите рыбу в садок, затем продайте её на базе.</li>
            <li>На вырученные деньги покупайте снасти получше и открывайте новые локации.</li>
          </ol>
          <Button className="mt-4" onClick={closeModal}>Понятно</Button>
        </div>
      </Panel>
    </div>
  )
}

export function MenuModal() {
  const closeModal = useUiStore((s) => s.closeModal)
  const openModal = useUiStore((s) => s.openModal)
  const saveNow = useGameStore((s) => s.saveNow)
  const netStatus = useNetworkStore((s) => s.status)
  const logout = useNetworkStore((s) => s.logout)
  const backdrop = useBackdropClose(closeModal)
  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-6" {...backdrop}>
      <Panel paper className="w-full max-w-xs p-5" >
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold mb-2">Меню</h2>
          <Button onClick={() => { void saveNow(); closeModal() }}>Сохранить игру</Button>
          <Button variant="ghost" onClick={() => openModal('settings')}>Настройки</Button>
          {netStatus === 'online' ? (
            <Button variant="ghost" onClick={() => void logout()}>Выйти из аккаунта</Button>
          ) : (
            <Button variant="ghost" onClick={() => openModal('auth')}>Войти / зарегистрироваться</Button>
          )}
          <Button variant="ghost" onClick={closeModal}>Продолжить рыбалку</Button>
        </div>
      </Panel>
    </div>
  )
}
