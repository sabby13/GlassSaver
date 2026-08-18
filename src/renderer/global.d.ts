import type { GlassApi } from '@shared/api'

// Renderer-scoped declaration of the preload bridge. Imports only the
// Electron-free shared contract, so the renderer never pulls Electron types.
declare global {
  interface Window {
    glass: GlassApi
  }
}

export {}
