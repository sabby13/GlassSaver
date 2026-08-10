import { Vector3 } from 'three'
import type { ButterflyConfig } from './config'

const UP = new Vector3(0, 1, 0)
const randRange = (a: number, b: number): number => a + Math.random() * (b - a)
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)
/** Frame-rate independent smoothing factor for an exponential approach. */
const smooth = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt)

type Phase = 'entering' | 'roaming'

/**
 * Steering-based flight with momentum. Velocity eases toward a desired velocity
 * (so heading and speed both have inertia), the desired direction is gently
 * curved by a wander angle, targets are spread across screen regions, and the
 * butterfly periodically leaves the frame entirely and returns later from a new
 * direction/depth. No allocation happens in update(); temp vectors are reused.
 */
export class FlightModel {
  readonly position = new Vector3()
  readonly forward = new Vector3(0, 0, -1)
  /** Position with secondary drift/bob applied — what actually gets rendered. */
  readonly visualPosition = new Vector3()

  speed = 0
  roll = 0
  pitch = 0
  /** 0..1 fade for entrance, exit, and the "off in the wider world" states. */
  presence = 0

  private readonly cfg: ButterflyConfig
  private readonly velocity = new Vector3()
  private readonly target = new Vector3()
  private readonly desired = new Vector3()
  private readonly tmp = new Vector3()
  private readonly prevForward = new Vector3(0, 0, -1)

  private phase: Phase = 'entering'
  private retarget = 0
  private gliding = false
  private glideTimer = 0
  private wanderAngle = Math.random() * Math.PI * 2
  private region = Math.floor(Math.random() * 5)
  private readonly seed = Math.random() * 1000
  private time = 0

  constructor(config: ButterflyConfig) {
    this.cfg = config
    this.spawn()
  }

  /** Enter from a distant, off-centre point, from a fresh side and depth. */
  spawn(): void {
    const c = this.cfg
    const side = Math.random() < 0.5 ? -1 : 1
    this.position.set(
      side * randRange(c.boundsX * 0.8, c.boundsX * 1.2),
      randRange(-c.boundsY * 0.6, c.boundsY * 0.9),
      randRange(c.minDepth, c.minDepth * 0.5)
    )
    this.forward.set(-side, 0, 0.2).normalize()
    this.velocity.copy(this.forward).multiplyScalar(c.minSpeed)
    this.prevForward.copy(this.forward)
    this.speed = c.minSpeed
    this.presence = 0
    this.phase = 'entering'
    this.pickTarget(true)
    this.visualPosition.copy(this.position)
  }

  private pickTarget(inward: boolean): void {
    const c = this.cfg
    // Cycle regions so it visits top / bottom / sides / centre over time.
    this.region = (this.region + 1 + Math.floor(Math.random() * 3)) % 5
    let x: number
    let y: number
    let z = randRange(c.minDepth, c.maxDepth)
    switch (this.region) {
      case 0: // top
        x = randRange(-c.boundsX, c.boundsX) * 0.85
        y = randRange(c.keepoutY, c.boundsY)
        break
      case 1: // bottom
        x = randRange(-c.boundsX, c.boundsX) * 0.85
        y = -randRange(c.keepoutY, c.boundsY)
        break
      case 2: // left
        x = -randRange(c.keepoutX, c.boundsX)
        y = randRange(-c.boundsY, c.boundsY) * 0.85
        break
      case 3: // right
        x = randRange(c.keepoutX, c.boundsX)
        y = randRange(-c.boundsY, c.boundsY) * 0.85
        break
      default: // occasional deep pass near centre (small, non-obstructive)
        x = randRange(-c.keepoutX, c.keepoutX) * 0.7
        y = randRange(-c.keepoutY, c.keepoutY) * 0.7
        z = randRange(c.minDepth, c.minDepth * 0.4)
    }
    if (inward) {
      x *= 0.7
      y *= 0.7
    }
    this.target.set(x, y, z)
  }

