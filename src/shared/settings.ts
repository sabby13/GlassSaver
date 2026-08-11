/**
 * Shared contract between the main and renderer processes.
 * Keep this file free of any Node or Electron imports so it can be
 * safely bundled into the renderer.
 */

export interface Settings {
  /** Absolute path to the user's chosen background image ("" = none). */
  backgroundImage: string
  /** Show a 24-hour clock when true, 12-hour when false. */
  use24Hour: boolean
  /** Show seconds in the clock when true. */
  showSeconds: boolean
  /** How many butterflies to show (0 to MAX_BUTTERFLIES). */
  butterflyCount: number
}

/** Maximum number of butterflies the screensaver will render. */
export const MAX_BUTTERFLIES = 3

export const DEFAULT_SETTINGS: Settings = {
  backgroundImage: '',
  use24Hour: true,
  showSeconds: false,
  butterflyCount: 1
}

/** Image formats accepted by the background picker. */
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const

/** IPC channel names, kept in one place to avoid stringly-typed drift. */
export const IPC = {
  getSettings: 'settings:get',
  saveSettings: 'settings:save',
  selectBackgroundImage: 'settings:select-image',
  /** Main → renderer broadcast when settings change, for live updates. */
  settingsChanged: 'settings:changed',
  /** Renderer → main request to quit the whole app. */
  quit: 'app:quit'
} as const
