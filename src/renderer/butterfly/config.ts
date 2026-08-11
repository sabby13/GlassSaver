/**
 * Central, tunable configuration for the butterfly system. Every visual and
 * behavioural constant lives here so the feel can be dialled in without
 * touching the simulation code. World units are metres; the camera sits at
 * z = +cameraDistance looking toward -z.
 */
export interface ButterflyConfig {
  enabled: boolean

  /** Base normalised world size (largest model dimension, metres). Depth makes
   *  the apparent size vary around this via perspective. */
  scale: number
  /** Overall material opacity ceiling (atmospheric fade multiplies under this). */
  opacity: number

  // --- Camera / space ---
  cameraDistance: number
  /** Camera height above the butterfly — looks down so the wing tops face us. */
  cameraHeight: number
  fov: number
  /** Half-extents of the wander box in view space (x, y) at the z=0 plane. */
  boundsX: number
  boundsY: number
  /** Depth range the butterfly roams: more negative = further from camera. */
  minDepth: number
  maxDepth: number

  // --- Flight ---
  minSpeed: number
  maxSpeed: number
  /** How quickly velocity eases toward its target — lower = more momentum/inertia. */
  turnStrength: number
  /** Subtle speed increase when close to the camera (0 = none). */
  depthSpeedBoost: number
  /** Strength of the slow secondary drift. */
  driftStrength: number
  verticalDrift: number
  /** Max bank (roll) into a turn, radians. */
  bankAmount: number
  /** Max pitch from climb/dive, radians. */
  pitchAmount: number
  /** Chance per second of entering a short glide. */
  glideProbability: number

  // --- Hover ---
  /** Confine flight to a small area (a gentle hover) instead of the whole screen. */
  hover: boolean
  /** Centre of the hover area in view space [x, y, z]. -x = left, -y = down. */
  hoverCenter: [number, number, number]
  /** Radius of the hover area (x/y), world units. */
  hoverRadius: number

  // --- Clock keep-out (screen centre) ---
  keepoutX: number
  keepoutY: number
  /** Depth band around the clock plane where avoidance is strongest. */
  keepoutZ: number

  // --- Wings ---
  /** Base wing-beat playback rate (multiplier on the baked clip). */
  wingSpeed: number
  /** How much the wing stroke opens/relaxes during glides (0..1). */
  wingAmplitude: number
  /** Index of the baked clip to use as the wing beat. */
  wingClipIndex: number

  // --- Orientation ---
  /** Euler offset (radians) aligning the model's authored forward with -z. */
  modelOrientationOffset: [number, number, number]

  // --- Rendering ---
  exposure: number
  /** Environment-map reflection strength on the butterfly (grounds it in the scene). */
  envIntensity: number
  maxPixelRatio: number
}

export const butterflyConfig: ButterflyConfig = {
  enabled: true,

  scale: 1.7,
  opacity: 0.97,

  cameraDistance: 3.5,
  cameraHeight: 8,
  fov: 35,
  boundsX: 4.2,
  boundsY: 2.5,
  minDepth: -5.5,
  maxDepth: 1.0,

  minSpeed: 0.35,
  maxSpeed: 1.5,
  turnStrength: 1.3,
  depthSpeedBoost: 0.35,
  driftStrength: 0.5,
  verticalDrift: 0.22,
  bankAmount: 0.22,
  pitchAmount: 0.1,
  glideProbability: 0.14,

  hover: false,
  hoverCenter: [-2.4, -1.3, 0.2],
  hoverRadius: 1.35,

  keepoutX: 1.7,
  keepoutY: 1.1,
  keepoutZ: 2.0,

  wingSpeed: 1.7,
  wingAmplitude: 0.2,
  wingClipIndex: 0,

  modelOrientationOffset: [0, Math.PI, 0],

  exposure: 0.95,
  envIntensity: 0.35,
  maxPixelRatio: 2
}
