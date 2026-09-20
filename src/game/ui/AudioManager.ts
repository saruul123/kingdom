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
  private offs: (() => void)[]
  private mood: 'day' | 'night' = 'day'
  private musicTimer: ReturnType<typeof setInterval> | null = null
  private beat = 0

  constructor(bus: EventBus) {
    this.offs = [
      bus.on('sfx', ({ name }) => this.play(name)),
      bus.on('phaseChanged', ({ phase }) => {
        this.mood = phase === 'Night' || phase === 'Sunset' ? 'night' : 'day'
      }),
    ]
  }

  dispose(): void {
    for (const off of this.offs) off()
    this.stopMusic()
    void this.ac?.close().catch(() => undefined)
  }

  /** A quiet, generative pentatonic line: brighter by day, low and sparse at night. */
  startMusic(): void {
    if (this.musicTimer !== null || typeof AudioContext === 'undefined') return
    this.musicTimer = setInterval(() => this.tick(), 950)
  }

  stopMusic(): void {
    if (this.musicTimer !== null) clearInterval(this.musicTimer)
    this.musicTimer = null
  }

  private tick(): void {
    if (this.muted) return
    const ac = this.context()
    if (!ac) return
    if (ac.state !== 'running') {
      void ac.resume().catch(() => undefined)
      return
    }
    const night = this.mood === 'night'
    this.beat++
    if (night && this.beat % 2 === 0) return
    // anhemitonic pentatonic on D
    const scale = [293.66, 329.63, 392, 440, 493.88]
    const melody = [0, 2, 1, 3, 4, 2, 3, 1]
    const octave = night ? 0.5 : 1
    this.note(
      scale[melody[this.beat % 8]] * octave,
      night ? 1.8 : 1.2,
      night ? 0.028 : 0.032,
    )
    if (this.beat % 8 === 0) this.note(scale[0] * 0.5, 3.2, 0.03, 'sine')
  }

  private note(
    freq: number,
    dur: number,
    gain: number,
    type: OscillatorType = 'triangle',
  ): void {
    const ac = this.ac
    if (!ac) return
    const now = ac.currentTime
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(gain, now + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    osc.connect(g).connect(ac.destination)
    osc.start(now)
    osc.stop(now + dur + 0.05)
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
