/// <reference types="vite/client" />

// Vite emits .glb models as asset URLs.
declare module '*.glb' {
  const src: string
  export default src
}
