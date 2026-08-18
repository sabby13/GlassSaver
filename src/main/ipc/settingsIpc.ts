import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IMAGE_EXTENSIONS, IPC, type Settings } from '@shared/settings'
import { getSettings, saveSettings } from '../storage/settingsStore'

/**
 * Registers every settings-related IPC handler. The renderer reaches these
 * only through the typed preload bridge; it never touches the filesystem
 * or native dialogs directly.
 *
 * Call once, after the app is ready and before any window loads.
 */
export function registerSettingsIpc(): void {
  ipcMain.handle(IPC.getSettings, (): Settings => getSettings())

  // Synchronous read so the renderer's first paint already has the right
  // wallpaper (no default-then-swap flash on startup).
  ipcMain.on(IPC.getSettingsSync, (event) => {
    event.returnValue = getSettings()
  })

  ipcMain.handle(IPC.saveSettings, (_event, update: Partial<Settings>): Settings => {
    const saved = saveSettings(update)
    // Broadcast to every window so the live screensaver reflects changes at once.
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.settingsChanged, saved)
    }
    return saved
  })

  ipcMain.handle(IPC.selectBackgroundImage, async (event): Promise<string | null> => {
    const parent = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      title: 'Choose a background image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: [...IMAGE_EXTENSIONS] }]
    }

    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}
