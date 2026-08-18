import { useEffect, useState } from 'react'
import {
  builtinWallpaper,
  builtinWallpaperId,
  DEFAULT_SETTINGS,
  isBuiltinWallpaper,
  MAX_BUTTERFLIES,
  type Settings
} from '@shared/settings'
import {
  BUILTIN_WALLPAPERS,
  DEFAULT_WALLPAPER_URL,
  resolveWallpaperUrl
} from '../lib/wallpapers'
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

  const bg = settings.backgroundImage
  const isBuiltin = isBuiltinWallpaper(bg)
  const activeBuiltinId = isBuiltin ? builtinWallpaperId(bg) : null
  const previewSrc = resolveWallpaperUrl(bg)
  const currentLabel = isBuiltin
    ? (BUILTIN_WALLPAPERS.find((w) => w.id === activeBuiltinId)?.label ?? 'Built-in')
    : basename(bg)
  const counts = Array.from({ length: MAX_BUTTERFLIES + 1 }, (_, i) => i)

  return (
    <div className="settings">
      <header className="settings__header">
        <h1 className="settings__title">GlassButterfly</h1>
        <p className="settings__subtitle">Settings</p>
      </header>

      <section className="card">
        <div className="card__preview">
          <img
            src={previewSrc}
            alt=""
            onError={(event) => {
              event.currentTarget.src = DEFAULT_WALLPAPER_URL
            }}
          />
        </div>
        <div className="card__row">
          <div className="card__text">
            <span className="card__label">Background</span>
            <span className="card__hint">{currentLabel}</span>
          </div>
          <button className="btn" onClick={chooseImage} disabled={picking}>
            {picking ? 'Choosing…' : 'Choose image…'}
          </button>
        </div>
        <div className="card__divider" />
        <div className="wallpaper-thumbs" role="group" aria-label="Built-in wallpapers">
          {BUILTIN_WALLPAPERS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={activeBuiltinId === w.id ? 'thumb thumb--on' : 'thumb'}
              style={{ backgroundImage: `url(${w.url})` }}
              aria-label={w.label}
              aria-pressed={activeBuiltinId === w.id}
              onClick={() => update({ backgroundImage: builtinWallpaper(w.id) })}
            />
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card__row">
          <div className="card__text">
            <span className="card__label">24-hour time</span>
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
          </div>
          <Toggle
            checked={settings.showSeconds}
            onChange={(value) => update({ showSeconds: value })}
            label="Show seconds"
          />
        </div>
      </section>

      <section className="card">
        <div className="card__row">
          <div className="card__text">
            <span className="card__label">Butterflies</span>
          </div>
          <div className="segmented" role="group" aria-label="Butterfly count">
            {counts.map((n) => (
              <button
                key={n}
                type="button"
                className={
                  settings.butterflyCount === n ? 'segmented__item segmented__item--on' : 'segmented__item'
                }
                aria-pressed={settings.butterflyCount === n}
                onClick={() => update({ butterflyCount: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="settings__footer">
        <button className="btn btn--danger" onClick={() => window.glass.quit()}>
          Exit GlassButterfly
        </button>
      </footer>
    </div>
  )
}
