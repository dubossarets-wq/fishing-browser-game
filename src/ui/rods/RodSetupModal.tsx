import { useGameStore } from '@/app/store'
import { useUiStore } from '@/app/uiStore'
import { getShopItemById } from '@/game/economy/shopCatalog'
import { BAITS } from '@/data/items/baits'
import { Button, Panel } from '@/ui/common/Panel'
import type { RodLoadout } from '@/game/equipment/types'

const SLOT_LABELS: Record<string, string> = {
  rod: 'Удилище', reel: 'Катушка', line: 'Леска', leader: 'Поводок', hook: 'Крючок',
  sinker: 'Грузило', float: 'Поплавок', feeder: 'Кормушка',
}

function SlotRow({ rodIndex, slotKey, current }: { rodIndex: 0 | 1 | 2; slotKey: keyof RodLoadout; current: unknown }) {
  const inventory = useGameStore((s) => s.inventory)
  const equipToRod = useGameStore((s) => s.equipToRod)
  const options = inventory.stacks.filter((s) => s.category === slotKey)
  const currentItem = current as { name: string; price: number } | null

  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-black/10">
      <div className="w-24 text-xs opacity-60">{SLOT_LABELS[slotKey]}</div>
      <div className="flex-1 text-sm">
        {currentItem ? currentItem.name : <span className="opacity-40 italic">не выбрано</span>}
      </div>
      <div className="flex gap-1 flex-wrap justify-end max-w-[50%]">
        {currentItem && (
          <button onClick={() => equipToRod(rodIndex, slotKey, null)} className="text-[11px] px-2 py-0.5 rounded-sm bg-black/10 hover:bg-black/20">
            Снять
          </button>
        )}
        {options.map((stack) => {
          const item = getShopItemById(stack.itemId)
          if (!item) return null
          return (
            <button
              key={stack.id}
              onClick={() => equipToRod(rodIndex, slotKey, stack.id)}
              className="text-[11px] px-2 py-0.5 rounded-sm bg-lake-600/20 hover:bg-lake-600/35"
            >
              {item.name}
            </button>
          )
        })}
        {options.length === 0 && !currentItem && <span className="text-[11px] opacity-40">нет в инвентаре</span>}
      </div>
    </div>
  )
}

export function RodSetupModal() {
  const rodIndex = useUiStore((s) => s.setupRodIndex)
  const closeModal = useUiStore((s) => s.closeModal)
  const openBase = useUiStore((s) => s.openBase)
  const rod = useGameStore((s) => s.rods[rodIndex])
  const setBaitOnRod = useGameStore((s) => s.setBaitOnRod)
  const setBaitSandwich = useGameStore((s) => s.setBaitSandwich)
  const finishSetup = useGameStore((s) => s.finishSetup)
  const inventory = useGameStore((s) => s.inventory)

  const kind = rod.loadout.rod?.kind
  const showFloat = !kind || kind === 'float' || kind === 'carp'
  const showFeeder = kind === 'feeder' || kind === 'bottom' || kind === 'carp'

  const availableBaits = inventory.stacks
    .filter((s) => s.category === 'bait')
    .map((s) => ({ stack: s, def: BAITS.find((b) => b.id === s.itemId) }))
    .filter((b) => b.def)

  const canFinish = rod.loadout.rod && rod.loadout.reel && rod.loadout.line && rod.loadout.hook && rod.loadout.bait

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-6" onClick={closeModal}>
      <Panel paper className="w-full max-w-xl p-5 max-h-[85vh] overflow-y-auto" >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Настройка удочки {rodIndex + 1}</h2>
            <button onClick={closeModal} className="text-lg opacity-60 hover:opacity-100">✕</button>
          </div>

          <SlotRow rodIndex={rodIndex} slotKey="rod" current={rod.loadout.rod} />
          <SlotRow rodIndex={rodIndex} slotKey="reel" current={rod.loadout.reel} />
          <SlotRow rodIndex={rodIndex} slotKey="line" current={rod.loadout.line} />
          <SlotRow rodIndex={rodIndex} slotKey="leader" current={rod.loadout.leader} />
          <SlotRow rodIndex={rodIndex} slotKey="hook" current={rod.loadout.hook} />
          <SlotRow rodIndex={rodIndex} slotKey="sinker" current={rod.loadout.sinker} />
          {showFloat && <SlotRow rodIndex={rodIndex} slotKey="float" current={rod.loadout.float} />}
          {showFeeder && <SlotRow rodIndex={rodIndex} slotKey="feeder" current={rod.loadout.feeder} />}

          <div className="py-2">
            <div className="text-xs opacity-60 mb-1">Наживка</div>
            <div className="flex gap-1.5 flex-wrap">
              {availableBaits.map(({ stack, def }) => (
                <button
                  key={stack.id}
                  onClick={() => setBaitOnRod(rodIndex, stack.itemId)}
                  className={`text-xs px-2 py-1 rounded-sm border ${rod.loadout.bait === stack.itemId ? 'bg-brass-500 border-brass-500 text-wood-950 font-semibold' : 'bg-black/10 border-black/10 hover:bg-black/20'}`}
                >
                  {def?.name} ({stack.quantity})
                </button>
              ))}
              {availableBaits.length === 0 && <span className="text-xs opacity-40 italic">Наживки нет — загляните в магазин</span>}
            </div>
          </div>

          {rod.loadout.bait && (
            <div className="py-2">
              <div className="text-xs opacity-60 mb-1">Бутерброд (необязательно) — второй компонент насадки</div>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setBaitSandwich(rodIndex, null)}
                  className={`text-xs px-2 py-1 rounded-sm border ${!rod.loadout.baitSandwich ? 'bg-brass-500 border-brass-500 text-wood-950 font-semibold' : 'bg-black/10 border-black/10 hover:bg-black/20'}`}
                >
                  Без бутерброда
                </button>
                {availableBaits.filter(({ stack }) => stack.itemId !== rod.loadout.bait).map(({ stack, def }) => (
                  <button
                    key={stack.id}
                    onClick={() => setBaitSandwich(rodIndex, stack.itemId)}
                    className={`text-xs px-2 py-1 rounded-sm border ${rod.loadout.baitSandwich === stack.itemId ? 'bg-brass-500 border-brass-500 text-wood-950 font-semibold' : 'bg-black/10 border-black/10 hover:bg-black/20'}`}
                  >
                    + {def?.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/10">
            <Button variant="ghost" onClick={() => { closeModal(); openBase('shop') }}>В магазин</Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={closeModal}>Закрыть</Button>
              <Button disabled={!canFinish} onClick={() => { finishSetup(rodIndex); closeModal() }}>Готово</Button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}
