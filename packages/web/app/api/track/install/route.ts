import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest } from "next/server"

const redis = Redis.fromEnv()

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
  prefix: "ratelimit:track",
})

const VALID_OS = ["linux", "darwin", "windows"]
const VALID_ARCH = ["x64", "arm64", "x86", "baseline", "musl"]

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return new Response(null, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const os = searchParams.get("os")
    const arch = searchParams.get("arch")

    if (!os || !arch) {
      return new Response(null, { status: 204 })
    }

    if (!VALID_OS.includes(os) || !VALID_ARCH.includes(arch)) {
      return new Response(null, { status: 204 })
    }

    const date = new Date().toISOString().split("T")[0]

    const dailyKey = `installs:daily:${date}:${os}:${arch}`

    await redis
      .pipeline()
      .incr("installs:total")
      .incr(`installs:os:${os}`)
      .incr(`installs:arch:${arch}`)
      .incr(dailyKey)
      .exec()

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Track install error:", error)
    return new Response(null, { status: 204 })
  }
}
