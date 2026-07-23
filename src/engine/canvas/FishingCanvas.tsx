import { useEffect, useRef } from 'react'
import { useGameStore } from '@/app/store'
import { getTimeOfDay } from '@/game/time/types'
import { getSkyPalette, getLocationPalette } from '@/engine/canvas/sceneTheme'
import { getLocationById } from '@/data/locations/locations'
import type { RodSlot } from '@/game/fishing/types'
import type { TimeOfDay } from '@/game/fish/types'

const BANK_X = [0.24, 0.5, 0.76]

// Castable area of the water: full width minus a fixed side margin (so the
// float can never land under the sidebar or right at the canvas edge), and
// vertically from the horizon down to almost the very bottom of the canvas
// (a small margin so it never lands literally on the last pixel row) — the
// visible water now fills the whole frame down to the dock, not just the
// old near-shore band, so the clickable zone should match what's on screen.
// Tune either margin here; everything that resolves a click/drag to a cast
// target clamps through this first.
const CAST_ZONE_MARGIN_X = 100
const CAST_ZONE_BOTTOM_MARGIN = 20

function clampToCastZone(x: number, y: number, W: number, H: number, horizonY: number) {
  const minX = Math.min(CAST_ZONE_MARGIN_X, W / 2)
  const maxX = Math.max(W - CAST_ZONE_MARGIN_X, W / 2)
  const top = Math.min(horizonY, H)
  const bottom = Math.max(horizonY, H - CAST_ZONE_BOTTOM_MARGIN)
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(bottom, Math.max(top, y)),
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function isCasted(state: RodSlot['state']): boolean {
  return state === 'cast' || state === 'waiting' || state === 'bite' || state === 'hooked' || state === 'fight' || state === 'caught'
}

function projectWaterPoint(distance: number, angle: number, W: number, horizonY: number, bankY: number) {
  // Defensive fallback: a rod carrying a corrupted (non-finite) cast target from an
  // old bug must not keep throwing every frame and freezing the whole render loop.
  const safeDistance = Number.isFinite(distance) ? distance : 20
  const safeAngle = Number.isFinite(angle) ? angle : 0
  const t = easeOutCubic(Math.min(1, Math.max(0, safeDistance / 100)))
  const y = bankY - (bankY - horizonY) * t
  const spread = W * 0.42 * (1 - t * 0.82)
  const x = W / 2 + safeAngle * spread
  return { x, y, t }
}

// Inverse of projectWaterPoint: given a screen point, recover the cast distance/angle.
// The canvas can momentarily report a zero size (e.g. during a layout reflow), which
// would otherwise divide-by-zero into NaN and poison the stored rod state.
function unprojectWaterPoint(x: number, y: number, W: number, horizonY: number, bankY: number, maxDistance: number) {
  if (!Number.isFinite(W) || W <= 0 || bankY === horizonY) {
    return { distance: 0, angle: 0 }
  }
  const t = Math.min(1, Math.max(0, (bankY - y) / (bankY - horizonY)))
  const u = 1 - Math.pow(1 - t, 1 / 3)
  const distance = Math.round(Math.min(maxDistance, Math.max(0, u * 100)) * 100) / 100
  const spread = W * 0.42 * (1 - t * 0.82)
  const rawAngle = spread !== 0 ? (x - W / 2) / spread : 0
  const angle = Math.round(Math.min(1, Math.max(-1, Number.isFinite(rawAngle) ? rawAngle : 0)) * 100) / 100
  return { distance, angle }
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  const t = lenSq === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  const cx = ax + dx * t
  const cy = ay + dy * t
  return Math.hypot(px - cx, py - cy)
}

function rodStrokeColor(state: RodSlot['state'], active: boolean): string {
  if (state === 'broken') return '#8a4a3a'
  if (active) return '#e8c877'
  return '#c9b48a'
}

interface ReelAnim {
  startedAt: number
  fromX: number
  fromY: number
}

const REEL_ANIM_MS = 380

// The line must attach exactly where the rod's tip actually is in the photo,
// not just wherever the image file happens to end — a diagonal cutout rod
// almost never reaches the literal top-right pixel of its own bounding box,
// so anchoring there leaves the line visibly floating off the tip. Instead,
// once each image loads, scan its alpha channel for the topmost opaque row
// and the rightmost opaque pixel near it — that's the real tip, at the
// photo's own top-right edge — and use that as the anchor from then on.
function findTipFromAlpha(img: HTMLImageElement, tip: { x: number; y: number }) {
  const scan = () => {
    try {
      const w = img.naturalWidth
      const h = img.naturalHeight
      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      const octx = off.getContext('2d', { willReadFrequently: true })
      if (!octx) return
      octx.drawImage(img, 0, 0)
      const { data } = octx.getImageData(0, 0, w, h)
      // Solidly opaque only — a faint anti-aliased fringe can extend a few
      // px past where the tip visually reads as "there", which would leave
      // the line anchored just outside the rod's actual visible pixels.
      const ALPHA_MIN = 140
      const alphaAt = (x: number, y: number) => data[(y * w + x) * 4 + 3]

      let topY = -1
      for (let y = 0; y < h && topY < 0; y++) {
        for (let x = w - 1; x >= 0; x--) {
          if (alphaAt(x, y) > ALPHA_MIN) {
            topY = y
            break
          }
        }
      }
      if (topY < 0) return

      // Narrow band right at the top — wide enough to survive a couple of
      // rows of anti-aliasing, narrow enough not to drift down onto the
      // shaft where it starts curving away from the true tip.
      let rightX = -1
      for (let y = topY; y < Math.min(h, topY + 6); y++) {
        for (let x = w - 1; x >= 0; x--) {
          if (alphaAt(x, y) > ALPHA_MIN) {
            if (x > rightX) rightX = x
            break
          }
        }
      }
      if (rightX < 0) return

      tip.x = rightX
      tip.y = topY
    } catch {
      // Canvas read failed (e.g. file:// during local dev without a server) —
      // keep whatever fallback tip was set and move on.
    }
  }
  if (img.complete) scan()
  else img.addEventListener('load', scan, { once: true })
}

// "Ивняк" (rod_float_basic) is rendered from real photos instead of the
// procedural stroke — a straight one for idle/waiting, and an already-bent
// one for an actual bite/fight (its curve is baked into the photo, not
// computed). handle/tip are each photo's own butt-cap and tip-guide pixel
// positions, used to align it between the rod's anchor and its tip on screen.
const IVNYAK_ROD_IMG = new Image()
IVNYAK_ROD_IMG.src = '/rods/ivnyak.png'
const IVNYAK_HANDLE = { x: 28, y: 1348 }
const IVNYAK_IMG_W = 394
const IVNYAK_IMG_H = 1361
const IVNYAK_TIP = { x: IVNYAK_IMG_W, y: 0 } // refined below once the photo loads
findTipFromAlpha(IVNYAK_ROD_IMG, IVNYAK_TIP)

const IVNYAK_BITE_ROD_IMG = new Image()
IVNYAK_BITE_ROD_IMG.src = '/rods/ivnyak-bite.png'
const IVNYAK_BITE_HANDLE = { x: 700, y: 2850 }
const IVNYAK_BITE_IMG_W = 2170
const IVNYAK_BITE_IMG_H = 2900
const IVNYAK_BITE_TIP = { x: IVNYAK_BITE_IMG_W, y: 0 } // refined below once the photo loads
findTipFromAlpha(IVNYAK_BITE_ROD_IMG, IVNYAK_BITE_TIP)

const IVNYAK_SCALE_MULT = 4
const IVNYAK_Y_OFFSET = 100

function ivnyakPoleFit(
  handle: { x: number; y: number },
  tip: { x: number; y: number },
  anchorX: number,
  anchorY: number,
  tipX: number,
  tipY: number,
) {
  const rodVecX = tipX - anchorX
  const rodVecY = tipY - anchorY
  const imgVecX = tip.x - handle.x
  const imgVecY = tip.y - handle.y
  const scale = Math.hypot(rodVecX, rodVecY) / Math.hypot(imgVecX, imgVecY)
  const rotation = Math.atan2(rodVecY, rodVecX) - Math.atan2(imgVecY, imgVecX)
  return { scale, rotation }
}

// Centralized rod-photo lighting: every rod photo (current and future)
// routes through drawRodPolePhoto, so tuning one table here re-grades all
// of them consistently instead of each rod baking in its own look. A photo
// pasted on top of the scene reads as fake; matching its brightness/
// contrast/saturation and tinting it toward the ambient light color is what
// sells it as standing in the same light as the sky/water behind it.
interface RodTintLayer { color: string; alpha: number }
interface RodLightingProfile { brightness: number; contrast: number; saturation: number; tints: RodTintLayer[] }

const ROD_LIGHTING: Record<TimeOfDay, RodLightingProfile> = {
  // Soft low sun — a faint warm key light with slightly blue-cool shadows.
  dawn: {
    brightness: 1.0, contrast: 0.99, saturation: 0.96,
    tints: [
      { color: '#ffcf9e', alpha: 0.05 },
      { color: '#7fa4d6', alpha: 0.06 },
    ],
  },
  // Neutral daylight — essentially untouched.
  day: {
    brightness: 1.0, contrast: 1.0, saturation: 1.0,
    tints: [],
  },
  // Golden-hour key light over cool blue-violet shadow undertone.
  dusk: {
    brightness: 1.0, contrast: 1.01, saturation: 1.02,
    tints: [
      { color: '#e8823c', alpha: 0.12 },
      { color: '#5a5ad2', alpha: 0.07 },
    ],
  },
  // Cold, dim, low-contrast moonlight.
  night: {
    brightness: 0.78, contrast: 0.93, saturation: 0.85,
    tints: [
      { color: '#3f5f95', alpha: 0.16 },
    ],
  },
}

// Tinting has to be isolated to an offscreen canvas containing only the rod's
// own pixels — applying source-atop directly on the main canvas would mask
// against whatever's already painted behind it (sky, water, other rods),
// tinting a big rectangle of the background instead of just the rod. Cached
// per (image, timeOfDay) since there are only 4 buckets and the source
// photos never change, so this isn't redone every frame.
const rodPhotoTintCache = new Map<string, HTMLCanvasElement>()

function getTintedRodPhoto(img: HTMLImageElement, imgW: number, imgH: number, timeOfDay: TimeOfDay): HTMLCanvasElement | null {
  if (!img.complete || img.naturalWidth === 0) return null
  const key = `${img.src}:${timeOfDay}`
  const cached = rodPhotoTintCache.get(key)
  if (cached) return cached

  const offscreen = document.createElement('canvas')
  offscreen.width = imgW
  offscreen.height = imgH
  const octx = offscreen.getContext('2d')
  if (!octx) return null

  const lighting = ROD_LIGHTING[timeOfDay]
  octx.filter = `brightness(${lighting.brightness}) contrast(${lighting.contrast}) saturate(${lighting.saturation})`
  octx.drawImage(img, 0, 0, imgW, imgH)
  octx.filter = 'none'
  octx.globalCompositeOperation = 'source-atop'
  for (const layer of lighting.tints) {
    octx.globalAlpha = layer.alpha
    octx.fillStyle = layer.color
    octx.fillRect(0, 0, imgW, imgH)
  }
  octx.globalAlpha = 1
  octx.globalCompositeOperation = 'source-over'

  rodPhotoTintCache.set(key, offscreen)
  return offscreen
}

function drawRodPolePhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  imgW: number,
  imgH: number,
  handle: { x: number; y: number },
  tip: { x: number; y: number },
  anchorX: number,
  anchorY: number,
  tipX: number,
  tipY: number,
  timeOfDay: TimeOfDay,
) {
  const { scale, rotation } = ivnyakPoleFit(handle, tip, anchorX, anchorY, tipX, tipY)
  const tinted = getTintedRodPhoto(img, imgW, imgH, timeOfDay)
  ctx.save()
  ctx.translate(anchorX, anchorY)
  ctx.rotate(rotation)
  ctx.scale(scale, scale)
  ctx.drawImage(tinted ?? img, -handle.x, -handle.y)
  ctx.restore()
}

