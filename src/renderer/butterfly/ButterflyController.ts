import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Clock,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three'
import type { Material, Object3D, Texture } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { butterflyConfig, type ButterflyConfig } from './config'
import { FlightModel } from './FlightModel'
import { WingController } from './WingController'

const FORWARD = new Vector3(0, 0, -1)
const UP = new Vector3(0, 1, 0)

/**
 * Owns a small, isolated Three.js scene that renders a single butterfly flying
 * through space in front of (behind, in DOM terms, transparent over) the
 * wallpaper. Framework-agnostic: construct with a canvas, call start(), and
 * dispose() when done. Runs its own rAF loop; never touches React.
 */
export class ButterflyController {
  private readonly cfg: ButterflyConfig
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera
  private readonly clock = new Clock()
  private readonly flight: FlightModel

  private pivot: Group | null = null
  private wings: WingController | null = null
  private readonly materials: Material[] = []

  // Reused each frame — no per-frame allocation.
  private readonly q1 = new Quaternion()
  private readonly qRoll = new Quaternion()
  private readonly qPitch = new Quaternion()
  private readonly right = new Vector3()

  private rafId = 0
  private running = false
  private disposed = false

  constructor(canvas: HTMLCanvasElement, config: ButterflyConfig = butterflyConfig) {
    this.cfg = config
    this.flight = new FlightModel(config)

    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.maxPixelRatio))
    // Fully transparent clear so only the butterfly is drawn; the wallpaper and
    // clock show through everywhere else.
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = config.exposure
    this.renderer.outputColorSpace = SRGBColorSpace

    this.camera = new PerspectiveCamera(config.fov, 1, 0.1, 100)
    this.camera.position.set(0, 0, config.cameraDistance)
    this.camera.lookAt(0, 0, 0)

    // Soft, ambient-leaning lighting so the butterfly sits in the scene rather
    // than being spotlit. Nothing bright enough to outshine the wallpaper.
    const hemi = new HemisphereLight(0xffffff, 0x3a3a44, 1.1)
    const key = new DirectionalLight(0xffffff, 1.2)
    key.position.set(2.5, 4, 3)
    const ambient = new AmbientLight(0xffffff, 0.25)
    this.scene.add(hemi, key, ambient)

    this.resize()
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  /** Load the model, then begin animating. Safe to call once. */
  async load(url: string): Promise<void> {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)
    if (this.disposed) return

    const model = gltf.scene

    // Normalise: recenter to origin and rescale to the configured world size,
    // rather than trusting the GLB's authored (×100) units.
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    model.position.sub(center)
    model.rotation.set(...this.cfg.modelOrientationOffset)

    this.pivot = new Group()
    this.pivot.add(model)
    this.pivot.scale.setScalar(this.cfg.scale / maxDim)
    this.scene.add(this.pivot)

    // Collect materials for opacity fades; tame any excessive brightness.
    model.traverse((obj: Object3D) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        if (!m) continue
        m.transparent = true
        m.opacity = 0
        const std = m as Material & { envMapIntensity?: number }
        if (typeof std.envMapIntensity === 'number') std.envMapIntensity = 0.6
        this.materials.push(m)
      }
    })

    // Use a baked wing clip if present; otherwise the butterfly simply glides.
    const clips = gltf.animations
    if (clips.length > 0) {
      const idx = Math.min(Math.max(this.cfg.wingClipIndex, 0), clips.length - 1)
      this.wings = new WingController(model, clips[idx], this.cfg)
    }
  }

  start(): void {
    if (this.running || this.disposed) return
    this.running = true
    this.clock.start()
    this.rafId = requestAnimationFrame(this.tick)
  }

  private tick = (): void => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.tick)
    try {
      this.frame()
    } catch (err) {
      // Never let a render error spin or crash the app — stop cleanly.
      this.running = false
      cancelAnimationFrame(this.rafId)
      console.error('Butterfly render stopped:', err)
    }
  }

  private frame(): void {
    // Clamp dt so a long pause (e.g. tab hidden) never causes a jump.
    const dt = Math.min(this.clock.getDelta(), 0.05)

    this.flight.update(dt)

    if (this.pivot) {
      const f = this.flight.forward
      this.pivot.position.copy(this.flight.visualPosition)

      // Aim along the velocity, bank (roll) into the turn, add a little pitch.
      this.q1.setFromUnitVectors(FORWARD, f)
      this.qRoll.setFromAxisAngle(f, this.flight.roll)
      this.pivot.quaternion.copy(this.qRoll).multiply(this.q1)
      this.right.crossVectors(UP, f).normalize()
      this.qPitch.setFromAxisAngle(this.right, -this.flight.pitch)
      this.pivot.quaternion.premultiply(this.qPitch)

      // Opacity: entrance/exit presence × subtle atmospheric fade with depth.
      const depthT = clamp01((this.flight.position.z - this.cfg.minDepth) / (0 - this.cfg.minDepth))
      const depthFade = 0.55 + 0.45 * depthT
      const opacity = this.cfg.opacity * this.flight.presence * depthFade
      for (const m of this.materials) m.opacity = opacity

      this.wings?.update(dt, this.flight.speedNorm)
    }

    this.renderer.render(this.scene, this.camera)
  }

  private resize = (): void => {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  private onVisibility = (): void => {
    if (document.hidden) {
      this.running = false
      cancelAnimationFrame(this.rafId)
    } else if (!this.disposed) {
      this.start()
    }
  }

  dispose(): void {
    this.disposed = true
    this.running = false
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.resize)
    document.removeEventListener('visibilitychange', this.onVisibility)

    this.wings?.dispose()
    this.scene.traverse((obj: Object3D) => {
      const mesh = obj as Mesh
      if (mesh.isMesh) {
        mesh.geometry?.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          if (!m) continue
          const withMaps = m as Material & Record<string, unknown>
          for (const key of Object.keys(withMaps)) {
            const value = withMaps[key] as Texture | undefined
            if (value && (value as Texture).isTexture) value.dispose()
          }
          m.dispose()
        }
      }
    })
    // Note: no forceContextLoss() — it permanently kills the canvas's WebGL
    // context, which breaks React StrictMode's dev re-mount (a new renderer on
    // the same canvas would get a null/lost context). dispose() frees the GPU
    // resources; the context is released with the canvas on real teardown.
    this.renderer.dispose()
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}
