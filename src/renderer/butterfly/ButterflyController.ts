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
  PMREMGenerator,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three'
import type { AnimationClip, Material, Object3D, Texture } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { MAX_BUTTERFLIES } from '@shared/settings'
import { butterflyConfig, type ButterflyConfig } from './config'
import { FlightModel } from './FlightModel'
import { WingController } from './WingController'

const FORWARD = new Vector3(0, 0, -1)
const UP = new Vector3(0, 1, 0)
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

interface Butterfly {
  pivot: Group
  flight: FlightModel
  wings: WingController | null
  materials: Material[]
  /** Smoothed altitude offset that lifts this one apart from close neighbours. */
  sepY: number
}

/**
 * Owns one isolated Three.js scene that renders up to a few butterflies flying
 * over a flat plane, viewed straight down. A single renderer and a single rAF
 * loop drive all of them. Construct with a canvas, load() the model once, then
 * setCount(n) to show n butterflies; dispose() when done. Never touches React.
 */
export class ButterflyController {
  private readonly cfg: ButterflyConfig
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera
  private readonly clock = new Clock()

  private baseModel: Object3D | null = null
  private clips: AnimationClip[] = []
  private scaleFactor = 1
  private envTexture: Texture | null = null

  private readonly butterflies: Butterfly[] = []
  private desiredCount = 0
  private loaded = false

  // Reused each frame — no per-frame allocation.
  private readonly q1 = new Quaternion()
  private readonly qRoll = new Quaternion()
  private readonly qPitch = new Quaternion()
  private readonly right = new Vector3()
  private readonly tmpPos = new Vector3()

  private rafId = 0
  private running = false
  private disposed = false

