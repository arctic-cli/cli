import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest } from "next/server"

const redis = Redis.fromEnv()

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
  prefix: "ratelimit:feedback",
})

const VALID_CATEGORIES = ["feature", "improvement", "praise", "other"]

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    }

    const body = await request.json()

    if (!body.feedback || typeof body.feedback !== "string") {
      return new Response(JSON.stringify({ error: "Feedback is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (body.feedback.length < 10 || body.feedback.length > 2000) {
      return new Response(JSON.stringify({ error: "Feedback must be between 10 and 2000 characters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
      return new Response(JSON.stringify({ error: "Invalid category" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { feedback, category, version, deviceId } = body
    const timestamp = Date.now()
    const date = new Date().toISOString().split("T")[0]

    const feedbackId = `feedback:${date}:${timestamp}:${Math.random().toString(36).slice(2, 8)}`
    await redis.set(
      feedbackId,
      {
        feedback,
        category,
        version: version?.slice(0, 50),
        deviceId: deviceId?.slice(0, 50),
        timestamp,
        ip: ip.slice(0, 100),
      },
      { ex: 60 * 60 * 24 * 90 },
    )

    await redis.sadd(`feedback:${date}`, feedbackId)

    await redis.hincrby(`feedback_categories:${date}`, category, 1)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Feedback submission error:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
