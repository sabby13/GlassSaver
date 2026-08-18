import type { Settings } from './settings'

/**
 * The API surface exposed to the renderer as `window.glass`.
 *
 * Declared here, free of any Electron or Node types, so the renderer can type
 * `window.glass` without importing the preload's Electron-based implementation.
 * The preload implements this interface; a renderer-scoped declaration augments
 * `Window` with it.
 */
export interface GlassApi {
  /** The persisted settings, read synchronously at load. */
  initialSettings: Settings
  /** Read the persisted settings. */
  getSettings(): Promise<Settings>
  /** Persist a full or partial settings update; resolves to the saved settings. */
  saveSettings(patch: Partial<Settings>): Promise<Settings>
  /** Open the native image picker; resolves to the chosen path, or null. */
  selectBackgroundImage(): Promise<string | null>
  /** Quit the whole application. */
  quit(): void
  /** Subscribe to settings changes; returns an unsubscribe function. */
  onSettingsChanged(callback: (settings: Settings) => void): () => void
}
