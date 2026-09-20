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

export class KeyboardInput implements InputSource {
  left = false
  right = false
  sprint = false
  onPause: (() => void) | null = null
  private interact = false

  constructor(private target: Window) {
    target.addEventListener('keydown', this.down)
    target.addEventListener('keyup', this.up)
    target.addEventListener('blur', this.reset)
  }

  consumeInteract(): boolean {
    const v = this.interact
    this.interact = false
    return v
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.down)
    this.target.removeEventListener('keyup', this.up)
    this.target.removeEventListener('blur', this.reset)
  }

  private reset = () => {
    this.left = this.right = this.sprint = this.interact = false
  }

  private down = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (LEFT.has(e.key)) this.left = true
    else if (RIGHT.has(e.key)) this.right = true
    else if (e.key === 'Shift') this.sprint = true
    else if (INTERACT.has(e.key)) {
      if (!e.repeat) this.interact = true
    } else if (PAUSE.has(e.key)) {
      if (!e.repeat) this.onPause?.()
    } else return
    e.preventDefault()
  }

  private up = (e: KeyboardEvent) => {
    if (LEFT.has(e.key)) this.left = false
    else if (RIGHT.has(e.key)) this.right = false
    else if (e.key === 'Shift') this.sprint = false
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
