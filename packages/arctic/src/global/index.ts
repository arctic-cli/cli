import fs from "fs/promises"
import { xdgData, xdgCache, xdgConfig, xdgState } from "xdg-basedir"
import path from "path"
import os from "os"
import { ulid } from "ulid"

const app = "arctic"

const data = path.join(xdgData!, app)
const cache = path.join(xdgCache!, app)
const config = path.join(xdgConfig!, app)
const state = path.join(xdgState!, app)

export namespace Global {
  export const Path = {
    home: os.homedir(),
    data,
    bin: path.join(data, "bin"),
    log: path.join(data, "log"),
    cache,
    config,
    state,
  } as const

  const settingsFile = path.join(state, "settings.json")

  interface Settings {
    permissionBypassEnabled?: boolean
    telemetryEnabled?: boolean
    deviceId?: string
    lastHeartbeatDate?: string
  }

  let settingsCache: Settings | undefined

  async function loadSettings(): Promise<Settings> {
    if (settingsCache) return settingsCache
    const file = Bun.file(settingsFile)
    const exists = await file.exists()
    if (!exists) {
      settingsCache = {}
      return settingsCache
    }
    settingsCache = await file.json().catch(() => ({}))
    return settingsCache!
  }

  async function saveSettings(settings: Settings): Promise<void> {
    settingsCache = settings
    await Bun.write(settingsFile, JSON.stringify(settings, null, 2))
  }

  export async function getPermissionBypassEnabled(): Promise<boolean> {
    const settings = await loadSettings()
    return settings.permissionBypassEnabled ?? false
  }

  export async function setPermissionBypassEnabled(enabled: boolean): Promise<void> {
    const settings = await loadSettings()
    settings.permissionBypassEnabled = enabled
    await saveSettings(settings)
  }

  export async function getTelemetryEnabled(): Promise<boolean> {
    const settings = await loadSettings()
    return settings.telemetryEnabled ?? true
  }

  export async function setTelemetryEnabled(enabled: boolean): Promise<void> {
    const settings = await loadSettings()
    settings.telemetryEnabled = enabled
    await saveSettings(settings)
  }

  export async function getDeviceId(): Promise<string> {
    const settings = await loadSettings()
    if (settings.deviceId) return settings.deviceId
    const id = ulid()
    settings.deviceId = id
    await saveSettings(settings)
    return id
  }

  export async function getLastHeartbeatDate(): Promise<string | undefined> {
    const settings = await loadSettings()
    return settings.lastHeartbeatDate
  }

  export async function setLastHeartbeatDate(date: string): Promise<void> {
    const settings = await loadSettings()
    settings.lastHeartbeatDate = date
    await saveSettings(settings)
  }
}

await Promise.all([
  fs.mkdir(Global.Path.data, { recursive: true }),
  fs.mkdir(Global.Path.config, { recursive: true }),
  fs.mkdir(Global.Path.state, { recursive: true }),
  fs.mkdir(Global.Path.log, { recursive: true }),
  fs.mkdir(Global.Path.bin, { recursive: true }),
])

const CACHE_VERSION = "14"

const version = await Bun.file(path.join(Global.Path.cache, "version"))
  .text()
  .catch(() => "0")

if (version !== CACHE_VERSION) {
  try {
    const contents = await fs.readdir(Global.Path.cache)
    await Promise.all(
      contents.map((item) =>
        fs.rm(path.join(Global.Path.cache, item), {
          recursive: true,
          force: true,
        }),
      ),
    )
  } catch (e) {}
  await Bun.file(path.join(Global.Path.cache, "version")).write(CACHE_VERSION)
}