  constructor(canvas: HTMLCanvasElement, config: ButterflyConfig = butterflyConfig) {
    this.cfg = config

    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.maxPixelRatio))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = config.exposure
    this.renderer.outputColorSpace = SRGBColorSpace

    this.camera = new PerspectiveCamera(config.fov, 1, 0.1, 100)
    // Looks straight down so the wing tops always face us. Up = -Z maps
    // screen-vertical to world Z.
    this.camera.up.set(0, 0, -1)
    this.camera.position.set(0, config.cameraHeight, 0)
    this.camera.lookAt(0, 0, 0)

    const hemi = new HemisphereLight(0xffffff, 0x3a3a44, 1.1)
    const key = new DirectionalLight(0xffffff, 1.2)
    key.position.set(2.5, 4, 3)
    const ambient = new AmbientLight(0xffffff, 0.25)
    this.scene.add(hemi, key, ambient)

    // Neutral environment (generated once) for soft realistic material response.
    const pmrem = new PMREMGenerator(this.renderer)
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environment = this.envTexture
    pmrem.dispose()

    this.resize()
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  /** Load the model once and normalise it into a reusable, centred template. */
  async load(url: string): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url)
    if (this.disposed) return

    const model = gltf.scene
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    model.position.sub(center)
    model.rotation.set(...this.cfg.modelOrientationOffset)

    this.baseModel = model
    this.clips = gltf.animations
    this.scaleFactor = this.cfg.scale / maxDim
    this.loaded = true
    this.reconcile()
  }

  /** Show exactly `n` butterflies (0..MAX_BUTTERFLIES). Safe before load. */
  setCount(n: number): void {
    this.desiredCount = Math.min(MAX_BUTTERFLIES, Math.max(0, Math.round(n)))
    this.reconcile()
    if (this.desiredCount > 0) this.start()
    else this.stopAndClear()
  }

  private reconcile(): void {
    if (!this.loaded || this.disposed) return
    while (this.butterflies.length < this.desiredCount) this.addButterfly()
    while (this.butterflies.length > this.desiredCount) this.removeButterfly()
  }

  private addButterfly(): void {
    if (!this.baseModel) return
    // SkeletonUtils.clone gives each butterfly its own skeleton so their wing
    // animations are independent. Geometry stays shared (cheap); materials are
    // cloned so each can fade with its own depth.
    const model = cloneSkinned(this.baseModel)
    const materials: Material[] = []
    model.traverse((obj: Object3D) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      const src = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const cloned = src.map((m) => {
        const cm = m.clone()
        cm.transparent = true
        cm.opacity = 0
        const std = cm as Material & { envMapIntensity?: number }
        if (typeof std.envMapIntensity === 'number') std.envMapIntensity = this.cfg.envIntensity
        materials.push(cm)
        return cm
      })
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0]
    })

    const pivot = new Group()
    pivot.add(model)
    pivot.scale.setScalar(this.scaleFactor)
    this.scene.add(pivot)

    let wings: WingController | null = null
    if (this.clips.length > 0) {
      const idx = Math.min(Math.max(this.cfg.wingClipIndex, 0), this.clips.length - 1)
      wings = new WingController(model, this.clips[idx], this.cfg)
    }

    this.butterflies.push({ pivot, flight: new FlightModel(this.cfg), wings, materials, sepY: 0 })
  }

  private removeButterfly(): void {
    const b = this.butterflies.pop()
    if (!b) return
    b.wings?.dispose()
    this.scene.remove(b.pivot)
    // Only dispose the per-instance cloned materials; geometry is shared.
    for (const m of b.materials) m.dispose()
  }

  start(): void {
    if (this.running || this.disposed || this.desiredCount <= 0) return
    this.running = true
    this.clock.start()
    this.rafId = requestAnimationFrame(this.tick)
  }

  private stopAndClear(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
    // Render the now-empty scene once so no frozen butterfly lingers.
    if (!this.disposed) this.renderer.render(this.scene, this.camera)
  }

  private tick = (): void => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.tick)
    try {
      this.frame()
    } catch (err) {
      this.running = false
      cancelAnimationFrame(this.rafId)
      console.error('Butterfly render stopped:', err)
    }
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const list = this.butterflies
    const n = list.length

    for (const b of list) b.flight.update(dt)

    // Depth separation: when two butterflies are close on the plane, ease their
    // altitudes apart (lower index rises, higher index sinks) so one clearly
    // flies above the other instead of their bodies intersecting.
    if (n > 1) {
      const rad = this.cfg.separationRadius
      const damp = 1 - Math.exp(-3 * dt)
      for (let i = 0; i < n; i++) {
        const pi = list[i].flight.position
        let targetSep = 0
        for (let k = 0; k < n; k++) {
          if (k === i) continue
          const pk = list[k].flight.position
          const dx = pi.x - pk.x
          const dz = pi.z - pk.z
          const d = Math.hypot(dx, dz)
          if (d < rad) targetSep += (i < k ? 1 : -1) * this.cfg.separationLift * (1 - d / rad)
        }
        list[i].sepY += (targetSep - list[i].sepY) * damp
      }
    } else if (n === 1) {
      list[0].sepY = 0
    }

    for (const b of list) {
      const f = b.flight.forward
      this.tmpPos.copy(b.flight.visualPosition)
      this.tmpPos.y += b.sepY
      b.pivot.position.copy(this.tmpPos)

      this.q1.setFromUnitVectors(FORWARD, f)
      this.qRoll.setFromAxisAngle(f, b.flight.roll)
      b.pivot.quaternion.copy(this.qRoll).multiply(this.q1)
      this.right.crossVectors(UP, f).normalize()
      this.qPitch.setFromAxisAngle(this.right, -b.flight.pitch)
      b.pivot.quaternion.premultiply(this.qPitch)

      const depthT = clamp01(
        (b.flight.position.y - this.cfg.heightMin) / (this.cfg.heightMax - this.cfg.heightMin)
      )
      const opacity = this.cfg.opacity * b.flight.presence * (0.6 + 0.4 * depthT)
      for (const m of b.materials) m.opacity = opacity

      b.wings?.update(dt, b.flight.speedNorm)
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
    } else if (!this.disposed && this.desiredCount > 0) {
      this.start()
    }
  }

  dispose(): void {
    this.disposed = true
    this.running = false
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.resize)
    document.removeEventListener('visibilitychange', this.onVisibility)

    for (const b of this.butterflies) {
      b.wings?.dispose()
      for (const m of b.materials) m.dispose()
    }
    this.butterflies.length = 0

    this.envTexture?.dispose()
    // Shared geometry lives on the base template — dispose it once.
    this.baseModel?.traverse((obj: Object3D) => {
      const mesh = obj as Mesh
      if (mesh.isMesh) mesh.geometry?.dispose()
    })
    this.renderer.dispose()
  }
}
