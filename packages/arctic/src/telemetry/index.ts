import os from "os"
import { Global } from "../global"
import { Installation } from "../installation"
import { Log } from "../util/log"

const TELEMETRY_ENDPOINT = "https://usearctic.sh/api/track/usage"
const FLUSH_INTERVAL = 60_000
const MAX_QUEUE_SIZE = 100

export namespace Telemetry {
  const log = Log.create({ service: "telemetry" })

  interface Event {
    event: string
    properties?: Record<string, string | number | boolean>
    timestamp: number
  }

  interface Context {
    deviceId: string
    os: string
    arch: string
    version: string
    channel: string
    date: string
  }

  let queue: Event[] = []
  let flushTimer: Timer | undefined
  let enabledCache: boolean | undefined
  let contextCache: Context | undefined

  export async function isEnabled(): Promise<boolean> {
    if (enabledCache !== undefined) return enabledCache
    const enabled = await Global.getTelemetryEnabled()
    enabledCache = enabled
    return enabled
  }

  export async function setEnabled(enabled: boolean): Promise<void> {
    enabledCache = enabled
    await Global.setTelemetryEnabled(enabled)
    log.info("telemetry", { enabled })

    if (!enabled) {
      queue = []
      if (flushTimer) {
        clearInterval(flushTimer)
        flushTimer = undefined
      }
    }
  }

  async function getContext(): Promise<Context> {
    if (contextCache) {
      contextCache.date = new Date().toISOString().split("T")[0]
      return contextCache
    }
    const deviceId = await Global.getDeviceId()
    contextCache = {
      deviceId,
      os: os.platform(),
      arch: os.arch(),
      version: Installation.VERSION,
      channel: Installation.CHANNEL,
      date: new Date().toISOString().split("T")[0],
    }
    return contextCache
  }

  export async function track(event: string, properties?: Record<string, string | number | boolean>): Promise<void> {
    if (!(await isEnabled())) return

    queue.push({
      event,
      properties,
      timestamp: Date.now(),
    })

    log.debug("tracked", { event, properties })

    if (queue.length >= MAX_QUEUE_SIZE) {
      flush().catch(() => {})
    }

    if (!flushTimer) {
      flushTimer = setInterval(() => flush().catch(() => {}), FLUSH_INTERVAL)
    }
  }

  export async function flush(): Promise<void> {
    if (queue.length === 0) return
    if (!(await isEnabled())) return

    const events = queue.splice(0, queue.length)
    const context = await getContext()

    const payload = {
      events,
      context,
    }

    log.debug("flushing", { count: events.length })

    await fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => {
      log.debug("flush failed", { error: err.message })
      queue.unshift(...events.slice(0, MAX_QUEUE_SIZE - queue.length))
    })
  }

  export async function dailyHeartbeat(): Promise<void> {
    if (!(await isEnabled())) return
    const today = new Date().toISOString().split("T")[0]
    const last = await Global.getLastHeartbeatDate()
    if (last === today) return
    await track("daily.active")
    await Global.setLastHeartbeatDate(today)
  }

  export function appStarted(command: string) {
    track("app.started", { command })
  }

  export function sessionStarted() {
    track("session.started")
  }

  export function sessionEnded(metrics: {
    duration: number
    messages: number
    tools: number
    provider: string
    model: string
  }) {
    track("session.ended", metrics)
  }

  export function messageSent(provider: string, model: string) {
    track("message.sent", { provider, model })
  }

  export function toolInvoked(tool: string) {
    track("tool.invoked", { tool })
  }

  export function commandUsed(command: string) {
    track("command.used", { command })
  }

  export function providerAuthed(provider: string) {
    track("provider.authed", { provider })
  }

  export function agentSpawned(agent: string) {
    track("agent.spawned", { agent })
  }

  export function mcpConnected(server: string) {
    track("mcp.connected", { server })
  }

  export function errorOccurred(type: string) {
    track("error.occurred", { type })
  }
}
