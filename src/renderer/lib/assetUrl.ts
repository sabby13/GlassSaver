import { ASSET_SCHEME } from '@shared/asset'

/**
 * Turn an absolute filesystem path into a URL the renderer can load through
 * the custom `glass-asset` protocol. The renderer never uses raw file:// URLs.
 */
export function toAssetUrl(absolutePath: string): string {
  return `${ASSET_SCHEME}://local/?src=${encodeURIComponent(absolutePath)}`
}
