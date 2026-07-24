import { app, globalShortcut } from 'electron'
import { createScreensaverWindow, createSettingsWindow } from './windows'
import { registerSettingsIpc } from './ipc/settingsIpc'
import { registerAppIpc } from './ipc/appIpc'
import { registerAssetProtocol, registerAssetSchemePrivileges } from './protocol/assetProtocol'

// A single-instance lock keeps the screensaver from opening twice.
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

// Privileged schemes must be declared before the app is ready.
registerAssetSchemePrivileges()

app.whenReady().then(() => {
  // Register handlers before any window loads so early renderer calls resolve.
  registerAssetProtocol()
  registerSettingsIpc()
  registerAppIpc()

  createScreensaverWindow()

  // Global shortcuts: settings and quit. Registered while the app runs.
  globalShortcut.register('CommandOrControl+,', () => createSettingsWindow())
  globalShortcut.register('CommandOrControl+Q', () => app.quit())

  app.on('second-instance', () => createScreensaverWindow())
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// The screensaver is a foreground app; quitting all windows quits the app,
// except on macOS where the convention is to stay resident.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  createScreensaverWindow()
})
