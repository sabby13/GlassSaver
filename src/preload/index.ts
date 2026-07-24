import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type Settings } from '@shared/settings'

/**
 * The single, typed surface the renderer is allowed to touch.
 * All filesystem and native-dialog work stays in the main process.
 */
const api = {
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

export type GlassSaverApi = typeof api

contextBridge.exposeInMainWorld('glass', api)