// The Ивняк photo is rendered larger than the procedural rod and anchored
// lower — everything that needs to know where the rod actually is on screen
// (the line/float attach point, and click hit-testing) must use this same
// effective anchor/tip, not the original vector-rod geometry.
function ivnyakEffectiveGeometry(anchorX: number, anchorY: number, tipX: number, tipY: number, bentTipY: number) {
  const poleAnchorX = anchorX
  const poleAnchorY = anchorY + IVNYAK_Y_OFFSET
  const effTipX = poleAnchorX + (tipX - anchorX) * IVNYAK_SCALE_MULT
  const effTipY = poleAnchorY + (tipY - anchorY) * IVNYAK_SCALE_MULT
  const effBentTipY = poleAnchorY + (bentTipY - anchorY) * IVNYAK_SCALE_MULT
  return { poleAnchorX, poleAnchorY, effTipX, effTipY, effBentTipY }
}

// Hit-test a screen point against the photo's own rectangular bounds (not
// just a thin line down its middle) by inverse-transforming the point back
// into the image's local pixel space.
function pointOnRodPhoto(
  x: number,
  y: number,
  imgW: number,
  imgH: number,
  handle: { x: number; y: number },
  tip: { x: number; y: number },
  anchorX: number,
  anchorY: number,
  tipX: number,
  tipY: number,
): boolean {
  const { scale, rotation } = ivnyakPoleFit(handle, tip, anchorX, anchorY, tipX, tipY)
  const dx = x - anchorX
  const dy = y - anchorY
  const cos = Math.cos(-rotation)
  const sin = Math.sin(-rotation)
  const localX = (dx * cos - dy * sin) / scale + handle.x
  const localY = (dx * sin + dy * cos) / scale + handle.y
  return localX >= 0 && localX <= imgW && localY >= 0 && localY <= imgH
}

