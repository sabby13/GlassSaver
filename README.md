# GlassSaver

A minimal, beautiful liquid-glass clock screensaver. Pick a background, and a
frosted-glass clock and date float over it. Offline, lightweight, native-feeling.

Built with Electron, React, TypeScript, and Vite (via electron-vite).

## Requirements

- Node.js 18+ (developed on Node 22)

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` launches the fullscreen screensaver window.

The first `npm install` downloads the Electron binary, so it can take a few
minutes. (If this project lives in a cloud-synced folder such as OneDrive,
consider excluding `node_modules` from syncing.)

## Using it

- `Ctrl/Cmd + ,` opens the Settings window
- `Ctrl/Cmd + Q` quits

In Settings you can choose a background image (jpg, jpeg, png, webp), toggle
12/24-hour time, toggle seconds, and exit. Changes are saved immediately and
the screensaver updates live. Settings persist in a `settings.json` file inside
Electron's per-user `userData` directory.

## Scripts

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Run in development with hot reload              |
| `npm run typecheck` | Type-check main, preload, and renderer          |
| `npm run build`     | Build to `out/`                                 |
| `npm start`         | Preview the production build                    |
| `npm run dist`      | Package a distributable installer into `dist/`  |

## Project structure

```
src/
  shared/      Types, defaults, IPC channel names, protocol name
  main/        Electron main process
    storage/   JSON settings persistence (the only filesystem access)
    ipc/       IPC handlers (settings, app)
    protocol/  Custom scheme that safely serves on-disk images
  preload/     Secure contextBridge API exposed to the renderer
  renderer/    React UI
    components/ Background, GlassCard, Clock, DateCard
    settings/   Settings window UI
    screensaver/App composition for the screensaver window
```

## Distribution

`npm run dist` uses electron-builder to produce an installer in `dist/`
(dmg on macOS, NSIS on Windows, AppImage on Linux). Build on the target OS for
that platform's package.

## Status

Feature-complete for v1: fullscreen screensaver, custom/default background,
liquid-glass clock and date, and a Settings window with live updates.
