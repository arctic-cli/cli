import { NamedError } from "@arctic-cli/util/error"
import { EOL } from "os"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { maybeImportClaudeAgents, maybeImportClaudeCommands, maybeImportClaudeMcp } from "./cli/claude-import"
import { AgentCommand } from "./cli/cmd/agent"
import { AuthCommand } from "./cli/cmd/auth"
import { DebugCommand } from "./cli/cmd/debug"
import { ExportCommand } from "./cli/cmd/export"
import { GenerateCommand } from "./cli/cmd/generate"
import { ImportCommand } from "./cli/cmd/import"
import { McpCommand } from "./cli/cmd/mcp"
import { ModelsCommand } from "./cli/cmd/models"
import { RunCommand } from "./cli/cmd/run"
import { SessionCommand } from "./cli/cmd/session"
import { StatsCommand } from "./cli/cmd/stats"
import { TelemetryCommand } from "./cli/cmd/telemetry"
import { TuiThreadCommand } from "./cli/cmd/tui/thread"
import { UninstallCommand } from "./cli/cmd/uninstall"
import { UpgradeCommand } from "./cli/cmd/upgrade"
import { FormatError } from "./cli/error"
import { maybeImportExternalAuth } from "./cli/external-auth-import"
import { maybeImportOpenCodeConfig } from "./cli/opencode-config-import"
import { UI } from "./cli/ui"
import { Installation } from "./installation"
import { Telemetry } from "./telemetry"
import { Log } from "./util/log"

process.on("unhandledRejection", (e) => {
  Log.Default.error("rejection", {
    e: e instanceof Error ? e.message : e,
  })
})

process.on("uncaughtException", (e) => {
  Log.Default.error("exception", {
    e: e instanceof Error ? e.message : e,
  })
})

const cli = yargs(hideBin(process.argv))
  .parserConfiguration({ "populate--": true })
  .scriptName("arctic")
  .wrap(100)
  .help("help", "show help")
  .alias("help", "h")
  .version("version", "show version number", Installation.VERSION)
  .alias("version", "v")
  .option("print-logs", {
    describe: "print logs to stderr",
    type: "boolean",
  })
  .option("log-level", {
    describe: "log level",
    type: "string",
    choices: ["DEBUG", "INFO", "WARN", "ERROR"],
  })
  .option("profile", {
    describe: "permission profile (readonly, git-only, trusted, safe, or custom)",
    type: "string",
  })
  .middleware(async (opts) => {
    if (opts.profile) {
      process.env.ARCTIC_PERMISSION_PROFILE = opts.profile
    }
    await Log.init({
      print: process.argv.includes("--print-logs"),
      dev: Installation.isLocal(),
      level: (() => {
        if (opts.logLevel) return opts.logLevel as Log.Level
        if (Installation.isLocal()) return "DEBUG"
        return "INFO"
      })(),
    })

    process.env.AGENT = "1"
    process.env.ARCTIC = "1"

    Log.Default.info("arctic", {
      version: Installation.VERSION,
      args: process.argv.slice(2),
    })

    await maybeImportClaudeCommands()
    await maybeImportClaudeAgents()
    await maybeImportClaudeMcp()
    await maybeImportExternalAuth()
    await maybeImportOpenCodeConfig()

    const command = process.argv[2] || "default"
    await Telemetry.dailyHeartbeat()
    Telemetry.appStarted(command)
  })
  .usage("\n" + UI.logo())
  .command(McpCommand)
  .command(TuiThreadCommand)
  .command(RunCommand)
  .command(GenerateCommand)
  .command(DebugCommand)
  .command(AuthCommand)
  .command(AgentCommand)
  .command(UpgradeCommand)
  .command(UninstallCommand)
  .command(ModelsCommand)
  .command(StatsCommand)
  .command(ExportCommand)
  .command(ImportCommand)
  .command(SessionCommand)
  .command(TelemetryCommand)
  .fail((msg) => {
    if (
      msg.startsWith("Unknown argument") ||
      msg.startsWith("Not enough non-option arguments") ||
      msg.startsWith("Invalid values:")
    ) {
      cli.showHelp("log")
    }
    process.exit(1)
  })
  .strict()

try {
  await cli.parse()
} catch (e) {
  let data: Record<string, any> = {}
  if (e instanceof NamedError) {
    const obj = e.toObject()
    Object.assign(data, {
      ...obj.data,
    })
  }

  if (e instanceof Error) {
    Object.assign(data, {
      name: e.name,
      message: e.message,
      cause: e.cause?.toString(),
      stack: e.stack,
    })
    Telemetry.errorOccurred(e.name)
  }

  if (e instanceof ResolveMessage) {
    Object.assign(data, {
      name: e.name,
      message: e.message,
      code: e.code,
      specifier: e.specifier,
      referrer: e.referrer,
      position: e.position,
      importKind: e.importKind,
    })
  }
  Log.Default.error("fatal", data)
  const formatted = FormatError(e)
  if (formatted) UI.error(formatted)
  if (formatted === undefined) {
    UI.error("Unexpected error, check log file at " + Log.file() + " for more details" + EOL)
    console.error(e)
  }
  process.exitCode = 1
} finally {
  // flush telemetry before exit
  await Telemetry.flush()
  // Some subprocesses don't react properly to SIGTERM and similar signals.
  // Most notably, some docker-container-based MCP servers don't handle such signals unless
  // run using `docker run --init`.
  // Explicitly exit to avoid any hanging subprocesses.
  process.exit()
}
