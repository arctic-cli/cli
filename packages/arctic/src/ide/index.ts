import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { spawn, spawnSync } from "bun"
import z from "zod"
import { NamedError } from "@arctic-cli/util/error"
import { Log } from "../util/log"

const SUPPORTED_IDES = [
  { name: "Windsurf" as const, cmd: "windsurf" },
  { name: "Visual Studio Code - Insiders" as const, cmd: "code-insiders" },
  { name: "Visual Studio Code" as const, cmd: "code" },
  { name: "Cursor" as const, cmd: "cursor" },
  { name: "VSCodium" as const, cmd: "codium" },
]

export namespace Ide {
  const log = Log.create({ service: "ide" })

  export const Event = {
    Installed: BusEvent.define(
      "ide.installed",
      z.object({
        ide: z.string(),
      }),
    ),
  }

  export const AlreadyInstalledError = NamedError.create("AlreadyInstalledError", z.object({}))

  export const InstallFailedError = NamedError.create(
    "InstallFailedError",
    z.object({
      stderr: z.string(),
    }),
  )

  export function ide() {
    if (process.env["TERM_PROGRAM"] === "vscode") {
      const v = process.env["GIT_ASKPASS"]
      for (const ide of SUPPORTED_IDES) {
        if (v?.includes(ide.name)) return ide.name
      }
    }
    return "unknown"
  }

  export function cmd() {
    const name = ide()
    return SUPPORTED_IDES.find((i) => i.name === name)?.cmd
  }

  function findAvailableCmd() {
    const detected = cmd()
    if (detected) return detected
    for (const ide of SUPPORTED_IDES) {
      const result = spawnSync(["which", ide.cmd], { stdout: "pipe", stderr: "pipe" })
      if (result.exitCode === 0) return ide.cmd
    }
    return undefined
  }

  export function openFile(filePath: string, line?: number) {
    const command = findAvailableCmd()
    if (!command) return false
    const args = line ? [`--goto`, `${filePath}:${line}`] : [filePath]
    spawn([command, ...args], {
      stdout: "ignore",
      stderr: "ignore",
    })
    return true
  }

  export function alreadyInstalled() {
    return process.env["ARCTIC_CALLER"] === "vscode" || process.env["ARCTIC_CALLER"] === "vscode-insiders"
  }

  export async function install(ide: (typeof SUPPORTED_IDES)[number]["name"]) {
    const cmd = SUPPORTED_IDES.find((i) => i.name === ide)?.cmd
    if (!cmd) throw new Error(`Unknown IDE: ${ide}`)

    const p = spawn([cmd, "--install-extension", "sst-dev.arctic"], {
      stdout: "pipe",
      stderr: "pipe",
    })
    await p.exited
    const stdout = await new Response(p.stdout).text()
    const stderr = await new Response(p.stderr).text()

    log.info("installed", {
      ide,
      stdout,
      stderr,
    })

    if (p.exitCode !== 0) {
      throw new InstallFailedError({ stderr })
    }
    if (stdout.includes("already installed")) {
      throw new AlreadyInstalledError({})
    }
  }
}
