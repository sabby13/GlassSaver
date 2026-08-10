import { AnimationMixer, LoopRepeat } from 'three'
import type { AnimationClip, AnimationAction, Object3D } from 'three'
import type { ButterflyConfig } from './config'

/**
 * Drives the butterfly's baked wing-beat clip. Rather than playing it at a
 * constant rate (which reads as robotic), it modulates the clip's timeScale
 * from the butterfly's movement speed plus slow layered noise, and eases into
 * a near-hold during glides. The realistic wing *shape* comes from the baked
 * animation; the organic *rhythm* is applied here.
 */
export class WingController {
  private readonly mixer: AnimationMixer
  private readonly action: AnimationAction
  private readonly cfg: ButterflyConfig
  private timeScale = 1
  private time = 0
  private readonly seed = Math.random() * 100

  constructor(root: Object3D, clip: AnimationClip, config: ButterflyConfig) {
    this.cfg = config
    this.mixer = new AnimationMixer(root)
    this.action = this.mixer.clipAction(clip)
    this.action.setLoop(LoopRepeat, Infinity)
    this.action.clampWhenFinished = false
    this.action.enabled = true
    this.action.play()
  }

  update(dt: number, speedNorm: number): void {
    this.time += dt

    // Frequency variation: two slow, incommensurate waves so it never repeats.
    const noise = 1 + 0.16 * Math.sin(this.time * 1.27 + this.seed) + 0.09 * Math.sin(this.time * 0.63)
    let target = this.cfg.wingSpeed * (0.5 + 1.0 * speedNorm) * noise
    // Glide: when barely moving, the wings slow to a near-hold.
    if (speedNorm < 0.16) target *= 0.4

    // Ease the rate so beats speed up / slow down smoothly, never snapping.
    this.timeScale += (target - this.timeScale) * (1 - Math.exp(-4 * dt))
    this.action.timeScale = this.timeScale

    this.mixer.update(dt)
  }

  dispose(): void {
    this.action.stop()
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.mixer.getRoot() as Object3D)
  }
}