export function FishingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(performance.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let prevRodStates: RodSlot['state'][] = ['idle', 'idle', 'idle']
    const reelAnims = new Map<number, ReelAnim>()

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = parent.clientWidth * dpr
      canvas.height = parent.clientHeight * dpr
      canvas.style.width = `${parent.clientWidth}px`
      canvas.style.height = `${parent.clientHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const sceneGeometry = () => {
      const W = canvas.clientWidth
      const H = canvas.clientHeight
      const horizonY = H * 0.48
      const bankTop = H * 0.84
      const bankBottom = H
      const anchorY = bankTop + (bankBottom - bankTop) * 0.4
      return { W, H, horizonY, bankTop, bankBottom, anchorY }
    }

    const rodPoleAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const { W, H, anchorY } = sceneGeometry()
      const store = useGameStore.getState()
      let bestIndex = -1
      let bestDist = Infinity
      BANK_X.forEach((frac, i) => {
        const anchorX = frac * W
        const rod = store.rods[i]
        const tipAngle = isCasted(rod.state) ? -0.95 : -1.25
        const rodLen = H * 0.16
        const tipX = anchorX + Math.cos(tipAngle) * rodLen
        const tipY = anchorY + Math.sin(tipAngle) * rodLen

        if (rod.loadout.rod?.id === 'rod_float_basic') {
          const bend = rod.state === 'fight' ? Math.min(0.35, (rod.fight?.lineTension ?? 0) / 260) : rod.state === 'broken' ? 0.6 : 0.05
          const bentTipY = tipY + bend * 34
          const { poleAnchorX, poleAnchorY, effTipX, effBentTipY } = ivnyakEffectiveGeometry(anchorX, anchorY, tipX, tipY, bentTipY)
          const isBiteOrFight = rod.biteStage === 'strong-bite' || rod.state === 'fight' || rod.state === 'hooked'
          const handle = isBiteOrFight ? IVNYAK_BITE_HANDLE : IVNYAK_HANDLE
          const tip = isBiteOrFight ? IVNYAK_BITE_TIP : IVNYAK_TIP
          const imgW = isBiteOrFight ? IVNYAK_BITE_IMG_W : IVNYAK_IMG_W
          const imgH = isBiteOrFight ? IVNYAK_BITE_IMG_H : IVNYAK_IMG_H
          if (pointOnRodPhoto(x, y, imgW, imgH, handle, tip, poleAnchorX, poleAnchorY, effTipX, effBentTipY)) {
            bestDist = 0
            bestIndex = i
            return
          }
        }

        const d = distanceToSegment(x, y, anchorX, anchorY, tipX, tipY)
        if (d < bestDist) {
          bestDist = d
          bestIndex = i
        }
      })
      return bestDist < 16 ? bestIndex : -1
    }

    const waterTargetAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const rawX = clientX - rect.left
      const rawY = clientY - rect.top
      const { W, H, horizonY, bankTop } = sceneGeometry()
      const { x, y } = clampToCastZone(rawX, rawY, W, H, horizonY)
      const store = useGameStore.getState()
      const location = getLocationById(store.currentLocationId)
      const maxDistance = location ? location.depthProfile[location.depthProfile.length - 1].distance : 100
      return unprojectWaterPoint(x, y, W, horizonY, bankTop, maxDistance)
    }

    // Hit-test the floating bobber itself (out on the water), separate from
    // rodPoleAt which only tests the rod near the bank — lets a bite be
    // struck by clicking the float directly, not just the "ПОДСЕЧКА" button.
    const floatAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const { W, horizonY, bankTop } = sceneGeometry()
      const store = useGameStore.getState()
      let bestIndex = -1
      let bestDist = Infinity
      store.rods.forEach((rod, i) => {
        if (rod.state !== 'waiting' || rod.waitTimeMs < CAST_FLIGHT_MS) return
        const water = projectWaterPoint(rod.castDistance, rod.castAngle, W, horizonY, bankTop)
        const d = Math.hypot(x - water.x, y - water.y)
        if (d < bestDist) {
          bestDist = d
          bestIndex = i
        }
      })
      return bestDist < 18 ? bestIndex : -1
    }

    // Held-drag aiming: mousedown on open water starts it, moving while still
    // held keeps re-aiming, releasing (anywhere, even off-canvas) stops it —
    // same window-level release pattern used for the strike/reel holds.
    let isAiming = false

    const aimAt = (clientX: number, clientY: number) => {
      const store = useGameStore.getState()
      const active = store.activeRodIndex
      const activeRod = store.rods[active]
      if (activeRod.state !== 'idle' && activeRod.state !== 'setup' && activeRod.state !== 'ready') return
      const { distance, angle } = waterTargetAt(clientX, clientY)
      store.setCastParams(active, distance, angle)
    }

    const handlePointerDown = (e: PointerEvent) => {
      const rodIndex = rodPoleAt(e.clientX, e.clientY)
      const store = useGameStore.getState()

      if (rodIndex >= 0) {
        const rod = store.rods[rodIndex]
        if (rod.state === 'waiting' && rod.biteStage === 'strong-bite') {
          store.setActiveRod(rodIndex as 0 | 1 | 2)
          store.strike(rodIndex as 0 | 1 | 2)
        } else {
          store.setActiveRod(rodIndex as 0 | 1 | 2)
        }
        return
      }

      const floatIndex = floatAt(e.clientX, e.clientY)
      if (floatIndex >= 0) {
        const rod = store.rods[floatIndex]
        store.setActiveRod(floatIndex as 0 | 1 | 2)
        if (rod.biteStage === 'strong-bite') {
          store.strike(floatIndex as 0 | 1 | 2)
        }
        return
      }

      // Not on a rod or float — start aiming the active rod at the water.
      isAiming = true
      aimAt(e.clientX, e.clientY)
    }

    const handlePointerUp = () => {
      isAiming = false
    }

    const handleDoubleClick = (e: MouseEvent) => {
      if (rodPoleAt(e.clientX, e.clientY) >= 0) return
      const store = useGameStore.getState()
      const active = store.activeRodIndex
      const activeRod = store.rods[active]
      if (activeRod.state !== 'idle' && activeRod.state !== 'setup' && activeRod.state !== 'ready') return

      const { distance, angle } = waterTargetAt(e.clientX, e.clientY)
      store.setCastParams(active, distance, angle)
      if (store.rods[active].state === 'ready') {
        store.castRod(active)
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      canvas.style.cursor = rodPoleAt(e.clientX, e.clientY) >= 0 || floatAt(e.clientX, e.clientY) >= 0 ? 'pointer' : 'crosshair'
      if (isAiming) aimAt(e.clientX, e.clientY)
    }
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('dblclick', handleDoubleClick)
    canvas.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    const renderFrame = (W: number, H: number) => {
      const t = (performance.now() - startRef.current) / 1000
      const store = useGameStore.getState()

      const hourFraction = (store.clock.totalGameMinutes / 60) % 24
      const timeOfDay = getTimeOfDay(Math.floor(hourFraction))
      const sky = getSkyPalette(hourFraction, store.weather.kind)
      const loc = getLocationPalette(store.currentLocationId)
      const locationDef = getLocationById(store.currentLocationId)
      const photoScene = locationDef?.photoScene

      const horizonY = H * 0.48
      const bankTop = H * 0.84
      const bankBottom = H

      if (photoScene) {
        // A real photo backdrop (SceneBackdrop.tsx) sits behind the canvas for
        // this location, covering the full frame — leave the whole canvas
        // transparent instead of painting the procedural gradients/bank over it.
        ctx.clearRect(0, 0, W, H)
      } else {
        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY)
        skyGrad.addColorStop(0, sky.skyTop)
        skyGrad.addColorStop(1, sky.skyBottom)
        ctx.fillStyle = skyGrad
        ctx.fillRect(0, 0, W, horizonY)

        // Sun / moon
        const sunX = W * (0.2 + 0.6 * (hourFraction / 24))
        const sunY = horizonY * (0.75 - 0.5 * Math.sin((hourFraction / 24) * Math.PI))
        ctx.save()
        ctx.globalAlpha = timeOfDay === 'night' ? 0.85 : 0.8
        const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60)
        glow.addColorStop(0, sky.sunColor)
        glow.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(sunX, sunY, 60, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Clouds
        if (store.weather.kind !== 'fog') {
          ctx.save()
          ctx.globalAlpha = store.weather.kind === 'cloudy' ? 0.5 : 0.28
          for (let i = 0; i < 4; i++) {
            const cx = ((t * 6 + i * 260) % (W + 200)) - 100
            const cy = horizonY * (0.18 + i * 0.12)
            drawCloud(ctx, cx, cy, 46 + i * 8)
          }
          ctx.restore()
        }

        // Hills (static silhouette — must not drift with time)
        drawHillBand(ctx, W, horizonY - H * 0.05, horizonY, loc.hillFar, 0, 0.55)
        drawHillBand(ctx, W, horizonY - H * 0.02, horizonY, loc.hillNear, 40, 0.9)
        drawTreeline(ctx, W, horizonY, loc.treeline)

        // Water
        const waterGrad = ctx.createLinearGradient(0, horizonY, 0, bankTop)
        waterGrad.addColorStop(0, sky.waterTop)
        waterGrad.addColorStop(1, sky.waterBottom)
        ctx.fillStyle = waterGrad
        ctx.fillRect(0, horizonY, W, bankTop - horizonY)
      }

      if (!photoScene) drawRipples(ctx, W, horizonY, bankTop, t)

      // Fog overlay
      if (store.weather.kind === 'fog') {
        const fogGrad = ctx.createLinearGradient(0, horizonY - H * 0.1, 0, horizonY + H * 0.18)
        fogGrad.addColorStop(0, 'rgba(220,225,230,0)')
        fogGrad.addColorStop(0.5, 'rgba(220,225,230,0.55)')
        fogGrad.addColorStop(1, 'rgba(220,225,230,0)')
        ctx.fillStyle = fogGrad
        ctx.fillRect(0, horizonY - H * 0.1, W, H * 0.28)
      }

      // Ambient darkness overlay (the photo backdrop already encodes lighting per time-of-day)
      if (!photoScene && sky.ambientLight < 1) {
        ctx.fillStyle = `rgba(4,8,18,${(1 - sky.ambientLight) * 0.55})`
        ctx.fillRect(0, 0, W, bankTop)
      }

      // Bank / foreground (photo locations show their own water/shore all the way down)
      if (!photoScene) {
        const bankGrad = ctx.createLinearGradient(0, bankTop, 0, bankBottom)
        bankGrad.addColorStop(0, loc.bankColor)
        bankGrad.addColorStop(1, '#181008')
        ctx.fillStyle = bankGrad
        ctx.fillRect(0, bankTop, W, bankBottom - bankTop)
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.fillRect(0, bankTop, W, 3)
      }

      // Rods
      store.rods.forEach((rod, i) => {
        const wasCasted = isCasted(prevRodStates[i])
        const nowCasted = isCasted(rod.state)
        if (wasCasted && !nowCasted && prevRodStates[i] !== 'caught') {
          // Reeled in without landing a fish (or it broke off) — animate the line
          // retracting from wherever it was instead of the float just popping home.
          // (Coming from 'caught' is excluded: the fish was already hanging at the
          // tip, not out in the water, so it should just swap to the float in place.)
          const fromWater = projectWaterPoint(rod.castDistance, rod.castAngle, W, horizonY, bankTop)
          reelAnims.set(i, { startedAt: performance.now(), fromX: fromWater.x, fromY: fromWater.y })
        }
        prevRodStates[i] = rod.state

        const reelAnim = reelAnims.get(i)
        if (reelAnim && performance.now() - reelAnim.startedAt > REEL_ANIM_MS) {
          reelAnims.delete(i)
        }

        drawRod(ctx, rod, i === store.activeRodIndex, BANK_X[i] * W, bankTop + (bankBottom - bankTop) * 0.4, W, H, horizonY, bankTop, t, timeOfDay, reelAnims.get(i))
      })

      // Rain
      if (store.weather.kind === 'rain') {
        ctx.save()
        ctx.strokeStyle = 'rgba(200,220,240,0.35)'
        ctx.lineWidth = 1
        for (let i = 0; i < 90; i++) {
          // Drops are drawn tilted down-and-left (rx-6, ry+16), so their
          // horizontal drift over time must also move left, not right.
          const rx = (((i * 53 - t * 500) % W) + W) % W
          const ry = (i * 97 + t * 900) % H
          ctx.beginPath()
          ctx.moveTo(rx, ry)
          ctx.lineTo(rx - 6, ry + 16)
          ctx.stroke()
        }
        ctx.restore()
      }
    }

    const draw = () => {
      const W = canvas.clientWidth
      const H = canvas.clientHeight
      if (W > 0 && H > 0) {
        try {
          renderFrame(W, H)
        } catch (err) {
          // A single bad frame (e.g. a transient NaN from a layout reflow) must
          // never permanently freeze the render loop — log it and keep going.
          console.error('[FishingCanvas] render error, recovering next frame', err)
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('dblclick', handleDoubleClick)
      canvas.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  return <canvas ref={canvasRef} className="block w-full h-full" />
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(x, y, size, size * 0.4, 0, 0, Math.PI * 2)
  ctx.ellipse(x + size * 0.5, y + size * 0.05, size * 0.65, size * 0.32, 0, 0, Math.PI * 2)
  ctx.ellipse(x - size * 0.5, y + size * 0.08, size * 0.55, size * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawHillBand(ctx: CanvasRenderingContext2D, W: number, top: number, base: number, color: string, phase: number, amp: number) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, base)
  const steps = 10
  for (let i = 0; i <= steps; i++) {
    const x = (W / steps) * i
    const y = top + Math.sin(i * 1.3 + phase * 0.3) * (base - top) * 0.5 * amp
    ctx.lineTo(x, y)
  }
  ctx.lineTo(W, base)
  ctx.closePath()
  ctx.fill()
}

function drawTreeline(ctx: CanvasRenderingContext2D, W: number, horizonY: number, color: string) {
  ctx.fillStyle = color
  const step = 14
  for (let x = 0; x < W; x += step) {
    const h = 6 + ((Math.sin(x * 0.35) + 1) * 5)
    ctx.beginPath()
    ctx.moveTo(x, horizonY)
    ctx.lineTo(x + step / 2, horizonY - h)
    ctx.lineTo(x + step, horizonY)
    ctx.closePath()
    ctx.fill()
  }
}

function drawRipples(ctx: CanvasRenderingContext2D, W: number, top: number, bottom: number, t: number) {
  ctx.save()
  const bands = 7
  for (let i = 0; i < bands; i++) {
    const yT = i / bands
    const y = top + (bottom - top) * Math.pow(yT, 1.6)
    const amp = 2 + (bottom - y) * 0.02
    ctx.globalAlpha = 0.12 + 0.1 * yT
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= W; x += 8) {
      const yy = y + Math.sin(x * 0.04 + t * 1.4 + i) * amp
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function drawCastPreview(
  ctx: CanvasRenderingContext2D,
  rod: RodSlot,
  active: boolean,
  W: number,
  horizonY: number,
  bankY: number,
  t: number,
) {
  // Only the currently active rod needs an aim marker — showing all three at
  // once made it hard to tell which point was actually yours.
  if (rod.state === 'broken' || !active) return
  const water = projectWaterPoint(rod.castDistance, rod.castAngle, W, horizonY, bankY)

  ctx.save()

  // Soft glow so the marker reads clearly against both light and dark water.
  const glow = ctx.createRadialGradient(water.x, water.y, 0, water.x, water.y, 26)
  glow.addColorStop(0, 'rgba(255,225,140,0.35)')
  glow.addColorStop(1, 'rgba(255,225,140,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(water.x, water.y, 26, 0, Math.PI * 2)
  ctx.fill()

  // Slowly spinning gunsight — steady size, rotates instead of pulsing.
  ctx.translate(water.x, water.y)
  ctx.rotate(t * 0.9)

  ctx.strokeStyle = '#ffd86b'
  ctx.setLineDash([5, 5])
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(0, 0, 16, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-9, 0)
  ctx.lineTo(9, 0)
  ctx.moveTo(0, -9)
  ctx.lineTo(0, 9)
  ctx.stroke()

  ctx.fillStyle = '#ffd86b'
  ctx.beginPath()
  ctx.arc(0, 0, 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawHangingFloat(ctx: CanvasRenderingContext2D, rod: RodSlot, tipX: number, tipY: number, t: number, reelAnim?: ReelAnim) {
  if (!rod.loadout.rod) return
  const hangLen = 54
  const swing = Math.sin(t * 1.3 + tipX * 0.01) * 0.18
  let floatX = tipX + Math.sin(swing) * hangLen
  let floatY = tipY + Math.cos(swing) * hangLen

  if (reelAnim) {
    // Reeling in draws the line up to the rod tip, not down toward the bank —
    // it only drops into the relaxed hang once it's actually reached the rod.
    const progress = easeOutCubic(Math.min(1, (performance.now() - reelAnim.startedAt) / REEL_ANIM_MS))
    floatX = reelAnim.fromX + (tipX - reelAnim.fromX) * progress
    floatY = reelAnim.fromY + (tipY - reelAnim.fromY) * progress
  }

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(floatX, floatY)
  ctx.stroke()

  ctx.fillStyle = '#e8443a'
  ctx.beginPath()
  ctx.arc(floatX, floatY, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f4f0e0'
  ctx.beginPath()
  ctx.arc(floatX, floatY - 2.5, 1.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawCaughtFish(ctx: CanvasRenderingContext2D, tipX: number, tipY: number, weight: number, t: number) {
  const hangLen = 60
  const swing = Math.sin(t * 1.1 + tipX * 0.01) * 0.1
  const fishX = tipX + Math.sin(swing) * hangLen
  const fishY = tipY + Math.cos(swing) * hangLen
  const size = Math.min(1.6, Math.max(0.6, 0.6 + Math.log2(1 + weight) * 0.35))

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(fishX, fishY)
  ctx.stroke()

  ctx.translate(fishX, fishY)
  ctx.rotate(Math.PI / 2 + swing * 0.6)
  ctx.fillStyle = '#8fa6a0'
  ctx.beginPath()
  ctx.ellipse(0, 0, 13 * size, 5.2 * size, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-12 * size, 0)
  ctx.lineTo(-18 * size, -5 * size)
  ctx.lineTo(-18 * size, 5 * size)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.arc(9 * size, -1 * size, 1.1 * size, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawRod(
  ctx: CanvasRenderingContext2D,
  rod: RodSlot,
  active: boolean,
  anchorX: number,
  anchorY: number,
  W: number,
  H: number,
  horizonY: number,
  bankY: number,
  t: number,
  timeOfDay: TimeOfDay,
  reelAnim?: ReelAnim,
) {
  const color = rodStrokeColor(rod.state, active)
  const casted = isCasted(rod.state)

  const tipAngle = casted ? -0.95 : -1.25
  const rodLen = H * 0.16
  const tipX = anchorX + Math.cos(tipAngle) * rodLen
  const tipY = anchorY + Math.sin(tipAngle) * rodLen

  // Rod pole
  const bend = rod.state === 'fight' ? Math.min(0.35, (rod.fight?.lineTension ?? 0) / 260) : rod.state === 'broken' ? 0.6 : 0.05
  const bentTipY = tipY + bend * 34
  const isIvnyak = rod.loadout.rod?.id === 'rod_float_basic'

  let poleAnchorX = anchorX
  let poleAnchorY = anchorY
  let effTipX = tipX
  let effTipY = tipY
  let effBentTipY = bentTipY
  if (isIvnyak) {
    ;({ poleAnchorX, poleAnchorY, effTipX, effTipY, effBentTipY } = ivnyakEffectiveGeometry(anchorX, anchorY, tipX, tipY, bentTipY))
  }

  const isBiteOrFight = rod.biteStage === 'strong-bite' || rod.state === 'fight' || rod.state === 'hooked'
  const ivnyakImg = isBiteOrFight ? IVNYAK_BITE_ROD_IMG : IVNYAK_ROD_IMG
  const ivnyakHandle = isBiteOrFight ? IVNYAK_BITE_HANDLE : IVNYAK_HANDLE
  const ivnyakTip = isBiteOrFight ? IVNYAK_BITE_TIP : IVNYAK_TIP
  const ivnyakImgW = isBiteOrFight ? IVNYAK_BITE_IMG_W : IVNYAK_IMG_W
  const ivnyakImgH = isBiteOrFight ? IVNYAK_BITE_IMG_H : IVNYAK_IMG_H
  if (isIvnyak && ivnyakImg.complete && ivnyakImg.naturalWidth > 0) {
    drawRodPolePhoto(ctx, ivnyakImg, ivnyakImgW, ivnyakImgH, ivnyakHandle, ivnyakTip, poleAnchorX, poleAnchorY, effTipX, effBentTipY, timeOfDay)
  } else {
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(anchorX, anchorY)
    const midX = anchorX + Math.cos(tipAngle) * rodLen * 0.55
    const midY = anchorY + Math.sin(tipAngle) * rodLen * 0.55 + bend * 20
    ctx.quadraticCurveTo(midX, midY, tipX, bentTipY)
    ctx.stroke()
  }

  if (!casted) {
    drawCastPreview(ctx, rod, active, W, horizonY, bankY, t)
    drawHangingFloat(ctx, rod, effTipX, effTipY, t, reelAnim)
    return
  }

  const realTipY = effBentTipY

  if (rod.state === 'caught' && rod.lastResultFish) {
    drawCaughtFish(ctx, effTipX, realTipY, rod.lastResultFish.weight, t)
    return
  }

  const water = projectWaterPoint(rod.castDistance, rod.castAngle, W, horizonY, bankY)

  // The bait flies from the rod tip out to the target before it lands — only
  // once landed does the normal bobbing float / splash take over.
  const inFlight = rod.state === 'waiting' && rod.waitTimeMs < CAST_FLIGHT_MS
  let displayX = water.x
  let displayY = water.y
  if (inFlight) {
    const flightProgress = easeOutCubic(rod.waitTimeMs / CAST_FLIGHT_MS)
    const arcLift = Math.sin(flightProgress * Math.PI) * 16
    displayX = effTipX + (water.x - effTipX) * flightProgress
    displayY = realTipY + (water.y - realTipY) * flightProgress - arcLift
  } else if (rod.state === 'fight' && rod.fight) {
    // The fish's on-screen position tracks how much line is actually out — reeling
    // in pulls it visibly toward THIS rod's own tip, not the screen centre, and
    // letting it run pays it back out toward where it was originally hooked.
    const lineOutFrac = Math.min(1, Math.max(0, rod.fight.lineOut / rod.fight.maxLineOut))
    displayX = effTipX + (water.x - effTipX) * lineOutFrac
    displayY = realTipY + (water.y - realTipY) * lineOutFrac
  }

  let floatY = displayY
  let floatVisible = true
  const bobPhase = t * 3 + anchorX

  if (inFlight) {
    // no bobbing mid-air
  } else if (rod.biteStage === 'interested') {
    floatY += Math.sin(bobPhase) * 1.5
  } else if (rod.biteStage === 'nibble') {
    floatY += Math.sin(bobPhase * 3) * 3.5
  } else if (rod.biteStage === 'strong-bite') {
    floatY += 6 + Math.sin(bobPhase * 6) * 2
  } else if (rod.state === 'fight' || rod.state === 'hooked') {
    floatVisible = false
  } else {
    floatY += Math.sin(bobPhase * 0.8) * 1
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(effTipX, realTipY)
  ctx.lineTo(displayX, floatVisible ? floatY : displayY - 2)
  ctx.stroke()

  if (floatVisible) {
    const isHot = !inFlight && (rod.biteStage === 'nibble' || rod.biteStage === 'strong-bite')
    if (isHot) {
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.strokeStyle = '#ff5a3c'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(displayX, floatY, 8 + Math.sin(t * 10) * 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = '#e8443a'
    ctx.beginPath()
    ctx.arc(displayX, floatY, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f4f0e0'
    ctx.beginPath()
    ctx.arc(displayX, floatY - 3, 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    for (let r = 0; r < 3; r++) {
      ctx.globalAlpha = 0.25 - r * 0.07
      ctx.beginPath()
      ctx.arc(displayX, displayY, 6 + r * 6 + Math.sin(t * 5) * 2, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (rod.state === 'waiting' && rod.waitTimeMs >= CAST_FLIGHT_MS && rod.waitTimeMs < CAST_FLIGHT_MS + SPLASH_DURATION_MS) {
    drawSplash(ctx, water.x, water.y, (rod.waitTimeMs - CAST_FLIGHT_MS) / SPLASH_DURATION_MS)
  }
}

const CAST_FLIGHT_MS = 380

const SPLASH_DURATION_MS = 700

function drawSplash(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number) {
  ctx.save()

  // Bright impact flash right as the bait touches down.
  const flashAlpha = Math.max(0, 1 - progress * 5) * 0.8
  if (flashAlpha > 0) {
    ctx.globalAlpha = flashAlpha
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Staggered expanding rings.
  for (let i = 0; i < 3; i++) {
    const ringProgress = Math.min(1, Math.max(0, progress * 1.3 - i * 0.18))
    if (ringProgress <= 0 || ringProgress >= 1) continue
    ctx.globalAlpha = (1 - ringProgress) * 0.55
    ctx.strokeStyle = '#eaf3f7'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y, 4 + ringProgress * 24, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Droplets kicked outward and up before falling back to the surface.
  const dropletCount = 7
  for (let i = 0; i < dropletCount; i++) {
    const angle = (i / dropletCount) * Math.PI * 2
    const dist = progress * 17
    const arc = Math.sin(Math.min(1, progress) * Math.PI) * 9
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist * 0.4 - arc
    const dropletAlpha = (1 - progress) * 0.85
    if (dropletAlpha <= 0) continue
    ctx.globalAlpha = dropletAlpha
    ctx.fillStyle = '#eaf3f7'
    ctx.beginPath()
    ctx.arc(x + dx, y + dy, 1.4, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}
