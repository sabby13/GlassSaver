import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, type Settings } from '@shared/settings'
import { toAssetUrl } from '../lib/assetUrl'
import defaultWallpaper from '../assets/default-wallpaper.svg'
import { Toggle } from './Toggle'
import './settings.css'

/** Last path segment of a file path (handles both / and \ separators). */
function basename(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

/**
 * The Settings window. Reads and writes settings through the preload bridge;
 * it never touches the filesystem directly. Saves are persisted and broadcast,
 * so the live screensaver updates as the user changes options here.
 */
export function SettingsApp(): JSX.Element {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    window.glass
      .getSettings()
      .then(setSettings)
      .catch(() => {
        /* keep defaults */
      })
    const off = window.glass.onSettingsChanged(setSettings)
    return off
  }, [])

  const update = async (patch: Partial<Settings>): Promise<void> => {
    const saved = await window.glass.saveSettings(patch)
    setSettings(saved)
  }

  const chooseImage = async (): Promise<void> => {
    setPicking(true)
    try {
      const path = await window.glass.selectBackgroundImage()
      if (path) await update({ backgroundImage: path })
    } finally {
      setPicking(false)
    }
  }

  const hasImage = settings.backgroundImage !== ''
  const previewSrc = hasImage ? toAssetUrl(settings.backgroundImage) : defaultWallpaper

  return (
    <div className="settings">
      <header className="settings__header">
        <h1 className="settings__title">GlassSaver</h1>
        <p className="settings__subtitle">Settings</p>
      </header>

      <section className="card">
        <div className="card__preview">
          <img
            src={previewSrc}
            alt=""
            onError={(event) => {
              event.currentTarget.src = defaultWallpaper
            }}
          />
        </div>
        <div className="card__row">
          <div className="card__text">
            <span className="card__label">Background</span>
            <span className="card__hint">
              {hasImage ? basename(settings.backgroundImage) : 'Default wallpaper'}
            </span>
          </div>
          <div className="card__actions">
            <button className="btn" onClick={chooseImage} disabled={picking}>
              {picking ? 'Choosing…' : 'Choose image…'}
            </button>
            {hasImage && (
              <button className="btn btn--ghost" onClick={() => update({ backgroundImage: '' })}>
                Use default
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card__row">
          <div className="card__text">
            <span className="card__label">24-hour time</span>
            <span className="card__hint">Show 13:00 instead of 1:00</span>
          </div>
          <Toggle
            checked={settings.use24Hour}
            onChange={(value) => update({ use24Hour: value })}
            label="24-hour time"
          />
        </div>
        <div className="card__divider" />
        <div className="card__row">
          <div className="card__text">
            <span className="card__label">Show seconds</span>
            <span className="card__hint">Display the seconds digits</span>
          </div>
          <Toggle
            checked={settings.showSeconds}
            onChange={(value) => update({ showSeconds: value })}
            label="Show seconds"
          />
        </div>
      </section>

      <footer className="settings__footer">
        <button className="btn btn--danger" onClick={() => window.glass.quit()}>
          Exit GlassSaver
        </button>
      </footer>
    </div>
  )
}
