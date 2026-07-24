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

- `Ctrl/Cmd + ,` opens Settings
- `Ctrl/Cmd + Q` quits

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
  shared/      Types and IPC channel names shared across processes
  main/        Electron main process (windows, lifecycle)
  preload/     Secure contextBridge API exposed to the renderer
  renderer/    React UI (screensaver + settings windows)
```

## Status

Scaffold and Electron/Vite setup complete. Storage, the glass UI, and the
settings form are added in subsequent steps.
