import { contextBridge, ipcRenderer } from 'electron'
import { DEFAULT_SETTINGS, IPC, type Settings } from '@shared/settings'

// Read once, synchronously, before the page runs — so the first render already
// knows the wallpaper and there is no default-then-swap flash.
let initialSettings: Settings
try {
  initialSettings = (ipcRenderer.sendSync(IPC.getSettingsSync) as Settings) ?? DEFAULT_SETTINGS
} catch {
  initialSettings = DEFAULT_SETTINGS
}

/**
 * The single, typed surface the renderer is allowed to touch.
 * All filesystem and native-dialog work stays in the main process.
 */
const api = {
  /** The persisted settings, read synchronously at load. */
  initialSettings,

  /** Read the persisted settings. */
  getSettings: (): Promise<Settings> => ipcRenderer.invoke(IPC.getSettings),

  /** Persist a full or partial settings update; resolves to the saved settings. */
  saveSettings: (settings: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(IPC.saveSettings, settings),

  /** Open the native image picker; resolves to the chosen path, or null if cancelled. */
  selectBackgroundImage: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.selectBackgroundImage),

  /** Quit the whole application. */
  quit: (): void => ipcRenderer.send(IPC.quit),

  /**
   * Subscribe to settings changes pushed from the main process.
   * Returns an unsubscribe function.
   */
  onSettingsChanged: (callback: (settings: Settings) => void): (() => void) => {
    const listener = (_event: unknown, settings: Settings): void => callback(settings)
    ipcRenderer.on(IPC.settingsChanged, listener)
    return () => {
      ipcRenderer.removeListener(IPC.settingsChanged, listener)
    }
  }
}

export type GlassButterflyApi = typeof api

contextBridge.exposeInMainWorld('glass', api)
