import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest } from "next/server"

const redis = Redis.fromEnv()

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "ratelimit:usage",
})

const VALID_EVENTS = [
  "daily.active",
  "app.started",
  "session.started",
  "session.ended",
  "message.sent",
  "tool.invoked",
  "command.used",
  "provider.authed",
  "agent.spawned",
  "mcp.connected",
  "error.occurred",
]
const VALID_OS = ["linux", "darwin", "win32", "freebsd", "openbsd", "sunos", "aix"]
const VALID_ARCH = ["x64", "arm64", "arm", "ia32", "ppc64", "s390x"]

interface TelemetryEvent {
  event: string
  properties?: Record<string, string | number | boolean>
  timestamp: number
}

interface TelemetryPayload {
  events: TelemetryEvent[]
  context: {
    deviceId: string
    os: string
    arch: string
    version: string
    channel: string
    date: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return new Response(null, { status: 429 })
    }

    const payload: TelemetryPayload = await request.json()

    if (!payload.events || !Array.isArray(payload.events)) {
      return new Response(null, { status: 400 })
    }

    const date = payload.context?.date || new Date().toISOString().split("T")[0]
    const deviceId = payload.context?.deviceId
    const os = VALID_OS.includes(payload.context?.os) ? payload.context.os : "unknown"
    const arch = VALID_ARCH.includes(payload.context?.arch) ? payload.context.arch : "unknown"
    const version = sanitize(payload.context?.version) || "unknown"
    const channel = sanitize(payload.context?.channel) || "unknown"

    const pipeline = redis.pipeline()

    if (deviceId) {
      pipeline.sadd(`dau:${date}`, deviceId)
    }

    pipeline.hincrby(`os:${date}`, os, 1)
    pipeline.hincrby(`arch:${date}`, arch, 1)
    pipeline.hincrby(`versions:${date}`, version, 1)
    pipeline.hincrby(`channels:${date}`, channel, 1)

    for (const event of payload.events) {
      if (!VALID_EVENTS.includes(event.event)) continue

      switch (event.event) {
        case "app.started": {
          const command = sanitize(event.properties?.command as string) || "unknown"
          pipeline.hincrby(`app:${date}`, command, 1)
          break
        }
        case "session.started": {
          pipeline.incr(`sessions:${date}`)
          break
        }
        case "session.ended": {
          const provider = sanitize(event.properties?.provider as string)
          const model = sanitize(event.properties?.model as string)
          const duration = event.properties?.duration as number
          const messages = event.properties?.messages as number
          const tools = event.properties?.tools as number
          if (provider) pipeline.hincrby(`session_providers:${date}`, provider, 1)
          if (model) pipeline.hincrby(`session_models:${date}`, model, 1)
          if (duration) pipeline.incrby(`session_duration:${date}`, Math.round(duration))
          if (messages) pipeline.incrby(`session_messages:${date}`, messages)
          if (tools) pipeline.incrby(`session_tools:${date}`, tools)
          break
        }
        case "message.sent": {
          const provider = sanitize(event.properties?.provider as string)
          const model = sanitize(event.properties?.model as string)
          if (provider) pipeline.hincrby(`messages:${date}`, provider, 1)
          if (model) pipeline.hincrby(`models:${date}`, model, 1)
          break
        }
        case "tool.invoked": {
          const tool = sanitize(event.properties?.tool as string)
          if (tool) pipeline.hincrby(`tools:${date}`, tool, 1)
          break
        }
        case "command.used": {
          const command = sanitize(event.properties?.command as string)
          if (command) pipeline.hincrby(`commands:${date}`, command, 1)
          break
        }
        case "provider.authed": {
          const provider = sanitize(event.properties?.provider as string)
          if (provider) pipeline.hincrby(`auths:${date}`, provider, 1)
          break
        }
        case "agent.spawned": {
          const agent = sanitize(event.properties?.agent as string)
          if (agent) pipeline.hincrby(`agents:${date}`, agent, 1)
          break
        }
        case "mcp.connected": {
          const server = sanitize(event.properties?.server as string)
          if (server) pipeline.hincrby(`mcp:${date}`, server, 1)
          break
        }
        case "error.occurred": {
          const type = sanitize(event.properties?.type as string)
          if (type) pipeline.hincrby(`errors:${date}`, type, 1)
          break
        }
      }
    }

    await pipeline.exec()

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Track usage error:", error)
    return new Response(null, { status: 204 })
  }
}

function sanitize(value: string | undefined): string | undefined {
  if (!value) return undefined
  // only allow alphanumeric, dash, underscore, slash, dot
  const sanitized = value.replace(/[^a-zA-Z0-9\-_/.]/g, "").slice(0, 100)
  return sanitized || undefined
}
