import { resolve } from 'node:path'
import { BrowserWindow, ipcMain, screen } from 'electron'
import { IPC } from '@shared/settings'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

/** Load an HTML entry into a window, dev-server or built file as appropriate. */
function loadEntry(window: BrowserWindow, entry: string): void {
  if (isDev) {
    void window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${entry}`)
  } else {
    void window.loadFile(resolve(__dirname, `../renderer/${entry}`))
  }
}

let screensaverWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null

export function createScreensaverWindow(): BrowserWindow {
  if (screensaverWindow && !screensaverWindow.isDestroyed()) {
    screensaverWindow.focus()
    return screensaverWindow
  }

  const { width, height } = screen.getPrimaryDisplay().bounds

  screensaverWindow = new BrowserWindow({
    width,
    height,
    frame: false,
    fullscreen: true,
    backgroundColor: '#000000',
    show: false,
    webPreferences: {
      preload: resolve(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Show only once the wallpaper has decoded, so the first visible frame is
  // already the correct image — no black/default flash. A timeout is a safety
  // net in case the renderer never signals (e.g. an asset error).
  let shown = false
  const reveal = (): void => {
    if (shown) return
    shown = true
    if (screensaverWindow && !screensaverWindow.isDestroyed()) screensaverWindow.show()
  }
  ipcMain.once(IPC.wallpaperReady, reveal)
  screensaverWindow.once('ready-to-show', () => setTimeout(reveal, 2000))

  screensaverWindow.on('closed', () => {
    ipcMain.removeListener(IPC.wallpaperReady, reveal)
    screensaverWindow = null
  })

  loadEntry(screensaverWindow, 'index.html')
  return screensaverWindow
}

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 420,
    height: 560,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    title: 'GlassButterfly Settings',
    backgroundColor: '#1c1c1e',
    show: false,
    webPreferences: {
      preload: resolve(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  settingsWindow.once('ready-to-show', () => settingsWindow?.show())
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  loadEntry(settingsWindow, 'settings.html')
  return settingsWindow
}

export function getScreensaverWindow(): BrowserWindow | null {
  return screensaverWindow
}
