import {
  BUILTIN_WALLPAPER_IDS,
  builtinWallpaperId,
  isBuiltinWallpaper,
  type BuiltinWallpaperId
} from '@shared/settings'
import { toAssetUrl } from './assetUrl'
import romeUrl from '../assets/rome.jpg'
import uwuUrl from '../assets/uwu.jpg'
import herUrl from '../assets/her.jpg'

/** Bundled URLs for the shipped built-in wallpapers (Vite-emitted assets). */
const BUILTIN_URLS: Record<BuiltinWallpaperId, string> = {
  rome: romeUrl,
  uwu: uwuUrl,
  her: herUrl
}

/** Human labels for the built-in wallpapers. */
const BUILTIN_LABELS: Record<BuiltinWallpaperId, string> = {
  rome: 'Rome',
  uwu: 'Uwu',
  her: 'Her'
}

export interface BuiltinWallpaper {
  id: BuiltinWallpaperId
  label: string
  url: string
}

/** The built-in wallpaper collection, in display order, for the settings picker. */
export const BUILTIN_WALLPAPERS: readonly BuiltinWallpaper[] = BUILTIN_WALLPAPER_IDS.map((id) => ({
  id,
  label: BUILTIN_LABELS[id],
  url: BUILTIN_URLS[id]
}))

/** The wallpaper shown on a fresh install / when a value can't be resolved. */
export const DEFAULT_WALLPAPER_URL = BUILTIN_URLS.rome

/**
 * Resolve a settings backgroundImage value to a displayable URL:
 *   - "builtin:<id>"  -> the bundled JPG (falls back to Rome if unknown)
 *   - absolute path   -> served through the glass-asset protocol
 *   - empty/invalid   -> Rome
 */
export function resolveWallpaperUrl(value: string): string {
  if (isBuiltinWallpaper(value)) {
    const id = builtinWallpaperId(value) as BuiltinWallpaperId
    return BUILTIN_URLS[id] ?? DEFAULT_WALLPAPER_URL
  }
  if (value) return toAssetUrl(value)
  return DEFAULT_WALLPAPER_URL
}
