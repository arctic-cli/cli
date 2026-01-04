import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

export async function GET() {
  try {
    const [total, linux, darwin, windows, x64, arm64, x86, baseline, musl] = await redis.mget<number[]>(
      "installs:total",
      "installs:os:linux",
      "installs:os:darwin",
      "installs:os:windows",
      "installs:arch:x64",
      "installs:arch:arm64",
      "installs:arch:x86",
      "installs:arch:baseline",
      "installs:arch:musl",
    )

    const dailyStats: Record<string, Record<string, number>> = {}
    const keys: string[] = []

    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      const oses = ["linux", "darwin", "windows"]
      const arches = ["x64", "arm64", "x86", "baseline", "musl"]

      for (const os of oses) {
        for (const arch of arches) {
          keys.push(`installs:daily:${dateStr}:${os}:${arch}`)
        }
      }
    }

    const dailyValues = await redis.mget<number[]>(...keys)

    let keyIndex = 0
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      dailyStats[dateStr] = { total: 0 }

      const oses = ["linux", "darwin", "windows"]
      const arches = ["x64", "arm64", "x86", "baseline", "musl"]

      for (const os of oses) {
        for (const arch of arches) {
          const count = dailyValues[keyIndex++] || 0
          if (count > 0) {
            dailyStats[dateStr][`${os}:${arch}`] = count
            dailyStats[dateStr].total += count
          }
        }
      }
    }

    return Response.json({
      total: total || 0,
      byOS: {
        linux: linux || 0,
        darwin: darwin || 0,
        windows: windows || 0,
      },
      byArch: {
        x64: x64 || 0,
        arm64: arm64 || 0,
        x86: x86 || 0,
        baseline: baseline || 0,
        musl: musl || 0,
      },
      last30Days: dailyStats,
    })
  } catch (error) {
    console.error("Stats fetch error:", error)
    return Response.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
