import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS } from '@shared/settings'
import { DEFAULT_WALLPAPER_URL, resolveWallpaperUrl } from '../lib/wallpapers'
import './Background.css'

/**
 * The single component responsible for displaying the wallpaper.
 *
 * On mount it reads the persisted setting and shows the resolved wallpaper —
 * a built-in JPG (`builtin:<id>`) or the user's custom image served through the
 * glass-asset protocol. If the image can't load (e.g. a moved custom file), it
 * falls back to the built-in default. The renderer never touches the filesystem.
 */
export function Background(): JSX.Element {
  const [src, setSrc] = useState<string>(() =>
    resolveWallpaperUrl(DEFAULT_SETTINGS.backgroundImage)
  )

  useEffect(() => {
    let active = true

    const apply = (backgroundImage: string): void => {
      setSrc(resolveWallpaperUrl(backgroundImage))
    }

    window.glass
      .getSettings()
      .then((settings) => {
        if (active) apply(settings.backgroundImage)
      })
      .catch(() => {
        if (active) apply(DEFAULT_SETTINGS.backgroundImage)
      })

    // Swap the wallpaper live when it is changed in the Settings window.
    const off = window.glass.onSettingsChanged((settings) => apply(settings.backgroundImage))
    return () => {
      active = false
      off()
    }
  }, [])

  const handleError = (): void => {
    if (src !== DEFAULT_WALLPAPER_URL) setSrc(DEFAULT_WALLPAPER_URL)
  }

  return (
    <div className="background">
      <img
        className="background__image"
        src={src}
        alt=""
        draggable={false}
        onError={handleError}
      />
    </div>
  )
}