  update(dt: number): void {
    const c = this.cfg
    const t = (this.time += dt)

    // --- Presence: brief initial fly-in, then always fully present ---------
    if (this.phase === 'entering') {
      this.presence = Math.min(1, this.presence + dt / 2.2)
      if (this.presence >= 1) this.phase = 'roaming'
    } else {
      this.presence = 1
    }

    // --- Retarget & glide (once roaming) -----------------------------------
    if (this.phase === 'roaming') {
      this.retarget -= dt
      if (this.retarget <= 0 || this.position.distanceToSquared(this.target) < 0.5) {
        this.pickTarget(false)
        this.retarget = randRange(2, 5)
      }
      this.glideTimer -= dt
      if (this.gliding) {
        if (this.glideTimer <= 0) this.gliding = false
      } else if (Math.random() < c.glideProbability * dt) {
        this.gliding = true
        this.glideTimer = randRange(0.6, 1.8)
      }
    }

    // --- Desired direction: toward target, gently curved by wander ---------
    this.desired.copy(this.target).sub(this.position)
    if (this.desired.lengthSq() > 1e-6) this.desired.normalize()
    this.wanderAngle += (Math.sin(t * 0.5 + this.seed) * 0.6 + Math.sin(t * 0.23 + this.seed * 1.7) * 0.4) * dt
    this.desired.applyAxisAngle(UP, Math.sin(this.wanderAngle) * 0.35)
    this.desired.y += Math.sin(t * 0.7 + this.seed) * 0.05
    if (this.desired.lengthSq() > 1e-6) this.desired.normalize()

    // Push away from the clock, strongest near the clock plane (z ≈ 0).
    if (Math.abs(this.position.x) < c.keepoutX && Math.abs(this.position.y) < c.keepoutY) {
      const pushScale = Math.max(0, 1 - Math.abs(this.position.z) / c.keepoutZ)
      if (pushScale > 0) {
        const nx = this.position.x === 0 ? randRange(-1, 1) : this.position.x
        const ny = this.position.y === 0 ? randRange(-1, 1) : this.position.y
        this.tmp.set(nx, ny, 0).normalize()
        this.desired.addScaledVector(this.tmp, 1.5 * pushScale).normalize()
      }
    }

    // --- Target speed: cruise varies; slower in glides/turns, faster if near
    const depthNorm = clamp01((this.position.z - c.minDepth) / (c.maxDepth - c.minDepth))
    const cruise = c.minSpeed + (c.maxSpeed - c.minSpeed) * (0.45 + 0.35 * Math.sin(t * 0.19 + this.seed))
    const align = Math.max(0, this.desired.dot(this.forward))
    let targetSpeed = (this.gliding ? c.minSpeed * 1.05 : cruise) * (0.55 + 0.45 * align)
    targetSpeed *= 1 + c.depthSpeedBoost * depthNorm

    // --- Momentum: ease velocity toward desired velocity -------------------
    this.prevForward.copy(this.forward)
    this.tmp.copy(this.desired).multiplyScalar(targetSpeed)
    this.velocity.lerp(this.tmp, smooth(c.turnStrength, dt))
    this.speed = this.velocity.length()
    if (this.speed > 1e-4) this.forward.copy(this.velocity).multiplyScalar(1 / this.speed)
    this.position.addScaledVector(this.velocity, dt)

    // --- Secondary drift + bob (calmer when far) ---------------------------
    const driftScale = 0.5 + 0.5 * depthNorm
    const driftX = Math.sin(t * 0.53 + this.seed) * 0.6 + Math.sin(t * 0.19 + 2.1) * 0.4
    const driftY = Math.sin(t * 0.61 + 1.7) * 0.5 + Math.sin(t * 0.23 + this.seed) * 0.5
    const bob = Math.sin(t * 2.1 + this.seed) * c.verticalDrift * (0.5 + 0.5 * this.speedNorm)
    this.visualPosition.set(
      this.position.x + driftX * c.driftStrength * 0.35 * driftScale,
      this.position.y + driftY * c.driftStrength * 0.3 * driftScale + bob,
      this.position.z
    )

    // --- Banking (roll) into turns + pitch from climb/dive -----------------
    const turnCos = Math.max(0, this.forward.dot(this.prevForward))
    const turnSign = this.prevForward.x * this.forward.z - this.prevForward.z * this.forward.x
    const targetRoll = clampSym(turnSign * (1 - turnCos) * 45, c.bankAmount)
    this.roll += (targetRoll - this.roll) * smooth(3.5, dt)
    const targetPitch = clampSym(this.forward.y * c.pitchAmount * 2.4, c.pitchAmount)
    this.pitch += (targetPitch - this.pitch) * smooth(3, dt)
  }

  get speedNorm(): number {
    const c = this.cfg
    return clamp01((this.speed - c.minSpeed) / (c.maxSpeed - c.minSpeed))
  }
}

function clampSym(v: number, limit: number): number {
  return v < -limit ? -limit : v > limit ? limit : v
}
