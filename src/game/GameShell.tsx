import { useCallback, useEffect, useRef, useState } from 'react'
import { createConfig } from './config'
import { GameManager } from './GameManager'
import { KeyboardInput } from './input/Input'
import { loadAssets } from './render/assets'
import { Renderer } from './render/Renderer'
import type { Assets } from './render/sprites'
import coverUrl from '../assests/cover.png'
import { SaveStore } from './systems/SaveSystem'
import { AudioManager } from './ui/AudioManager'

type Screen = 'menu' | 'playing' | 'gameover'
type StartMode = 'new' | 'continue' | 'restartDay' | 'demo'

interface Runtime {
  game: GameManager
  input: KeyboardInput
  audio: AudioManager
  renderer: Renderer
  raf: number
  off: () => void
}

interface Summary {
  reason: string
  day: number
  kills: number
  coins: number
}

const params = () =>
  typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search)

const btn =
  'cursor-pointer rounded-sm border-2 px-6 py-2.5 font-display text-base font-bold tracking-wider uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300'
const btnPrimary = `${btn} border-amber-300 bg-amber-400 text-stone-900 hover:bg-amber-300`
const btnGhost = `${btn} border-amber-200/40 bg-stone-900/60 text-amber-100 hover:bg-stone-800/80`

export function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runtime = useRef<Runtime | null>(null)
  const assetsRef = useRef<Assets | null>(null)
  const [ready, setReady] = useState(false)
  const [screen, setScreen] = useState<Screen>('menu')
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(false)
  const [hasSave, setHasSave] = useState(false)
  const [hasAutosave, setHasAutosave] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)

  const refreshSaves = useCallback(() => {
    const cfg = createConfig()
    setHasSave(SaveStore.hasSave(cfg))
    setHasAutosave(!!SaveStore.loadAutosave(cfg))
  }, [])

  const stop = useCallback(() => {
    const rt = runtime.current
    if (!rt) return
    cancelAnimationFrame(rt.raf)
    rt.off()
    rt.input.dispose()
    rt.audio.dispose()
    runtime.current = null
  }, [])

  const start = useCallback(
    (mode: StartMode) => {
      const canvas = canvasRef.current
      const assets = assetsRef.current
      if (!canvas || !assets) return
      stop()

      const config = createConfig()
      const state =
        mode === 'continue'
          ? SaveStore.loadLatest(config)
          : mode === 'restartDay'
            ? SaveStore.loadAutosave(config)
            : null
      const q = params()
      const seed = q.get('seed') ? Number(q.get('seed')) : undefined

      const input = new KeyboardInput(window)
      const game = new GameManager({
        config,
        state: state ?? undefined,
        seed,
        input,
        persist: mode !== 'demo',
      })
      const audio = new AudioManager(game.bus)
      audio.muted = mode === 'demo'
      const debug = q.has('debug')
      const speed = debug && q.get('speed') ? Number(q.get('speed')) : 1
      const renderer = new Renderer(canvas, game, assets, { debug })

      const offOver = game.bus.on('gameOver', ({ reason }) => {
        setSummary({
          reason,
          day: game.state.currentDay,
          kills: game.state.stats.enemiesKilled,
          coins: game.state.stats.coinsCollected,
        })
        setScreen('gameover')
        refreshSaves()
      })
      const pause = () => {
        if (game.state.status !== 'playing') return
        game.paused = !game.paused
        setPaused(game.paused)
      }
      input.onPause = pause

      const exitSave = () => game.save.save('exit')
      const onHide = () => {
        if (document.visibilityState === 'hidden') exitSave()
      }
      window.addEventListener('pagehide', exitSave)
      document.addEventListener('visibilitychange', onHide)

      game.paused = mode === 'demo'
      let last = performance.now()
      const rt: Runtime = {
        game,
        input,
        audio,
        renderer,
        raf: 0,
        off: () => {
          offOver()
          window.removeEventListener('pagehide', exitSave)
          document.removeEventListener('visibilitychange', onHide)
        },
      }
      const loop = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000)
        last = now
        game.frame(dt * speed)
        renderer.draw(dt)
        rt.raf = requestAnimationFrame(loop)
      }
      rt.raf = requestAnimationFrame(loop)
      runtime.current = rt

      if (debug) (window as unknown as { __game?: unknown }).__game = game
      setPaused(false)
      setSummary(null)
      setScreen(mode === 'demo' ? 'menu' : 'playing')
    },
    [refreshSaves, stop],
  )

  // Size the canvas to its container in device pixels.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(320, Math.floor(canvas.clientWidth * dpr))
      canvas.height = Math.max(240, Math.floor(canvas.clientHeight * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadAssets().then((a) => {
      if (cancelled) return
      assetsRef.current = a
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // The menu sits on top of a paused, live scene.
  useEffect(() => {
    if (!ready) return
    refreshSaves()
    start('demo')
    return stop
  }, [ready, refreshSaves, start, stop])

  const toMenu = () => {
    runtime.current?.game.save.save('exit')
    start('demo')
    refreshSaves()
  }

  const toggleMute = () => {
    const rt = runtime.current
    if (!rt) return
    rt.audio.muted = !rt.audio.muted
    setMuted(rt.audio.muted)
  }

  const resume = () => {
    const rt = runtime.current
    if (!rt) return
    rt.game.paused = false
    setPaused(false)
  }

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-stone-950 font-sans text-amber-50 select-none">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {screen === 'playing' && (
        <div className="absolute bottom-3 left-3 flex gap-2">
          <button
            className={`${btnGhost} px-3 py-1 text-xs`}
            onClick={toggleMute}
          >
            Sound: {muted ? 'off' : 'on'}
          </button>
          <button
            className={`${btnGhost} px-3 py-1 text-xs`}
            onClick={() => {
              const rt = runtime.current
              if (rt) {
                rt.game.paused = true
                setPaused(true)
              }
            }}
          >
            Pause
          </button>
        </div>
      )}

      {screen === 'menu' && (
        <div
          className="absolute inset-0 bg-stone-950 bg-cover bg-center"
          style={{ backgroundImage: `url(${coverUrl})` }}
        >
          <div className="absolute inset-0 bg-linear-to-t from-stone-950 via-stone-950/55 to-transparent" />
          <div className="relative flex h-full flex-col items-center justify-end p-6 pb-8 text-center">
            <p className="m-0 text-xs font-bold tracking-widest text-amber-300/90 uppercase">
              Steppe survival · kingdom building
            </p>
            <h1 className="m-0 mt-2 font-display text-5xl font-bold text-amber-100 drop-shadow-lg sm:text-7xl">
              Монгол хаант улс
            </h1>
            <p className="mt-3 max-w-lg text-base text-amber-50/85">
              Ride out from a single ger. Gather coins, recruit your people,
              raise walls and towers, and hold the steppe through every night.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button className={btnPrimary} onClick={() => start('new')}>
                New Game
              </button>
              {hasSave && (
                <button className={btnGhost} onClick={() => start('continue')}>
                  Continue
                </button>
              )}
            </div>
            <p className="mt-5 text-sm text-amber-100/70">
              <b className="text-amber-200">A D / ← →</b> ride ·{' '}
              <b className="text-amber-200">Shift</b> gallop ·{' '}
              <b className="text-amber-200">E / ↓ / Space</b> act ·{' '}
              <b className="text-amber-200">P</b> pause
            </p>
          </div>
        </div>
      )}

      {screen === 'playing' && paused && (
        <Overlay>
          <h2 className="m-0 font-display text-4xl font-extrabold text-amber-100">
            Paused
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button className={btnPrimary} onClick={resume}>
              Resume
            </button>
            <button className={btnGhost} onClick={toMenu}>
              Save &amp; exit to menu
            </button>
          </div>
        </Overlay>
      )}

      {screen === 'gameover' && summary && (
        <Overlay tone="danger">
          <h2 className="m-0 font-display text-4xl font-extrabold text-red-100 sm:text-5xl">
            Your kingdom has fallen.
          </h2>
          <p className="mt-3 text-base text-red-100/80">{summary.reason}</p>
          <p className="mt-1 text-sm text-red-100/60">
            Reached day {summary.day} · {summary.kills} raiders defeated ·{' '}
            {summary.coins} coins gathered
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {hasAutosave && (
              <button
                className={btnPrimary}
                onClick={() => start('restartDay')}
              >
                Restart Day
              </button>
            )}
            <button
              className={hasAutosave ? btnGhost : btnPrimary}
              onClick={() => start('new')}
            >
              New Game
            </button>
          </div>
        </Overlay>
      )}
    </div>
  )
}

function Overlay({
  children,
  tone,
}: {
  children: React.ReactNode
  tone?: 'danger'
}) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center p-6 text-center backdrop-blur-xs ${
        tone === 'danger' ? 'bg-red-950/60' : 'bg-stone-950/55'
      }`}
    >
      <div className="flex max-w-xl flex-col items-center">{children}</div>
    </div>
  )
}
