/**
 * Name of the custom protocol used to display on-disk images in the renderer.
 * Shared so the main-process handler and the renderer URL builder agree.
 * Node/Electron-free so it is safe to bundle into the renderer.
 */
export const ASSET_SCHEME = 'glass-asset'
