/** What the game needs from a controller. Tests and bots implement this directly. */
export interface InputSource {
  left: boolean
  right: boolean
  sprint: boolean
  /** True once per key press. */
  consumeInteract: () => boolean
}

const LEFT = new Set(['ArrowLeft', 'a', 'A'])
const RIGHT = new Set(['ArrowRight', 'd', 'D'])
const INTERACT = new Set(['e', 'E', ' ', 'ArrowDown', 's', 'S'])
const PAUSE = new Set(['p', 'P', 'Escape'])
const REPEAT_DELAY = 450
const REPEAT_INTERVAL = 280

export class KeyboardInput implements InputSource {
  private keyLeft = false
  private keyRight = false
  private keySprint = false
  private touchLeft = false
  private touchRight = false
  private touchSprint = false
  onPause: (() => void) | null = null
  private interact = false
  /** Holding the action key repeats it (recruit several people, buy several tools). */
  private interactHeld = false
  private nextRepeat = 0

  get left(): boolean {
    return this.keyLeft || this.touchLeft
  }
  get right(): boolean {
    return this.keyRight || this.touchRight
  }
  get sprint(): boolean {
    return this.keySprint || this.touchSprint
  }

  setTouchControl(
    control: 'left' | 'right' | 'sprint',
    pressed: boolean,
  ): void {
    if (control === 'left') this.touchLeft = pressed
    else if (control === 'right') this.touchRight = pressed
    else this.touchSprint = pressed
  }

  pressInteract(): void {
    this.interact = true
    this.interactHeld = true
    this.nextRepeat = performance.now() + REPEAT_DELAY
  }

  releaseInteract(): void {
    this.interactHeld = false
  }

  releaseTouchControls(): void {
    this.touchLeft = this.touchRight = this.touchSprint = false
  }

  constructor(private target: Window) {
    target.addEventListener('keydown', this.down)
    target.addEventListener('keyup', this.up)
    target.addEventListener('blur', this.reset)
  }

  consumeInteract(): boolean {
    if (this.interact) {
      this.interact = false
      return true
    }
    if (this.interactHeld && performance.now() >= this.nextRepeat) {
      this.nextRepeat = performance.now() + REPEAT_INTERVAL
      return true
    }
    return false
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.down)
    this.target.removeEventListener('keyup', this.up)
    this.target.removeEventListener('blur', this.reset)
  }

  private reset = () => {
    this.keyLeft = this.keyRight = this.keySprint = this.interact = false
    this.interactHeld = false
    this.releaseTouchControls()
  }

  private down = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (LEFT.has(e.key)) this.keyLeft = true
    else if (RIGHT.has(e.key)) this.keyRight = true
    else if (e.key === 'Shift') this.keySprint = true
    else if (INTERACT.has(e.key)) {
      if (!e.repeat) this.pressInteract()
    } else if (PAUSE.has(e.key)) {
      if (!e.repeat) this.onPause?.()
    } else return
    e.preventDefault()
  }

  private up = (e: KeyboardEvent) => {
    if (LEFT.has(e.key)) this.keyLeft = false
    else if (RIGHT.has(e.key)) this.keyRight = false
    else if (e.key === 'Shift') this.keySprint = false
    else if (INTERACT.has(e.key)) this.releaseInteract()
  }
}

export class NullInput implements InputSource {
  left = false
  right = false
  sprint = false
  private interact = false
  press(): void {
    this.interact = true
  }
  consumeInteract(): boolean {
    const v = this.interact
    this.interact = false
    return v
  }
}
