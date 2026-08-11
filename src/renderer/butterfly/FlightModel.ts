import { Vector3 } from 'three'
import type { ButterflyConfig } from './config'

const UP = new Vector3(0, 1, 0)
const randRange = (a: number, b: number): number => a + Math.random() * (b - a)
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)
/** Frame-rate independent smoothing factor for an exponential approach. */
const smooth = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt)

type Phase = 'entering' | 'roaming'

/**
 * Steering flight over a flat horizontal plane (X = screen horizontal, Z =
 * screen vertical) at a gentle altitude Y. Heading (yaw) follows the horizontal
 * velocity only, so the butterfly never pitches onto its side — the wing tops
 * always face the straight-down camera. Momentum, curved wander, banking,
 * glides, and clock keep-out are preserved. No allocation in update().
 */
export class FlightModel {
  readonly position = new Vector3()
  readonly forward = new Vector3(0, 0, -1)
  /** Position with secondary drift/bob applied — what actually gets rendered. */
  readonly visualPosition = new Vector3()

  speed = 0
  roll = 0
  /** Pitch stays ~0 so the wings remain flat to the camera. */
  readonly pitch = 0
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

  spawn(): void {
    const c = this.cfg
    const midY = (c.heightMin + c.heightMax) * 0.5
    if (c.hover) {
      const a = Math.random() * Math.PI * 2
      this.position.set(
        c.hoverCenter[0] + Math.cos(a) * c.hoverRadius * 0.5,
        midY,
        c.hoverCenter[1] + Math.sin(a) * c.hoverRadius * 0.5
      )
    } else {
      const side = Math.random() < 0.5 ? -1 : 1
      this.position.set(side * randRange(c.areaX * 0.7, c.areaX), midY, randRange(-c.areaY, c.areaY))
    }
    this.forward.set(Math.random() < 0.5 ? -1 : 1, 0, randRange(-0.6, 0.6)).normalize()
    this.velocity.copy(this.forward).multiplyScalar(c.minSpeed)
    this.prevForward.copy(this.forward)
    this.speed = c.minSpeed
    this.presence = 0
    this.phase = 'entering'
    this.pickTarget()
    this.visualPosition.copy(this.position)
  }

