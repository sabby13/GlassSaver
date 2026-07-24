import { useEffect, useState } from 'react'
import { toAssetUrl } from '../lib/assetUrl'
import defaultWallpaper from '../assets/default-wallpaper.svg'
import './Background.css'

/**
 * The single component responsible for displaying the wallpaper.
 *
 * On mount it reads the persisted settings and shows the saved image. If no
 * image is set — or the file can no longer be loaded — it falls back to the
 * bundled default wallpaper. The `<img onError>` fallback covers a deleted or
 * moved file without the renderer ever touching the filesystem.
 */
export function Background(): JSX.Element {
  const [src, setSrc] = useState<string>(defaultWallpaper)

  useEffect(() => {
    let active = true

    const apply = (backgroundImage: string): void => {
      setSrc(backgroundImage ? toAssetUrl(backgroundImage) : defaultWallpaper)
    }

    window.glass
      .getSettings()
      .then((settings) => {
        if (active) apply(settings.backgroundImage)
      })
      .catch(() => {
        if (active) setSrc(defaultWallpaper)
      })

    // Swap the wallpaper live when it is changed in the Settings window.
    const off = window.glass.onSettingsChanged((settings) => apply(settings.backgroundImage))
    return () => {
      active = false
      off()
    }
  }, [])

  const handleError = (): void => {
    if (src !== defaultWallpaper) setSrc(defaultWallpaper)
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
