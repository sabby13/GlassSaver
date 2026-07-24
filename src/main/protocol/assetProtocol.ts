import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { net, protocol } from 'electron'
import { IMAGE_EXTENSIONS } from '@shared/settings'
import { ASSET_SCHEME } from '@shared/asset'

/**
 * A custom, privileged scheme that lets the renderer display images stored
 * anywhere on disk without ever seeing the filesystem or using raw file://
 * URLs (which Chromium blocks from an http/file page and the CSP forbids).
 *
 * The renderer requests `glass-asset://local/?src=<encoded absolute path>`;
 * only existing image files are served, everything else is refused.
 */

/** Must be called once, at startup, BEFORE the app `ready` event. */
export function registerAssetSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ASSET_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

/** Must be called once, AFTER the app is ready. */
export function registerAssetProtocol(): void {
  protocol.handle(ASSET_SCHEME, (request): Response | Promise<Response> => {
    let src: string | null
    try {
      src = new URL(request.url).searchParams.get('src')
    } catch {
      return new Response('Bad request', { status: 400 })
    }

    if (!src) {
      return new Response('Missing source', { status: 400 })
    }

    const ext = extname(src).slice(1).toLowerCase()
    if (!(IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
      return new Response('Unsupported type', { status: 403 })
    }

    if (!existsSync(src)) {
      return new Response('Not found', { status: 404 })
    }

    return net.fetch(pathToFileURL(src).toString())
  })
}
