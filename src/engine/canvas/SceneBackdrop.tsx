import { useGameStore } from '@/app/store'
import { getLocationById } from '@/data/locations/locations'
import { activePhotoSceneImage } from '@/game/locations/types'

const BUCKET_KEYS = ['morning', 'midday', 'evening', 'night'] as const

export function SceneBackdrop() {
  const currentLocationId = useGameStore((s) => s.currentLocationId)
  const activeImage = useGameStore((s) => {
    const location = getLocationById(s.currentLocationId)
    if (!location?.photoScene) return null
    const hourFraction = (s.clock.totalGameMinutes / 60) % 24
    return activePhotoSceneImage(location.photoScene, hourFraction)
  })

  const location = getLocationById(currentLocationId)
  const scene = location?.photoScene
  if (!scene) return null

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-black">
      {BUCKET_KEYS.map((key) => (
        <img
          key={key}
          src={scene[key]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity ease-in-out"
          style={{ opacity: scene[key] === activeImage ? 1 : 0, transitionDuration: '5000ms' }}
        />
      ))}
    </div>
  )
}
