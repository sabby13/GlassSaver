import { useEffect, useRef } from 'react'
import { ButterflyController, butterflyConfig } from '../butterfly'
import butterflyModel from '../assets/butterfly.glb'
import './ButterflyLayer.css'

/**
 * Additive foreground layer hosting the 3D butterflies on a transparent canvas.
 * The imperative controller owns the animation loop, so this mounts once and
 * never re-renders per frame. The number of butterflies is driven by the
 * persisted `butterflyCount` setting and updates live.
 */
export function ButterflyLayer(): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!butterflyConfig.enabled) return
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let controller: ButterflyController | null = null
    let unsubscribe: (() => void) | undefined

    try {
      controller = new ButterflyController(canvas, butterflyConfig)

      // Apply the saved count, and load the model (which then builds them).
      window.glass
        .getSettings()
        .then((s) => {
          if (!cancelled) controller?.setCount(s.butterflyCount)
        })
        .catch(() => {
          /* leave at default */
        })
      controller.load(butterflyModel).catch((err) => {
        console.warn('Butterfly failed to load:', err)
      })

      // Live-update the count when it changes in Settings.
      unsubscribe = window.glass.onSettingsChanged((s) => controller?.setCount(s.butterflyCount))
    } catch (err) {
      console.warn('Butterfly init failed:', err)
      controller?.dispose()
      controller = null
    }

    return () => {
      cancelled = true
      unsubscribe?.()
      controller?.dispose()
    }
  }, [])

  if (!butterflyConfig.enabled) return null
  return <canvas ref={canvasRef} className="butterfly-layer" aria-hidden="true" />
}
