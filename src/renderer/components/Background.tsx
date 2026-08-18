import { useEffect, useRef, useState } from 'react'
import { DEFAULT_SETTINGS } from '@shared/settings'
import { DEFAULT_WALLPAPER_URL, resolveWallpaperUrl } from '../lib/wallpapers'
import './Background.css'

/**
 * The single component responsible for displaying the wallpaper.
 *
 * The saved setting is read synchronously at load (via the preload bridge), so
 * the very first render already targets the correct wallpaper — no default-then
 * -swap flash. Once the image decodes it notifies the main process, which then
 * reveals the (previously hidden) window, so the first visible frame is the
 * right image. A built-in JPG or the user's custom image (served through the
 * glass-asset protocol) both work; the renderer never touches the filesystem.
 */
export function Background(): JSX.Element {
  const initial = window.glass?.initialSettings ?? DEFAULT_SETTINGS
  const [src, setSrc] = useState<string>(() => resolveWallpaperUrl(initial.backgroundImage))
  const notified = useRef(false)

  useEffect(() => {
    let active = true
    const apply = (backgroundImage: string): void => {
      if (active) setSrc(resolveWallpaperUrl(backgroundImage))
    }

    // Correct against the authoritative value (covers a rare sync-read miss),
    // then track live changes from the Settings window.
    window.glass
      .getSettings()
      .then((settings) => apply(settings.backgroundImage))
      .catch(() => {
        /* keep the synchronous initial value */
      })
    const off = window.glass.onSettingsChanged((settings) => apply(settings.backgroundImage))
    return () => {
      active = false
      off()
    }
  }, [])

  const signalReady = (): void => {
    if (notified.current) return
    notified.current = true
    window.glass?.notifyWallpaperReady?.()
  }

  const handleError = (): void => {
    if (src !== DEFAULT_WALLPAPER_URL) setSrc(DEFAULT_WALLPAPER_URL)
    // Still reveal the window even if the image failed, so it never stays hidden.
    signalReady()
  }

  return (
    <div className="background">
      <img
        className="background__image"
        src={src}
        alt=""
        draggable={false}
        onLoad={signalReady}
        onError={handleError}
      />
    </div>
  )
}
