import type { GlassButterflyApi } from './index'

declare global {
  interface Window {
    glass: GlassButterflyApi
  }
}

export {}
