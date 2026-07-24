import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { DEFAULT_SETTINGS, type Settings } from '@shared/settings'

/**
 * Persistent, offline settings store backed by a single JSON file inside
 * Electron's per-user `userData` directory. This module is the ONLY place
 * that touches the filesystem for settings.
 */

/** Resolved lazily so it is only read after the app is ready. */
function settingsFilePath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

/**
 * Coerce arbitrary parsed JSON into a valid Settings object, discarding
 * unknown keys and falling back to defaults for missing or wrong-typed values.
 * This keeps a hand-edited or corrupt file from crashing the app.
 */
function sanitize(input: unknown): Settings {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>
  return {
    backgroundImage:
      typeof raw.backgroundImage === 'string' ? raw.backgroundImage : DEFAULT_SETTINGS.backgroundImage,
    use24Hour:
      typeof raw.use24Hour === 'boolean' ? raw.use24Hour : DEFAULT_SETTINGS.use24Hour,
    showSeconds:
      typeof raw.showSeconds === 'boolean' ? raw.showSeconds : DEFAULT_SETTINGS.showSeconds
  }
}

/** Write settings to disk, creating the userData directory if needed. */
function writeSettings(settings: Settings): Settings {
  const path = settingsFilePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(settings, null, 2), 'utf8')
  return settings
}

/**
 * Read the current settings. If the file is missing or unreadable, the
 * defaults are written to disk and returned.
 */
export function getSettings(): Settings {
  const path = settingsFilePath()
  if (!existsSync(path)) {
    return writeSettings(DEFAULT_SETTINGS)
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    return sanitize(parsed)
  } catch {
    // Corrupt file — reset to a known-good state.
    return writeSettings(DEFAULT_SETTINGS)
  }
}

/**
 * Merge a partial update onto the current settings, persist, and return the
 * full saved object.
 */
export function saveSettings(update: Partial<Settings>): Settings {
  const merged = sanitize({ ...getSettings(), ...update })
  return writeSettings(merged)
}
