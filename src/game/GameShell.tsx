import { useCallback, useEffect, useRef, useState } from 'react'
import { createConfig } from './config'
import { GameManager } from './GameManager'
import { mn } from './i18n'
import { KeyboardInput } from './input/Input'
import { loadAssets } from './render/assets'
import { Renderer } from './render/Renderer'
import type { Assets } from './render/sprites'
import menuBackgroundUrl from '../assests/backgrounds/steppe-night.png'
import menuHeroUrl from '../assests/sprites/mounted-archer.png'
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
  'cursor-pointer rounded-sm border-2 px-6 py-2.5 font-display text-base font-bold tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300'
const btnPrimary = `${btn} border-amber-300 bg-amber-400 text-stone-900 hover:bg-amber-300`
const btnGhost = `${btn} border-amber-200/40 bg-stone-900/60 text-amber-100 hover:bg-stone-800/80`

export function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runtime = useRef<Runtime | null>(null)
  const assetsRef = useRef<Assets | null>(null)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
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
        input.releaseTouchControls()
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
    void loadAssets()
      .then((a) => {
        if (cancelled) return
        assetsRef.current = a
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
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

  const hold = (control: 'left' | 'right' | 'sprint', pressed: boolean) => {
    runtime.current?.input.setTouchControl(control, pressed)
  }

  return (
    <div className="game-shell relative h-dvh w-screen overflow-hidden bg-stone-950 font-sans text-amber-50 select-none">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {screen === 'playing' && (
        <>
          <div className="game-utility" aria-label="Тоглоомын тохиргоо">
            <button
              className="utility-button"
              onClick={toggleMute}
              aria-label={mn.sound(muted)}
              title={mn.sound(muted)}
            >
              {muted ? '♪̸' : '♪'}
              <span className="utility-label">{muted ? 'Дуугүй' : 'Дуу'}</span>
            </button>
            <button
              className="utility-button"
              onClick={() => {
                const rt = runtime.current
                if (rt) {
                  rt.input.releaseTouchControls()
                  rt.game.paused = true
                  setPaused(true)
                }
              }}
              aria-label={mn.pause.button}
              title={mn.pause.button}
            >
              Ⅱ<span className="utility-label">{mn.pause.button}</span>
            </button>
          </div>
          {!paused && (
            <>
              <div className="keyboard-dock" aria-label="Удирдлага">
                <div className="control-tile">
                  <span className="control-symbol">↔</span>
                  <kbd>A / D</kbd>
                  <span>{mn.controlsShort.ride}</span>
                </div>
                <div className="control-tile">
                  <span className="control-symbol">»</span>
                  <kbd>SHIFT</kbd>
                  <span>{mn.controlsShort.gallop}</span>
                </div>
                <div className="control-tile control-tile-active">
                  <span className="control-symbol">✦</span>
                  <kbd>E</kbd>
                  <span>{mn.controlsShort.act}</span>
                </div>
              </div>
              <div className="touch-dock" aria-label="Дэлгэцийн удирдлага">
                {(['left', 'right', 'sprint'] as const).map((control) => (
                  <button
                    key={control}
                    className="touch-button"
                    aria-label={
                      control === 'left'
                        ? 'Зүүн тийш'
                        : control === 'right'
                          ? 'Баруун тийш'
                          : 'Хурдлах'
                    }
                    onPointerDown={(e) => {
                      e.preventDefault()
                      e.currentTarget.setPointerCapture(e.pointerId)
                      hold(control, true)
                    }}
                    onPointerUp={() => hold(control, false)}
                    onPointerCancel={() => hold(control, false)}
                    onLostPointerCapture={() => hold(control, false)}
                  >
                    {control === 'left' ? '←' : control === 'right' ? '→' : '»'}
                  </button>
                ))}
                <button
                  className="touch-button touch-action"
                  aria-label="Үйлдэл"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    runtime.current?.input.pressInteract()
                  }}
                >
                  ✦
                </button>
              </div>
            </>
          )}
        </>
      )}

      {screen === 'menu' && (
        <div
          className="menu-scene absolute inset-0"
          style={{ backgroundImage: `url(${menuBackgroundUrl})` }}
        >
          <div className="menu-vignette" />
          <img
            className="menu-hero"
            src={menuHeroUrl}
            alt="Нум агссан морьтон"
          />
          <div className="menu-content">
            <div className="menu-emblem" aria-hidden="true">
              ✦
            </div>
            <p className="menu-kicker">{mn.menu.kicker}</p>
            <h1 className="menu-title">{mn.title}</h1>
            <p className="menu-blurb">{mn.menu.blurb}</p>
            <div className="menu-actions">
              <button
                className={btnPrimary}
                onClick={() => start('new')}
                disabled={!ready}
              >
                {mn.menu.newGame}
              </button>
              {hasSave && (
                <button
                  className={btnGhost}
                  onClick={() => start('continue')}
                  disabled={!ready}
                >
                  {mn.menu.continue}
                </button>
              )}
            </div>
            {!ready && (
              <p className="menu-loading" role="status">
                {loadError
                  ? 'Зураг ачаалагдсангүй. Хуудсыг дахин ачаална уу.'
                  : 'Тоглоом ачаалж байна…'}
              </p>
            )}
            <div className="menu-rule" />
            <p className="menu-controls">
              <kbd>A / D</kbd> {mn.controlsShort.ride}
              <span>·</span>
              <kbd>SHIFT</kbd> {mn.controlsShort.gallop}
              <span>·</span>
              <kbd>E</kbd> {mn.controlsShort.act}
            </p>
          </div>
        </div>
      )}

      {screen === 'playing' && paused && (
        <Overlay>
          <h2 className="m-0 font-display text-4xl font-extrabold text-amber-100">
            {mn.pause.title}
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button className={btnPrimary} onClick={resume}>
              {mn.pause.resume}
            </button>
            <button className={btnGhost} onClick={toMenu}>
              {mn.pause.saveExit}
            </button>
          </div>
        </Overlay>
      )}

      {screen === 'gameover' && summary && (
        <Overlay tone="danger">
          <h2 className="m-0 font-display text-4xl font-extrabold text-red-100 sm:text-5xl">
            {mn.gameOver.title}
          </h2>
          <p className="mt-3 text-base text-red-100/80">{summary.reason}</p>
          <p className="mt-1 text-sm text-red-100/60">
            {mn.gameOver.summary(summary.day, summary.kills, summary.coins)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {hasAutosave && (
              <button
                className={btnPrimary}
                onClick={() => start('restartDay')}
              >
                {mn.gameOver.restartDay}
              </button>
            )}
            <button
              className={hasAutosave ? btnGhost : btnPrimary}
              onClick={() => start('new')}
            >
              {mn.gameOver.newGame}
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
