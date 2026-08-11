import { AnimationMixer, LoopRepeat } from 'three'
import type { AnimationClip, AnimationAction, Object3D } from 'three'
import type { ButterflyConfig } from './config'

/**
 * Drives the butterfly's baked wing-beat clip organically. The realistic wing
 * *shape* comes from the baked animation; the *rhythm* is applied here: beat
 * rate follows movement speed plus layered noise (flap → short recovery → flap),
 * and during glides the beat slows while the stroke relaxes toward open.
 */
export class WingController {
  private readonly mixer: AnimationMixer
  private readonly action: AnimationAction
  private readonly cfg: ButterflyConfig
  private timeScale = 1
  private weight = 1
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

    // Flap → recovery → flap: two slow, incommensurate waves plus a gentle
    // asymmetric shaping so the cadence never sounds metronomic.
    const rhythm =
      1 + 0.16 * Math.sin(this.time * 1.3 + this.seed) + 0.09 * Math.sin(this.time * 0.62)
    const gliding = speedNorm < 0.16
    // Keep an energetic base beat even when slow, so it always flaps clearly.
    let rate = this.cfg.wingSpeed * (0.9 + 0.7 * speedNorm) * rhythm
    if (gliding) rate *= 0.6

    // Ease the rate so beats speed up / slow down smoothly, never snapping.
    this.timeScale += (rate - this.timeScale) * (1 - Math.exp(-4 * dt))
    this.action.timeScale = this.timeScale

    // Amplitude: relax the stroke toward the open rest pose while gliding.
    const weightTarget = gliding ? 1 - this.cfg.wingAmplitude : 1
    this.weight += (weightTarget - this.weight) * (1 - Math.exp(-3 * dt))
    this.action.setEffectiveWeight(this.weight)

    this.mixer.update(dt)
  }

  dispose(): void {
    this.action.stop()
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.mixer.getRoot() as Object3D)
  }
}
