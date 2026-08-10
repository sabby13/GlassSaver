import { Vector3 } from 'three'
import type { ButterflyConfig } from './config'

const randRange = (a: number, b: number): number => a + Math.random() * (b - a)
/** Frame-rate independent smoothing factor for an exponential approach. */
const smooth = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt)

type Phase = 'entering' | 'roaming' | 'leaving'

/**
 * A small steering-based flight simulation. It produces an organic wandering
 * path: a smooth primary trajectory toward slowly-changing targets, secondary
 * drift/bob, and tertiary noise — plus banking, pitch, glides, clock keep-out,
 * and an entrance/exit "presence" so the butterfly can drift out of frame and
 * return. No allocation happens in update(); temp vectors are reused.
 */
export class FlightModel {
  readonly position = new Vector3()
  readonly forward = new Vector3(0, 0, -1)
  /** Position with secondary drift/bob applied — what actually gets rendered. */
  readonly visualPosition = new Vector3()

  speed = 0
  roll = 0
  pitch = 0
  /** 0..1 fade used for the entrance, exit, and "off in the wider world" states. */
  presence = 0

  private readonly cfg: ButterflyConfig
  private readonly target = new Vector3()
  private readonly desired = new Vector3()
  private readonly tmp = new Vector3()
  private readonly prevForward = new Vector3(0, 0, -1)

  private targetSpeed = 0
  private retarget = 0
  private gliding = false
  private glideTimer = 0
  private phase: Phase = 'entering'
  private phaseTimer = 0
  private driftSeed = Math.random() * 1000
  private time = 0

  constructor(config: ButterflyConfig) {
    this.cfg = config
    this.spawn()
  }

  /** Place the butterfly at a distant, off-centre point and begin entering. */
  spawn(): void {
    const c = this.cfg
    const side = Math.random() < 0.5 ? -1 : 1
    this.position.set(
      side * randRange(c.boundsX * 0.7, c.boundsX * 1.15),
      randRange(-c.boundsY * 0.5, c.boundsY * 0.8),
      randRange(c.minDepth, c.minDepth * 0.55)
    )
    this.forward.set(-side, 0, 0.15).normalize()
    this.prevForward.copy(this.forward)
    this.speed = c.minSpeed
    this.targetSpeed = c.minSpeed
    this.presence = 0
    this.phase = 'entering'
    this.phaseTimer = 0
    this.pickTarget(true)
    this.visualPosition.copy(this.position)
  }

  private pickTarget(inward: boolean): void {
    const c = this.cfg
    let x = randRange(-c.boundsX, c.boundsX)
    let y = randRange(-c.boundsY, c.boundsY)
    const z = randRange(c.minDepth, c.maxDepth)
    // Bias away from the screen centre so it doesn't settle over the clock.
    if (Math.abs(x) < c.keepoutX && Math.abs(y) < c.keepoutY) {
      const px = x === 0 ? 1 : Math.sign(x)
      x = px * randRange(c.keepoutX, c.boundsX)
      if (Math.random() < 0.5) y = Math.sign(y || 1) * randRange(c.keepoutY, c.boundsY)
    }
    if (inward) {
      x *= 0.7
      y *= 0.7
    }
    this.target.set(x, y, z)
  }

  private pickExitTarget(): void {
    const c = this.cfg
    const side = Math.random() < 0.5 ? -1 : 1
    this.target.set(
      side * c.boundsX * 2.0,
      randRange(-c.boundsY, c.boundsY),
      randRange(c.minDepth, c.maxDepth * 0.5)
    )
  }

