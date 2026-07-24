import { app, ipcMain } from 'electron'
import { IPC } from '@shared/settings'

/** App-level IPC: currently just a request to quit from the Settings window. */
export function registerAppIpc(): void {
  ipcMain.on(IPC.quit, () => app.quit())
}
