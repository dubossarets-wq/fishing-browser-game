import { useState } from 'react'
import { useGameStore } from '@/app/store'
import { useUiStore } from '@/app/uiStore'
import { getFishSpeciesById } from '@/data/fish/species'
import { LOCATIONS } from '@/data/locations/locations'
import { SHOP_CATALOG } from '@/game/economy/shopCatalog'
import { computeSalePrice } from '@/game/economy/types'
import { QUESTS } from '@/data/quests/quests'
import { Button, Panel } from '@/ui/common/Panel'
import type { EquipmentItem } from '@/game/equipment/types'

const TABS: { key: 'livewell' | 'shop' | 'quests' | 'locations'; label: string }[] = [
  { key: 'livewell', label: 'Садок' },
  { key: 'shop', label: 'Магазин' },
  { key: 'quests', label: 'Задания' },
  { key: 'locations', label: 'Локации' },
]

function LivewellTab() {
  const livewell = useGameStore((s) => s.livewell)
  const economy = useGameStore((s) => s.economy)
  const sellFish = useGameStore((s) => s.sellFish)
  const sellAllFish = useGameStore((s) => s.sellAllFish)

  if (livewell.length === 0) return <div className="text-sm opacity-60 italic py-6 text-center">Садок пуст. Поймайте рыбу и оставьте её здесь.</div>

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button onClick={sellAllFish}>Продать всё</Button>
      </div>
      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {livewell.map((fish) => {
          const species = getFishSpeciesById(fish.speciesId)
          if (!species) return null
          const entry = economy.market.entries[fish.speciesId]
          const price = computeSalePrice(species.basePrice, fish.weight, species.rarity, entry?.demandMultiplier ?? 1)
          return (
            <div key={fish.instanceId} className="flex items-center justify-between bg-black/5 rounded-sm px-3 py-1.5">
              <div className="text-sm">
                <span className="font-semibold">{species.name}</span>{' '}
                <span className="opacity-70">{fish.weight} кг{fish.isTrophy ? ' 🏆' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-brass-500">{price} ₽</span>
                <button onClick={() => sellFish(fish.instanceId)} className="text-xs px-2 py-1 rounded-sm bg-moss-500/80 text-white hover:brightness-110">Продать</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  rod: 'Удилища', reel: 'Катушки', line: 'Леска', leader: 'Поводки', hook: 'Крючки', sinker: 'Грузила',
  float: 'Поплавки', feeder: 'Кормушки', bait: 'Наживка', groundbait: 'Прикормка', food: 'Еда',
}

function ShopTab() {
  const money = useGameStore((s) => s.economy.money)
  const buyItem = useGameStore((s) => s.buyItem)
  const [category, setCategory] = useState<string>('rod')

  const categories = Array.from(new Set(SHOP_CATALOG.map((i) => i.category)))
  const items = SHOP_CATALOG.filter((i) => i.category === category)

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`text-xs px-2.5 py-1 rounded-sm ${category === c ? 'bg-brass-500 text-wood-950 font-semibold' : 'bg-black/10 hover:bg-black/20'}`}>
            {CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
        {items.map((item: EquipmentItem) => (
          <div key={item.id} className="bg-black/5 rounded-sm p-2.5 flex flex-col gap-1">
            <div className="text-sm font-semibold">{item.name}</div>
            {'description' in item && <div className="text-[11px] opacity-60 leading-snug">{item.description}</div>}
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-mono text-brass-500">{item.price} ₽</span>
              <button
                disabled={money < item.price}
                onClick={() => buyItem(item.id, 1)}
                className="text-xs px-2.5 py-1 rounded-sm bg-lake-600 text-white hover:brightness-110 disabled:opacity-30"
              >
                Купить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuestsTab() {
  const questProgress = useGameStore((s) => s.questProgress)
  const claimQuest = useGameStore((s) => s.claimQuest)
  const level = useGameStore((s) => s.player.level)

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {QUESTS.filter((q) => q.requiredLevel <= level + 3).map((quest) => {
        const progress = questProgress[quest.id]
        if (!progress) return null
        return (
          <div key={quest.id} className="bg-black/5 rounded-sm p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{quest.title}</span>
              <span className="text-[11px] font-mono opacity-70">{progress.current}/{progress.target}</span>
            </div>
            <div className="text-[11px] opacity-70 mt-0.5">{quest.description}</div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-brass-500">Награда: {quest.reward.money} ₽, {quest.reward.experience} опыта</span>
              {progress.completed && !progress.claimedAt && (
                <button onClick={() => claimQuest(quest.id)} className="text-xs px-2.5 py-1 rounded-sm bg-moss-500 text-white hover:brightness-110">Забрать</button>
              )}
              {progress.claimedAt && <span className="text-[11px] opacity-40">получено</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LocationsTab() {
  const currentLocationId = useGameStore((s) => s.currentLocationId)
  const unlockedLocationIds = useGameStore((s) => s.unlockedLocationIds)
  const level = useGameStore((s) => s.player.level)
  const travelToLocation = useGameStore((s) => s.travelToLocation)

  return (
    <div className="space-y-2">
      {LOCATIONS.map((loc) => {
        const unlocked = unlockedLocationIds.includes(loc.id) || loc.unlockLevel <= level
        const current = loc.id === currentLocationId
        return (
          <div key={loc.id} className="bg-black/5 rounded-sm p-2.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">{loc.name} {current && <span className="text-[11px] text-moss-500">(вы здесь)</span>}</div>
              <div className="text-[11px] opacity-60">{unlocked ? `Поездка: ${loc.travelCost} ₽` : `Требуется уровень ${loc.unlockLevel}`}</div>
            </div>
            {!current && (
              <button
                disabled={!unlocked}
                onClick={() => travelToLocation(loc.id)}
                className="text-xs px-2.5 py-1 rounded-sm bg-lake-600 text-white hover:brightness-110 disabled:opacity-30"
              >
                Поехать
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function BaseModal() {
  const closeModal = useUiStore((s) => s.closeModal)
  const baseTab = useUiStore((s) => s.baseTab)
  const setBaseTab = useUiStore((s) => s.setBaseTab)

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-6" onClick={closeModal}>
      <Panel paper className="w-full max-w-2xl p-5 max-h-[85vh] overflow-y-auto" >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">База</h2>
            <button onClick={closeModal} className="text-lg opacity-60 hover:opacity-100">✕</button>
          </div>
          <div className="flex gap-1.5 mb-4 border-b border-black/10 pb-2">
            {TABS.map((tb) => (
              <button
                key={tb.key}
                onClick={() => setBaseTab(tb.key)}
                className={`text-sm px-3 py-1 rounded-sm ${baseTab === tb.key ? 'bg-brass-500 text-wood-950 font-semibold' : 'bg-black/10 hover:bg-black/20'}`}
              >
                {tb.label}
              </button>
            ))}
          </div>
          {baseTab === 'livewell' && <LivewellTab />}
          {baseTab === 'shop' && <ShopTab />}
          {baseTab === 'quests' && <QuestsTab />}
          {baseTab === 'locations' && <LocationsTab />}
        </div>
      </Panel>
    </div>
  )
}
