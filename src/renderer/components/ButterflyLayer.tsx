import { useEffect, useRef } from 'react'
import { ButterflyController, butterflyConfig } from '../butterfly'
import butterflyModel from '../assets/butterfly.glb'
import './ButterflyLayer.css'

/**
 * Additive foreground layer that hosts the 3D butterfly on its own transparent
 * canvas. The imperative controller owns the animation loop, so this component
 * mounts once and never re-renders per frame. Honours reduced-motion and the
 * config's `enabled` flag.
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
    try {
      controller = new ButterflyController(canvas, butterflyConfig)
      controller
        .load(butterflyModel)
        .then(() => {
          if (!cancelled) controller?.start()
        })
        .catch((err) => {
          console.warn('Butterfly failed to load:', err)
        })
    } catch (err) {
      // WebGL/init failure must never take down the clock. Fail silently.
      console.warn('Butterfly init failed:', err)
      controller?.dispose()
      controller = null
    }

    return () => {
      cancelled = true
      controller?.dispose()
    }
  }, [])

  if (!butterflyConfig.enabled) return null
  return <canvas ref={canvasRef} className="butterfly-layer" aria-hidden="true" />
}
