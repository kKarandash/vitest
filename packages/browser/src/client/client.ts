import type { CancelReason } from '@vitest/runner'
import { type BirpcReturn, createBirpc } from 'birpc'
import type { WebSocketBrowserEvents, WebSocketBrowserHandlers } from 'vitest'
import { parse, stringify } from 'flatted'
import type { VitestBrowserClientMocker } from './mocker'
import { getBrowserState } from './utils'

export const PORT = import.meta.hot ? '51204' : location.port
export const HOST = [location.hostname, PORT].filter(Boolean).join(':')
export const SESSION_ID = crypto.randomUUID()
export const ENTRY_URL = `${
  location.protocol === 'https:' ? 'wss:' : 'ws:'
}//${HOST}/__vitest_browser_api__?type=${getBrowserState().type}&sessionId=${SESSION_ID}`

let setCancel = (_: CancelReason) => {}
export const onCancel = new Promise<CancelReason>((resolve) => {
  setCancel = resolve
})

export interface VitestBrowserClient {
  rpc: BrowserRPC
  ws: WebSocket
  waitForConnection: () => Promise<void>
}

type BrowserRPC = BirpcReturn<WebSocketBrowserHandlers, WebSocketBrowserEvents>

function createClient() {
  const autoReconnect = true
  const reconnectInterval = 2000
  const reconnectTries = 10
  const connectTimeout = 60000

  let tries = reconnectTries

  const ctx: VitestBrowserClient = {
    ws: new WebSocket(ENTRY_URL),
    waitForConnection,
  } as VitestBrowserClient

  let onMessage: Function

  ctx.rpc = createBirpc<WebSocketBrowserHandlers, WebSocketBrowserEvents>({
    onCancel: setCancel,
    async startMocking(id: string) {
      // @ts-expect-error not typed global
      if (typeof __vitest_mocker__ === 'undefined')
        throw new Error(`Cannot mock modules in the orchestrator process`)
      // @ts-expect-error not typed global
      const mocker = __vitest_mocker__ as VitestBrowserClientMocker
      const exports = await mocker.resolve(id)
      return Object.keys(exports)
    },
  }, {
    post: msg => ctx.ws.send(msg),
    on: fn => (onMessage = fn),
    serialize: e => stringify(e, (_, v) => {
      if (v instanceof Error) {
        return {
          name: v.name,
          message: v.message,
          stack: v.stack,
        }
      }
      return v
    }),
    deserialize: parse,
    onTimeoutError(functionName) {
      throw new Error(`[vitest-browser]: Timeout calling "${functionName}"`)
    },
  })

  let openPromise: Promise<void>

  function reconnect(reset = false) {
    if (reset)
      tries = reconnectTries
    ctx.ws = new WebSocket(ENTRY_URL)
    registerWS()
  }

  function registerWS() {
    openPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Cannot connect to the server in ${connectTimeout / 1000} seconds`))
      }, connectTimeout)?.unref?.()
      if (ctx.ws.OPEN === ctx.ws.readyState)
        resolve()
      // still have a listener even if it's already open to update tries
      ctx.ws.addEventListener('open', () => {
        tries = reconnectTries
        resolve()
        clearTimeout(timeout)
      })
    })
    ctx.ws.addEventListener('message', (v) => {
      onMessage(v.data)
    })
    ctx.ws.addEventListener('close', () => {
      tries -= 1
      if (autoReconnect && tries > 0)
        setTimeout(reconnect, reconnectInterval)
    })
  }

  registerWS()

  function waitForConnection() {
    return openPromise
  }

  return ctx
}

export const client = createClient()
export const channel = new BroadcastChannel('vitest')
