/**
 * Central, tunable configuration for the butterfly system.
 *
 * Coordinate model: the butterfly flies over a flat horizontal plane (world
 * X = screen horizontal, world Z = screen vertical) at a small altitude Y, and
 * the camera looks straight down. Because flight stays horizontal, the wing
 * tops always face the camera — a clean top-down view from any direction.
 */
export interface ButterflyConfig {
  enabled: boolean

  /** Base normalised world size (largest model dimension, metres). */
  scale: number
  /** Overall material opacity ceiling (atmospheric fade multiplies under this). */
  opacity: number

  // --- Camera (looks straight down) ---
  cameraHeight: number
  fov: number

  // --- Play area (on the ground plane) ---
  /** Half-extent left/right (world X). */
  areaX: number
  /** Half-extent up/down on screen (world Z). */
  areaY: number
  /** Altitude band above the plane (world Y). Higher = closer to camera = larger. */
  heightMin: number
  heightMax: number

  // --- Flight ---
  minSpeed: number
  maxSpeed: number
  /** How quickly velocity eases toward its target — lower = more momentum. */
  turnStrength: number
  /** Subtle speed increase at higher altitude (closer to camera). */
  depthSpeedBoost: number
  driftStrength: number
  /** Gentle altitude bob. */
  verticalDrift: number
  /** Max bank (roll) into a turn, radians. */
  bankAmount: number
  /** Chance per second of entering a short glide. */
  glideProbability: number

  // --- Hover (optional: confine to a spot on the plane) ---
  hover: boolean
  /** Hover centre on the plane [x, z]. -x = left, -z = up on screen. */
  hoverCenter: [number, number]
  hoverRadius: number

  // --- Clock keep-out (screen centre) ---
  keepoutX: number
  keepoutY: number

  // --- Multiple butterflies ---
  /** When two butterflies are closer than this on the plane, they lift apart. */
  separationRadius: number
  /** How much they lift in altitude so one clearly passes above the other. */
  separationLift: number

  // --- Wings ---
  wingSpeed: number
  /** How much the wing stroke opens/relaxes during glides (0..1). */
  wingAmplitude: number
  wingClipIndex: number

  // --- Orientation ---
  /** Euler offset (radians) aligning the model's authored forward with -z. */
  modelOrientationOffset: [number, number, number]

  // --- Rendering ---
  exposure: number
  envIntensity: number
  maxPixelRatio: number
}

export const butterflyConfig: ButterflyConfig = {
  enabled: true,

  scale: 1.8,
  opacity: 0.97,

  cameraHeight: 9,
  fov: 42,

  areaX: 6,
  areaY: 2.6,
  heightMin: -0.4,
  heightMax: 1.8,

  minSpeed: 0.35,
  maxSpeed: 1.5,
  turnStrength: 0.6,
  depthSpeedBoost: 0.3,
  driftStrength: 0.5,
  verticalDrift: 0.18,
  bankAmount: 0.28,
  glideProbability: 0.14,

  hover: false,
  hoverCenter: [-2.4, 1.0],
  hoverRadius: 1.35,

  keepoutX: 1.7,
  keepoutY: 0.9,

  separationRadius: 1.7,
  separationLift: 0.8,

  wingSpeed: 1.7,
  wingAmplitude: 0.2,
  wingClipIndex: 0,

  modelOrientationOffset: [0, Math.PI, 0],

  exposure: 0.95,
  envIntensity: 0.35,
  maxPixelRatio: 2
}