  private pickTarget(): void {
    const c = this.cfg
    const y = randRange(c.heightMin, c.heightMax)
    if (c.hover) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * c.hoverRadius
      this.target.set(c.hoverCenter[0] + Math.cos(a) * r, y, c.hoverCenter[1] + Math.sin(a) * r)
      return
    }
    // Spread targets across screen regions so it uses the whole space.
    this.region = (this.region + 1 + Math.floor(Math.random() * 3)) % 5
    let x: number
    let z: number
    switch (this.region) {
      case 0: // top of screen
        x = randRange(-c.areaX, c.areaX) * 0.85
        z = -randRange(c.keepoutY, c.areaY)
        break
      case 1: // bottom
        x = randRange(-c.areaX, c.areaX) * 0.85
        z = randRange(c.keepoutY, c.areaY)
        break
      case 2: // left
        x = -randRange(c.keepoutX, c.areaX)
        z = randRange(-c.areaY, c.areaY) * 0.85
        break
      case 3: // right
        x = randRange(c.keepoutX, c.areaX)
        z = randRange(-c.areaY, c.areaY) * 0.85
        break
      default: // wander wider, occasionally past centre
        x = randRange(-c.areaX, c.areaX)
        z = randRange(-c.areaY, c.areaY)
    }
    this.target.set(x, y, z)
  }

  update(dt: number): void {
    const c = this.cfg
    const t = (this.time += dt)

    // --- Presence: brief fly-in, then always fully present -----------------
    if (this.phase === 'entering') {
      this.presence = Math.min(1, this.presence + dt / 2.2)
      if (this.presence >= 1) this.phase = 'roaming'
    } else {
      this.presence = 1
    }

    // --- Retarget & glide (roaming) ----------------------------------------
    if (this.phase === 'roaming') {
      this.retarget -= dt
      const dx = this.target.x - this.position.x
      const dz = this.target.z - this.position.z
      if (this.retarget <= 0 || dx * dx + dz * dz < 0.5) {
        this.pickTarget()
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

    // --- Desired direction: toward target, gently curved -------------------
    this.desired.copy(this.target).sub(this.position)
    if (this.desired.lengthSq() > 1e-6) this.desired.normalize()
    this.wanderAngle += (Math.sin(t * 0.5 + this.seed) * 0.6 + Math.sin(t * 0.23 + this.seed * 1.7) * 0.4) * dt
    this.desired.applyAxisAngle(UP, Math.sin(this.wanderAngle) * 0.35)
    if (this.desired.lengthSq() > 1e-6) this.desired.normalize()

    // Push away from screen centre (the clock), on the X/Z plane.
    if (Math.abs(this.position.x) < c.keepoutX && Math.abs(this.position.z) < c.keepoutY) {
      const nx = this.position.x === 0 ? randRange(-1, 1) : this.position.x
      const nz = this.position.z === 0 ? randRange(-1, 1) : this.position.z
      this.tmp.set(nx, 0, nz).normalize()
      this.desired.addScaledVector(this.tmp, 1.5).normalize()
    }

    // --- Speed: cruise varies; slower in glides/turns, faster if high ------
    const depthNorm = clamp01((this.position.y - c.heightMin) / (c.heightMax - c.heightMin))
    const cruise = c.minSpeed + (c.maxSpeed - c.minSpeed) * (0.45 + 0.35 * Math.sin(t * 0.19 + this.seed))
    const align = Math.max(0, this.desired.dot(this.forward))
    let targetSpeed = (this.gliding ? c.minSpeed * 1.05 : cruise) * (0.55 + 0.45 * align)
    targetSpeed *= 1 + c.depthSpeedBoost * depthNorm

    // --- Momentum: ease velocity toward desired velocity -------------------
    this.prevForward.copy(this.forward)
    this.tmp.copy(this.desired).multiplyScalar(targetSpeed)
    this.velocity.lerp(this.tmp, smooth(c.turnStrength, dt))
    this.speed = this.velocity.length()
    this.position.addScaledVector(this.velocity, dt)

    // Keep altitude inside its band.
    if (this.position.y < c.heightMin) this.position.y = c.heightMin
    else if (this.position.y > c.heightMax) this.position.y = c.heightMax

    // --- Heading (yaw) follows horizontal velocity only --------------------
    this.tmp.set(this.velocity.x, 0, this.velocity.z)
    if (this.tmp.lengthSq() > 1e-5) this.forward.copy(this.tmp).normalize()

    // --- Secondary drift + altitude bob ------------------------------------
    const driftX = Math.sin(t * 0.53 + this.seed) * 0.6 + Math.sin(t * 0.19 + 2.1) * 0.4
    const driftZ = Math.sin(t * 0.61 + 1.7) * 0.5 + Math.sin(t * 0.23 + this.seed) * 0.5
    const bob = Math.sin(t * 2.1 + this.seed) * c.verticalDrift * (0.5 + 0.5 * this.speedNorm)
    this.visualPosition.set(
      this.position.x + driftX * c.driftStrength * 0.35,
      this.position.y + bob,
      this.position.z + driftZ * c.driftStrength * 0.35
    )

    // --- Banking (roll) into horizontal turns; no pitch --------------------
    const turnCos = Math.max(0, this.forward.dot(this.prevForward))
    const turnSign = this.prevForward.x * this.forward.z - this.prevForward.z * this.forward.x
    const targetRoll = clampSym(turnSign * (1 - turnCos) * 45, c.bankAmount)
    this.roll += (targetRoll - this.roll) * smooth(3.5, dt)
  }

  get speedNorm(): number {
    const c = this.cfg
    return clamp01((this.speed - c.minSpeed) / (c.maxSpeed - c.minSpeed))
  }
}

function clampSym(v: number, limit: number): number {
  return v < -limit ? -limit : v > limit ? limit : v
}
