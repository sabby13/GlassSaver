/**
 * Shared contract between the main and renderer processes.
 * Keep this file free of any Node or Electron imports so it can be
 * safely bundled into the renderer.
 */

export interface Settings {
  /**
   * The active wallpaper. Either a built-in reference of the form
   * `builtin:<id>` (see BUILTIN_WALLPAPER_IDS) or an absolute path to a
   * user-provided image.
   */
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

/** The wallpapers shipped with GlassButterfly, in display order. */
export const BUILTIN_WALLPAPER_IDS = ['rome', 'uwu', 'her'] as const
export type BuiltinWallpaperId = (typeof BUILTIN_WALLPAPER_IDS)[number]

const BUILTIN_PREFIX = 'builtin:'

/** Build a settings value referencing a built-in wallpaper, e.g. "builtin:rome". */
export function builtinWallpaper(id: BuiltinWallpaperId): string {
  return `${BUILTIN_PREFIX}${id}`
}

/** True if a backgroundImage value refers to a built-in wallpaper. */
export function isBuiltinWallpaper(value: string): boolean {
  return value.startsWith(BUILTIN_PREFIX)
}

/** The built-in id from a "builtin:<id>" value (unchecked; renderer validates). */
export function builtinWallpaperId(value: string): string {
  return value.slice(BUILTIN_PREFIX.length)
}

export const DEFAULT_SETTINGS: Settings = {
  backgroundImage: builtinWallpaper('rome'),
  use24Hour: true,
  showSeconds: false,
  butterflyCount: 1
}

/** Image formats accepted by the background picker. */
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const

/** IPC channel names, kept in one place to avoid stringly-typed drift. */
export const IPC = {
  getSettings: 'settings:get',
  /** Synchronous read used once at load so the first paint has the right wallpaper. */
  getSettingsSync: 'settings:get-sync',
  saveSettings: 'settings:save',
  selectBackgroundImage: 'settings:select-image',
  /** Main → renderer broadcast when settings change, for live updates. */
  settingsChanged: 'settings:changed',
  /** Renderer → main request to quit the whole app. */
  quit: 'app:quit'
} as const
