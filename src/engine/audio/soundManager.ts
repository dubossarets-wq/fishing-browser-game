export type SoundEffect = 'cast' | 'splash' | 'bite-bell' | 'reel-click' | 'line-snap' | 'catch' | 'ui-click' | 'coin'

class SoundManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private ambientGain: GainNode | null = null
  private ambientNodes: AudioNode[] = []
  private muted = false
  private volume = 0.6

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this.muted ? 0 : this.volume
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /** Browsers block audio until a user gesture — call on the first click/keypress anywhere. */
  unlock() {
    this.ensureContext()
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : this.volume
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v))
    if (this.masterGain && !this.muted) this.masterGain.gain.value = this.volume
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  play(effect: SoundEffect) {
    // Sound is a nice-to-have — a WebAudio hiccup (autoplay policy, a closed/broken
    // context, etc.) must never bubble up and break the game loop or a click handler.
    try {
      this.playUnsafe(effect)
    } catch (err) {
      console.error('[soundManager] play failed', effect, err)
    }
  }

  private playUnsafe(effect: SoundEffect) {
    const ctx = this.ensureContext()
    const master = this.masterGain!
    const now = ctx.currentTime

    switch (effect) {
      case 'ui-click': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 720
        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
        osc.connect(gain).connect(master)
        osc.start(now)
        osc.stop(now + 0.09)
        break
      }
      case 'cast': {
        // "Бульк" — a quick water plop: fast descending pitch blip plus a soft noise transient.
        const osc = ctx.createOscillator()
        const oscGain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(520, now)
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.09)
        oscGain.gain.setValueAtTime(0.001, now)
        oscGain.gain.exponentialRampToValueAtTime(0.35, now + 0.015)
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
        osc.connect(oscGain).connect(master)
        osc.start(now)
        osc.stop(now + 0.19)

        const src = ctx.createBufferSource()
        src.buffer = this.noiseBuffer(ctx, 0.15)
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 900
        const noiseGain = ctx.createGain()
        noiseGain.gain.setValueAtTime(0.001, now)
        noiseGain.gain.exponentialRampToValueAtTime(0.18, now + 0.01)
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
        src.connect(filter).connect(noiseGain).connect(master)
        src.start(now)
        break
      }
      case 'splash': {
        const src = ctx.createBufferSource()
        src.buffer = this.noiseBuffer(ctx, 0.4)
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = 1200
        filter.Q.value = 0.6
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.4, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
        src.connect(filter).connect(gain).connect(master)
        src.start(now)
        break
      }
      case 'bite-bell': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.value = 1400
        gain.gain.setValueAtTime(0.001, now)
        gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
        osc.connect(gain).connect(master)
        osc.start(now)
        osc.stop(now + 0.5)
        break
      }
      case 'reel-click': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.value = 2200
        gain.gain.setValueAtTime(0.06, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
        osc.connect(gain).connect(master)
        osc.start(now)
        osc.stop(now + 0.04)
        break
      }
      case 'line-snap': {
        const src = ctx.createBufferSource()
        src.buffer = this.noiseBuffer(ctx, 0.15)
        const filter = ctx.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.value = 2500
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.5, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
        src.connect(filter).connect(gain).connect(master)
        src.start(now)
        break
      }
      case 'catch': {
        const freqs = [523, 659, 784]
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.value = f
          const start = now + i * 0.09
          gain.gain.setValueAtTime(0.001, start)
          gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35)
          osc.connect(gain).connect(master)
          osc.start(start)
          osc.stop(start + 0.36)
        })
        break
      }
      case 'coin': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(1600, now)
        osc.frequency.exponentialRampToValueAtTime(2400, now + 0.08)
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
        osc.connect(gain).connect(master)
        osc.start(now)
        osc.stop(now + 0.15)
        break
      }
    }
  }

  startAmbient(kind: 'lake' | 'river' | 'pond', windSpeed: number, rain: boolean) {
    try {
      this.startAmbientUnsafe(kind, windSpeed, rain)
    } catch (err) {
      console.error('[soundManager] startAmbient failed', err)
    }
  }

  private startAmbientUnsafe(kind: 'lake' | 'river' | 'pond', windSpeed: number, rain: boolean) {
    this.stopAmbient()
    const ctx = this.ensureContext()
    const bus = ctx.createGain()
    bus.gain.value = 0.5
    bus.connect(this.masterGain!)
    this.ambientGain = bus

    const waterSrc = ctx.createBufferSource()
    waterSrc.buffer = this.noiseBuffer(ctx, 4)
    waterSrc.loop = true
    const waterFilter = ctx.createBiquadFilter()
    waterFilter.type = 'lowpass'
    waterFilter.frequency.value = kind === 'river' ? 500 : 260
    const waterGain = ctx.createGain()
    waterGain.gain.value = kind === 'river' ? 0.22 : 0.12
    waterSrc.connect(waterFilter).connect(waterGain).connect(bus)
    waterSrc.start()

    const windSrc = ctx.createBufferSource()
    windSrc.buffer = this.noiseBuffer(ctx, 4)
    windSrc.loop = true
    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 700
    windFilter.Q.value = 0.4
    const windGain = ctx.createGain()
    windGain.gain.value = Math.min(0.25, 0.04 + windSpeed * 0.015)
    windSrc.connect(windFilter).connect(windGain).connect(bus)
    windSrc.start()

    this.ambientNodes = [waterSrc, windSrc]

    if (rain) {
      const rainSrc = ctx.createBufferSource()
      rainSrc.buffer = this.noiseBuffer(ctx, 4)
      rainSrc.loop = true
      const rainFilter = ctx.createBiquadFilter()
      rainFilter.type = 'highpass'
      rainFilter.frequency.value = 3000
      const rainGain = ctx.createGain()
      rainGain.gain.value = 0.18
      rainSrc.connect(rainFilter).connect(rainGain).connect(bus)
      rainSrc.start()
      this.ambientNodes.push(rainSrc)
    }
  }

  stopAmbient() {
    for (const node of this.ambientNodes) {
      try {
        ;(node as AudioBufferSourceNode).stop()
      } catch {
        /* already stopped */
      }
    }
    this.ambientNodes = []
    this.ambientGain?.disconnect()
    this.ambientGain = null
  }
}

export const soundManager = new SoundManager()