  update(dt: number): void {
    const c = this.cfg
    this.time += dt

    // --- Phase / presence machine ------------------------------------------
    this.phaseTimer += dt
    if (this.phase === 'entering') {
      this.presence = Math.min(1, this.presence + dt / 2.6)
      if (this.presence >= 1) this.phase = 'roaming'
    } else if (this.phase === 'roaming') {
      this.presence = Math.min(1, this.presence + dt)
      // Occasionally wander off into the wider world.
      if (this.phaseTimer > 12 && Math.random() < 0.03 * dt) {
        this.phase = 'leaving'
        this.phaseTimer = 0
        this.pickExitTarget()
      }
    } else {
      // leaving: fade as it heads out, then respawn from a fresh edge.
      this.presence = Math.max(0, this.presence - dt / 2.2)
      const outside =
        Math.abs(this.position.x) > c.boundsX * 1.6 || this.position.z > c.maxDepth
      if (this.presence <= 0 && (outside || this.phaseTimer > 8)) {
        this.spawn()
        return
      }
    }

    // --- Retarget & glide state --------------------------------------------
    this.retarget -= dt
    if (this.phase !== 'leaving' && (this.retarget <= 0 || this.position.distanceToSquared(this.target) < 0.5)) {
      this.pickTarget(false)
      this.retarget = randRange(2.5, 6)
    }
    this.glideTimer -= dt
    if (this.gliding) {
      if (this.glideTimer <= 0) this.gliding = false
    } else if (this.phase === 'roaming' && Math.random() < c.glideProbability * dt) {
      this.gliding = true
      this.glideTimer = randRange(0.6, 1.7)
    }

    // --- Desired direction (primary trajectory + keep-out) ------------------
    this.desired.copy(this.target).sub(this.position)
    if (this.desired.lengthSq() > 1e-6) this.desired.normalize()
    // Push out of the clock keep-out ellipsoid when too close to the view axis.
    if (
      Math.abs(this.position.x) < c.keepoutX &&
      Math.abs(this.position.y) < c.keepoutY &&
      Math.abs(this.position.z) < c.keepoutZ
    ) {
      const nx = this.position.x === 0 ? randRange(-1, 1) : this.position.x
      const ny = this.position.y === 0 ? randRange(-1, 1) : this.position.y
      this.tmp.set(nx, ny, 0).normalize()
      this.desired.addScaledVector(this.tmp, 1.4).normalize()
    }

    // --- Ease heading toward desired (turn) ---------------------------------
    this.prevForward.copy(this.forward)
    this.forward.lerp(this.desired, smooth(c.turnStrength, dt))
    if (this.forward.lengthSq() < 1e-6) this.forward.copy(this.prevForward)
    else this.forward.normalize()

    // --- Speed: cruise varies slowly; slower in glides and hard turns -------
    const cruise = c.minSpeed + (c.maxSpeed - c.minSpeed) * (0.45 + 0.35 * Math.sin(this.time * 0.19 + this.driftSeed))
    const turnCos = Math.max(0, this.forward.dot(this.prevForward))
    this.targetSpeed = (this.gliding ? c.minSpeed * 1.05 : cruise) * (0.6 + 0.4 * turnCos)
    this.speed += (this.targetSpeed - this.speed) * smooth(2.4, dt)

    // --- Integrate position -------------------------------------------------
    this.position.addScaledVector(this.forward, this.speed * dt)

    // --- Secondary drift + vertical bob (layered), applied to render pos ----
    const t = this.time
    const driftX = Math.sin(t * 0.53 + this.driftSeed) * 0.6 + Math.sin(t * 0.19 + 2.1) * 0.4
    const driftY = Math.sin(t * 0.61 + 1.7) * 0.5 + Math.sin(t * 0.23 + this.driftSeed) * 0.5
    const bob = Math.sin(t * 2.1 + this.driftSeed) * c.verticalDrift * (0.5 + 0.5 * this.speedNorm)
    this.visualPosition.set(
      this.position.x + driftX * c.driftStrength * 0.35,
      this.position.y + driftY * c.driftStrength * 0.3 + bob,
      this.position.z
    )

    // --- Banking (roll) into turns + pitch from climb/dive ------------------
    // Signed horizontal turn: cross product y-component of prev->cur heading.
    const turnSign = this.prevForward.x * this.forward.z - this.prevForward.z * this.forward.x
    const turnMag = 1 - turnCos
    const targetRoll = clampSym(turnSign * turnMag * 40, c.bankAmount)
    this.roll += (targetRoll - this.roll) * smooth(3.5, dt)
    const targetPitch = clampSym(this.forward.y * c.pitchAmount * 2.2, c.pitchAmount)
    this.pitch += (targetPitch - this.pitch) * smooth(3, dt)
  }

  get speedNorm(): number {
    const c = this.cfg
    return Math.min(1, Math.max(0, (this.speed - c.minSpeed) / (c.maxSpeed - c.minSpeed)))
  }
}

function clampSym(v: number, limit: number): number {
  return v < -limit ? -limit : v > limit ? limit : v
}
