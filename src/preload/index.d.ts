import type { GlassSaverApi } from './index'

declare global {
  interface Window {
    glass: GlassSaverApi
  }
}

export {}
