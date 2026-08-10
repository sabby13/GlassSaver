/**
 * Central, tunable configuration for the butterfly system. Every visual and
 * behavioural constant lives here so the feel can be dialled in without
 * touching the simulation code. World units are metres; the camera sits at
 * z = +CAMERA_DISTANCE looking toward -z.
 */
export interface ButterflyConfig {
  enabled: boolean

  /** Normalised world size (largest model dimension, in metres) after rescaling. */
  scale: number
  /** Overall material opacity ceiling (atmospheric fade multiplies under this). */
  opacity: number

  // --- Camera / space ---
  cameraDistance: number
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
  /** How hard the heading eases toward the target direction (per second). */
  turnStrength: number
  /** Strength of the slow secondary drift/bob. */
  driftStrength: number
  verticalDrift: number
  /** Max bank (roll) into a turn, radians. */
  bankAmount: number
  /** Max pitch from climb/dive, radians. */
  pitchAmount: number
  /** Chance per second of entering a short glide. */
  glideProbability: number

  // --- Clock keep-out (screen centre) ---
  /** Half-size of the region around the view axis the butterfly avoids dwelling in. */
  keepoutX: number
  keepoutY: number
  keepoutZ: number

  // --- Wings ---
  /** Base wing-beat playback rate (multiplier on the baked clip). */
  wingSpeed: number
  /** Index of the baked clip to use as the wing beat. */
  wingClipIndex: number

  // --- Orientation ---
  /**
   * Euler offset (radians) applied to the model so its authored forward axis
   * aligns with the flight forward (-z). Exposed because the GLB's forward
   * axis can only be confirmed visually.
   */
  modelOrientationOffset: [number, number, number]

  // --- Rendering ---
  /** Tone-mapping exposure; kept below 1 so the butterfly never outshines the scene. */
  exposure: number
  /** Cap on device pixel ratio to bound GPU cost on hi-dpi displays. */
  maxPixelRatio: number
}

export const butterflyConfig: ButterflyConfig = {
  enabled: true,

  scale: 0.9,
  opacity: 0.96,

  cameraDistance: 6,
  fov: 35,
  boundsX: 4.2,
  boundsY: 2.4,
  minDepth: -6,
  maxDepth: 1.2,

  minSpeed: 0.35,
  maxSpeed: 1.5,
  turnStrength: 1.1,
  driftStrength: 0.5,
  verticalDrift: 0.22,
  bankAmount: 0.6,
  pitchAmount: 0.28,
  glideProbability: 0.12,

  keepoutX: 1.7,
  keepoutY: 1.1,
  keepoutZ: 2.2,

  wingSpeed: 1.0,
  wingClipIndex: 0,

  modelOrientationOffset: [0, 0, 0],

  exposure: 0.85,
  maxPixelRatio: 2
}
