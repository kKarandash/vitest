import type { ResolvedConfig } from 'vitest'

export type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'utf-16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex'

export interface FsOptions {
  encoding?: BufferEncoding
  flag?: string | number
}

export interface TypePayload { type: string }
export interface PressPayload { press: string }
export interface DownPayload { down: string }
export interface UpPayload { up: string }

export type SendKeysPayload = TypePayload | PressPayload | DownPayload | UpPayload

export interface BrowserCommands {
  readFile: (path: string, options?: BufferEncoding | FsOptions) => Promise<string>
  writeFile: (path: string, content: string, options?: BufferEncoding | FsOptions & { mode?: number | string }) => Promise<void>
  removeFile: (path: string) => Promise<void>
  sendKeys: (payload: SendKeysPayload) => Promise<void>
}

type Platform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'
  | 'netbsd'

export const server: {
  /**
   * Platform the Vitest server is running on.
   * The same as calling `process.platform` on the server.
   */
  platform: Platform
  /**
   * Runtime version of the Vitest server.
   * The same as calling `process.version` on the server.
   */
  version: string
  /**
   * Name of the browser provider.
   */
  provider: string
  /**
   * Name of the current browser.
   */
  browser: string
  /**
   * Available commands for the browser.
   * @see {@link https://vitest.dev/guide/browser#commands}
   */
  commands: BrowserCommands
}

/**
 * Available commands for the browser.
 * A shortcut to `server.commands`.
 * @see {@link https://vitest.dev/guide/browser#commands}
 */
export const commands: BrowserCommands

export const page: {
  /**
   * Serialized test config.
   */
  config: ResolvedConfig
}
