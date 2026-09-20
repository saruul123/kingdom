import type { EventBus, SfxName } from '../core/events'

interface Tone {
  freq: number
  dur: number
  type?: OscillatorType
  gain?: number
  slide?: number
  delay?: number
}

const SOUNDS: Record<SfxName, Tone[]> = {
  coin: [
    { freq: 880, dur: 0.07, type: 'triangle', gain: 0.08 },
    { freq: 1320, dur: 0.09, type: 'triangle', gain: 0.08, delay: 0.05 },
  ],
  spend: [{ freq: 520, dur: 0.1, type: 'triangle', gain: 0.08, slide: -160 }],
  deny: [{ freq: 160, dur: 0.14, type: 'square', gain: 0.05 }],
  arrow: [{ freq: 420, dur: 0.06, type: 'sawtooth', gain: 0.025, slide: -220 }],
  hit: [{ freq: 130, dur: 0.08, type: 'square', gain: 0.05, slide: -60 }],
  build: [
    { freq: 392, dur: 0.12, type: 'triangle', gain: 0.09 },
    { freq: 523, dur: 0.12, type: 'triangle', gain: 0.09, delay: 0.1 },
    { freq: 659, dur: 0.2, type: 'triangle', gain: 0.09, delay: 0.2 },
  ],
  horn: [
    { freq: 110, dur: 0.9, type: 'sawtooth', gain: 0.06 },
    { freq: 165, dur: 0.9, type: 'sawtooth', gain: 0.04 },
  ],
  recruit: [
    { freq: 440, dur: 0.1, type: 'triangle', gain: 0.08 },
    { freq: 660, dur: 0.14, type: 'triangle', gain: 0.08, delay: 0.08 },
  ],
  kill: [{ freq: 220, dur: 0.12, type: 'square', gain: 0.04, slide: -120 }],
  gameover: [
    { freq: 220, dur: 0.5, type: 'sawtooth', gain: 0.07, slide: -120 },
    {
      freq: 147,
      dur: 0.8,
      type: 'sawtooth',
      gain: 0.07,
      slide: -60,
      delay: 0.4,
    },
  ],
}

/** Tiny synthesised sound effects, driven purely by `sfx` events. */
export class AudioManager {
  muted = false
  private ac: AudioContext | null = null
  private off: () => void

  constructor(bus: EventBus) {
    this.off = bus.on('sfx', ({ name }) => this.play(name))
  }

  dispose(): void {
    this.off()
    void this.ac?.close().catch(() => undefined)
  }

  private context(): AudioContext | null {
    if (this.ac) return this.ac
    try {
      this.ac = new AudioContext()
    } catch {
      return null
    }
    return this.ac
  }

  private play(name: SfxName): void {
    if (this.muted || typeof AudioContext === 'undefined') return
    const ac = this.context()
    if (!ac || ac.state === 'suspended') {
      void ac?.resume().catch(() => undefined)
      if (!ac || ac.state !== 'running') return
    }
    const now = ac.currentTime
    for (const t of SOUNDS[name]) {
      const start = now + (t.delay ?? 0)
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = t.type ?? 'sine'
      osc.frequency.setValueAtTime(t.freq, start)
      if (t.slide)
        osc.frequency.linearRampToValueAtTime(
          Math.max(30, t.freq + t.slide),
          start + t.dur,
        )
      gain.gain.setValueAtTime(t.gain ?? 0.06, start)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur)
      osc.connect(gain).connect(ac.destination)
      osc.start(start)
      osc.stop(start + t.dur + 0.02)
    }
  }
}
