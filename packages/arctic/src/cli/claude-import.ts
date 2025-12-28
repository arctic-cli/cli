import * as prompts from "@clack/prompts"
import fs from "fs/promises"
import path from "path"
import { Global } from "../global"
import { Storage } from "../storage/storage"
import { Log } from "../util/log"
import { Filesystem } from "../util/filesystem"
import { parse as parseJsonc, printParseErrorCode, type ParseError as JsoncParseError } from "jsonc-parser"

type ClaudeImportState = {
  asked: boolean
  decision: "yes" | "no"
  decidedAt: number
  importedAt?: number
  importedCount?: number
  sourceDir?: string
  targetDir?: string
}

const log = Log.create({ service: "cli.claude-import" })

const CLAUDE_COMMANDS_DIR = path.join(Global.Path.home, ".claude", "commands")
const GLOBAL_TARGET_DIR = path.join(Global.Path.config, "command", "claude")
const PROJECT_COMMANDS_DIR = path.join(".claude", "commands")
const PROJECT_TARGET_DIR = path.join(".arctic", "command", "claude")
const STATE_KEY_PROJECT = ["cli", "claude-import", "project"]
const STATE_KEY_GLOBAL = ["cli", "claude-import", "global"]
const CLAUDE_AGENTS_DIR = path.join(Global.Path.home, ".claude", "agents")
const GLOBAL_AGENT_TARGET_DIR = path.join(Global.Path.config, "agent", "claude")
const PROJECT_AGENTS_DIR = path.join(".claude", "agents")
const PROJECT_AGENT_TARGET_DIR = path.join(".arctic", "agent", "claude")
const STATE_KEY_PROJECT_AGENTS = ["cli", "claude-import", "project", "agents"]
const STATE_KEY_GLOBAL_AGENTS = ["cli", "claude-import", "global", "agents"]
const CLAUDE_MCP_GLOBAL_FILE = path.join(Global.Path.home, ".claude.json")
const CLAUDE_MCP_PROJECT_FILE = ".mcp.json"
const STATE_KEY_PROJECT_MCP = ["cli", "claude-import", "project", "mcp"]
const STATE_KEY_DIRECTORY_MCP = ["cli", "claude-import", "directory", "mcp"]
const STATE_KEY_GLOBAL_MCP = ["cli", "claude-import", "global", "mcp"]

export async function maybeImportClaudeCommands() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return
  if (process.env.CI) return
  if (process.argv.some((arg) => ["-h", "--help", "-v", "--version"].includes(arg))) return

  const projectSource = await maybeImportClaudeProjectCommands()
  await maybeImportClaudeGlobalCommands(projectSource)
}

export async function maybeImportClaudeAgents() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return
  if (process.env.CI) return
  if (process.argv.some((arg) => ["-h", "--help", "-v", "--version"].includes(arg))) return

  const projectSource = await maybeImportClaudeProjectAgents()
  await maybeImportClaudeGlobalAgents(projectSource)
}

export async function maybeImportClaudeMcp() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return
  if (process.env.CI) return
  if (process.argv.some((arg) => ["-h", "--help", "-v", "--version"].includes(arg))) return

  const projectSource = await maybeImportClaudeProjectMcp()
  const directorySource = await maybeImportClaudeDirectoryMcp()
  await maybeImportClaudeGlobalMcp(projectSource, directorySource)
}

function getProjectRootFromClaudeDir(dir: string) {
  // dir: <project>/.claude/<kind>
  return path.dirname(path.dirname(dir))
}

async function maybeImportClaudeProjectCommands() {
  const state = await readState(STATE_KEY_PROJECT)
  if (state?.asked) return

  const projectCommandDir = await findProjectClaudeCommandDir()
  if (!projectCommandDir) return
  if (path.resolve(projectCommandDir) === path.resolve(CLAUDE_COMMANDS_DIR)) {
    // Same as global location; let the global prompt handle it.
    return
  }

  const projectRoot = getProjectRootFromClaudeDir(projectCommandDir)
  const targetDir = path.join(projectRoot, PROJECT_TARGET_DIR)

  const files = await listClaudeCommandFiles(projectCommandDir)
  if (files.length === 0) return

  const confirm = await prompts.confirm({
    message: `Import Claude project commands from ${projectCommandDir}? (We won't ask again)`,
    initialValue: true,
  })

  if (prompts.isCancel(confirm)) return

  if (!confirm) {
    await Storage.write<ClaudeImportState>(STATE_KEY_PROJECT, {
      asked: true,
      decision: "no",
      decidedAt: Date.now(),
      sourceDir: projectCommandDir,
      targetDir,
    })
    return
  }

  const importedCount = await importClaudeFiles(files, projectCommandDir, targetDir)

  await Storage.write<ClaudeImportState>(STATE_KEY_PROJECT, {
    asked: true,
    decision: "yes",
    decidedAt: Date.now(),
    importedAt: Date.now(),
    importedCount,
    sourceDir: projectCommandDir,
    targetDir,
  })

  if (importedCount > 0) {
    prompts.log.success(`Imported ${importedCount} Claude command${importedCount === 1 ? "" : "s"} into Arctic`)
  } else {
    prompts.log.info("Claude commands already imported")
  }

  return projectCommandDir
}

async function maybeImportClaudeProjectAgents() {
  const state = await readState(STATE_KEY_PROJECT_AGENTS)
  if (state?.asked) return

  const projectAgentsDir = await findProjectClaudeAgentsDir()
  if (!projectAgentsDir) return
  if (path.resolve(projectAgentsDir) === path.resolve(CLAUDE_AGENTS_DIR)) {
    // Same as global location; let the global prompt handle it.
    return
  }

  const projectRoot = getProjectRootFromClaudeDir(projectAgentsDir)
  const targetDir = path.join(projectRoot, PROJECT_AGENT_TARGET_DIR)

  const files = await listClaudeAgentFiles(projectAgentsDir)
  if (files.length === 0) return

  const confirm = await prompts.confirm({
    message: `Import Claude project agents from ${projectAgentsDir}? (We won't ask again)`,
    initialValue: true,
  })

  if (prompts.isCancel(confirm)) return

  if (!confirm) {
    await Storage.write<ClaudeImportState>(STATE_KEY_PROJECT_AGENTS, {
      asked: true,
      decision: "no",
      decidedAt: Date.now(),
      sourceDir: projectAgentsDir,
      targetDir,
    })
    return
  }

  const importedCount = await importClaudeFiles(files, projectAgentsDir, targetDir)

  await Storage.write<ClaudeImportState>(STATE_KEY_PROJECT_AGENTS, {
    asked: true,
    decision: "yes",
    decidedAt: Date.now(),
    importedAt: Date.now(),
    importedCount,
    sourceDir: projectAgentsDir,
    targetDir,
  })

  if (importedCount > 0) {
    prompts.log.success(`Imported ${importedCount} Claude agent${importedCount === 1 ? "" : "s"} into Arctic`)
  } else {
    prompts.log.info("Claude agents already imported")
  }

  return projectAgentsDir
}

async function maybeImportClaudeGlobalCommands(projectSource?: string) {
  if (projectSource && path.resolve(projectSource) === path.resolve(CLAUDE_COMMANDS_DIR)) return

  const state = await readState(STATE_KEY_GLOBAL)
  if (state?.asked) return

  const files = await listClaudeCommandFiles(CLAUDE_COMMANDS_DIR)
  if (files.length === 0) return

  const confirm = await prompts.confirm({
    message: "Import Claude commands from ~/.claude/commands into Arctic? (We won't ask again)",
    initialValue: true,
  })

  if (prompts.isCancel(confirm)) return

  if (!confirm) {
    await Storage.write<ClaudeImportState>(STATE_KEY_GLOBAL, {
      asked: true,
      decision: "no",
      decidedAt: Date.now(),
      sourceDir: CLAUDE_COMMANDS_DIR,
      targetDir: GLOBAL_TARGET_DIR,
    })
    return
  }

  const importedCount = await importClaudeFiles(files, CLAUDE_COMMANDS_DIR, GLOBAL_TARGET_DIR)

  await Storage.write<ClaudeImportState>(STATE_KEY_GLOBAL, {
    asked: true,
    decision: "yes",
    decidedAt: Date.now(),
    importedAt: Date.now(),
    importedCount,
    sourceDir: CLAUDE_COMMANDS_DIR,
    targetDir: GLOBAL_TARGET_DIR,
  })

  if (importedCount > 0) {
    prompts.log.success(`Imported ${importedCount} Claude command${importedCount === 1 ? "" : "s"} into Arctic`)
  } else {
    prompts.log.info("Claude commands already imported")
  }
}

async function maybeImportClaudeGlobalAgents(projectSource?: string) {
  if (projectSource && path.resolve(projectSource) === path.resolve(CLAUDE_AGENTS_DIR)) return

  const state = await readState(STATE_KEY_GLOBAL_AGENTS)
  if (state?.asked) return

  const files = await listClaudeAgentFiles(CLAUDE_AGENTS_DIR)
  if (files.length === 0) return

  const confirm = await prompts.confirm({
    message: "Import Claude agents from ~/.claude/agents into Arctic? (We won't ask again)",
    initialValue: true,
  })

  if (prompts.isCancel(confirm)) return

  if (!confirm) {
    await Storage.write<ClaudeImportState>(STATE_KEY_GLOBAL_AGENTS, {
      asked: true,
      decision: "no",
      decidedAt: Date.now(),
      sourceDir: CLAUDE_AGENTS_DIR,
      targetDir: GLOBAL_AGENT_TARGET_DIR,
    })
    return
  }

  const importedCount = await importClaudeFiles(files, CLAUDE_AGENTS_DIR, GLOBAL_AGENT_TARGET_DIR)

  await Storage.write<ClaudeImportState>(STATE_KEY_GLOBAL_AGENTS, {
    asked: true,
    decision: "yes",
    decidedAt: Date.now(),
    importedAt: Date.now(),
    importedCount,
    sourceDir: CLAUDE_AGENTS_DIR,
    targetDir: GLOBAL_AGENT_TARGET_DIR,
  })

  if (importedCount > 0) {
    prompts.log.success(`Imported ${importedCount} Claude agent${importedCount === 1 ? "" : "s"} into Arctic`)
  } else {
    prompts.log.info("Claude agents already imported")
  }
}

async function maybeImportClaudeProjectMcp() {
  const state = await readState(STATE_KEY_PROJECT_MCP)
  if (state?.asked) return

  const mcpFile = await findProjectClaudeMcpFile()
  if (!mcpFile) return

  const projectRoot = path.dirname(mcpFile)
  const targetConfig = await resolveProjectConfigPath(projectRoot)

  const mcpServers = await readClaudeMcpServers(mcpFile)
  if (!mcpServers || Object.keys(mcpServers).length === 0) return

  const confirm = await prompts.confirm({
    message: `Import Claude MCP servers from ${mcpFile}? (We won't ask again)`,
    initialValue: true,
  })

  if (prompts.isCancel(confirm)) return

  if (!confirm) {
    await Storage.write<ClaudeImportState>(STATE_KEY_PROJECT_MCP, {
      asked: true,
      decision: "no",
      decidedAt: Date.now(),
      sourceDir: mcpFile,
      targetDir: targetConfig,
    })
    return
  }

  const importedCount = await importClaudeMcpServers(mcpServers, targetConfig)

  await Storage.write<ClaudeImportState>(STATE_KEY_PROJECT_MCP, {
    asked: true,
    decision: "yes",
    decidedAt: Date.now(),
    importedAt: Date.now(),
    importedCount,
    sourceDir: mcpFile,
    targetDir: targetConfig,
  })

  if (importedCount > 0) {
    prompts.log.success(`Imported ${importedCount} Claude MCP server${importedCount === 1 ? "" : "s"} into Arctic`)
  } else {
    prompts.log.info("Claude MCP servers already imported")
  }

  return mcpFile
}

async function maybeImportClaudeDirectoryMcp() {
  try {
    const state = await readState(STATE_KEY_DIRECTORY_MCP)
    log.debug("maybeImportClaudeDirectoryMcp: state check", { asked: state?.asked })
    if (state?.asked) return

    const cwd = process.cwd()
    log.debug("checking for directory-specific mcp servers", { cwd, file: CLAUDE_MCP_GLOBAL_FILE })
    const mcpServers = await readClaudeDirectoryMcpServers(CLAUDE_MCP_GLOBAL_FILE, cwd)
    if (!mcpServers || Object.keys(mcpServers).length === 0) {
      log.debug("no directory-specific mcp servers found", { cwd })
      return
    }
    log.debug("found directory-specific mcp servers", { cwd, count: Object.keys(mcpServers).length })

    const targetConfig = await resolveProjectConfigPath(cwd)

    const confirm = await prompts.confirm({
      message: `Import Claude MCP servers for this directory from ~/.claude.json? (We won't ask again)`,
      initialValue: true,
    })

    if (prompts.isCancel(confirm)) return

    if (!confirm) {
      await Storage.write<ClaudeImportState>(STATE_KEY_DIRECTORY_MCP, {
        asked: true,
        decision: "no",
        decidedAt: Date.now(),
        sourceDir: CLAUDE_MCP_GLOBAL_FILE,
        targetDir: targetConfig,
      })
      return
    }

    const importedCount = await importClaudeMcpServers(mcpServers, targetConfig)

    await Storage.write<ClaudeImportState>(STATE_KEY_DIRECTORY_MCP, {
      asked: true,
      decision: "yes",
      decidedAt: Date.now(),
      importedAt: Date.now(),
      importedCount,
      sourceDir: CLAUDE_MCP_GLOBAL_FILE,
      targetDir: targetConfig,
    })

    if (importedCount > 0) {
      prompts.log.success(`Imported ${importedCount} Claude MCP server${importedCount === 1 ? "" : "s"} into Arctic`)
    } else {
      prompts.log.info("Claude MCP servers already imported")
    }

    return CLAUDE_MCP_GLOBAL_FILE
  } catch (error) {
    log.error("maybeImportClaudeDirectoryMcp: error", { error })
    throw error
  }
}

async function maybeImportClaudeGlobalMcp(projectSource?: string, directorySource?: string) {
  if (projectSource && path.resolve(projectSource) === path.resolve(CLAUDE_MCP_GLOBAL_FILE)) return
  if (directorySource && path.resolve(directorySource) === path.resolve(CLAUDE_MCP_GLOBAL_FILE)) return

  const state = await readState(STATE_KEY_GLOBAL_MCP)
  if (state?.asked) return

  const mcpServers = await readClaudeMcpServers(CLAUDE_MCP_GLOBAL_FILE)
  if (!mcpServers || Object.keys(mcpServers).length === 0) return

  const confirm = await prompts.confirm({
    message: "Import Claude MCP servers from ~/.claude.json into Arctic? (We won't ask again)",
    initialValue: true,
  })

  if (prompts.isCancel(confirm)) return

  const targetConfig = await resolveGlobalConfigPath()

  if (!confirm) {
    await Storage.write<ClaudeImportState>(STATE_KEY_GLOBAL_MCP, {
      asked: true,
      decision: "no",
      decidedAt: Date.now(),
      sourceDir: CLAUDE_MCP_GLOBAL_FILE,
      targetDir: targetConfig,
    })
    return
  }

  const importedCount = await importClaudeMcpServers(mcpServers, targetConfig)

  await Storage.write<ClaudeImportState>(STATE_KEY_GLOBAL_MCP, {
    asked: true,
    decision: "yes",
    decidedAt: Date.now(),
    importedAt: Date.now(),
    importedCount,
    sourceDir: CLAUDE_MCP_GLOBAL_FILE,
    targetDir: targetConfig,
  })

  if (importedCount > 0) {
    prompts.log.success(`Imported ${importedCount} Claude MCP server${importedCount === 1 ? "" : "s"} into Arctic`)
  } else {
    prompts.log.info("Claude MCP servers already imported")
  }
}

async function readState(key: string[]) {
  return Storage.read<ClaudeImportState>(key).catch((err) => {
    if (err instanceof Storage.NotFoundError) return undefined
    throw err
  })
}

async function findProjectClaudeCommandDir(): Promise<string | undefined> {
  const found = await Filesystem.findUp(PROJECT_COMMANDS_DIR, process.cwd())
  if (found.length === 0) return undefined

  const candidate = found[0]
  try {
    const stat = await fs.stat(candidate)
    if (!stat.isDirectory()) return undefined
  } catch {
    return undefined
  }

  return candidate
}

async function findProjectClaudeAgentsDir(): Promise<string | undefined> {
  const found = await Filesystem.findUp(PROJECT_AGENTS_DIR, process.cwd())
  if (found.length === 0) return undefined

  const candidate = found[0]
  try {
    const stat = await fs.stat(candidate)
    if (!stat.isDirectory()) return undefined
  } catch {
    return undefined
  }

  return candidate
}

async function listClaudeCommandFiles(sourceDir: string): Promise<string[]> {
  return listClaudeMarkdownFiles(sourceDir)
}

async function listClaudeAgentFiles(sourceDir: string): Promise<string[]> {
  return listClaudeMarkdownFiles(sourceDir)
}

async function listClaudeMarkdownFiles(sourceDir: string): Promise<string[]> {
  try {
    const stat = await fs.stat(sourceDir)
    if (!stat.isDirectory()) return []
  } catch {
    return []
  }

  const result: string[] = []
  const glob = new Bun.Glob("**/*.md")
  for await (const rel of glob.scan({ cwd: sourceDir, onlyFiles: true })) {
    result.push(path.join(sourceDir, rel))
  }
  return result
}

async function importClaudeFiles(files: string[], sourceDir: string, targetDir: string) {
  await fs.mkdir(targetDir, { recursive: true })
  let importedCount = 0

  for (const file of files) {
    const rel = path.relative(sourceDir, file)
    const dest = path.join(targetDir, rel)
    await fs.mkdir(path.dirname(dest), { recursive: true })

    const exists = await fs
      .stat(dest)
      .then(() => true)
      .catch(() => false)
    if (exists) continue

    await fs.copyFile(file, dest)
    importedCount += 1
  }

  log.info("claude commands import", { importedCount })
  return importedCount
}

async function findProjectClaudeMcpFile(): Promise<string | undefined> {
  const found = await Filesystem.findUp(CLAUDE_MCP_PROJECT_FILE, process.cwd())
  if (found.length === 0) return undefined
  const candidate = found[0]
  try {
    const stat = await fs.stat(candidate)
    if (!stat.isFile()) return undefined
  } catch {
    return undefined
  }
  return candidate
}

async function resolveProjectConfigPath(projectRoot: string) {
  const jsonc = path.join(projectRoot, ".arctic", "arctic.jsonc")
  const json = path.join(projectRoot, ".arctic", "arctic.json")
  if (await Bun.file(jsonc).exists()) return jsonc
  if (await Bun.file(json).exists()) return json
  return jsonc
}

async function resolveGlobalConfigPath() {
  const jsonc = path.join(Global.Path.config, "arctic.jsonc")
  const json = path.join(Global.Path.config, "arctic.json")
  if (await Bun.file(jsonc).exists()) return jsonc
  if (await Bun.file(json).exists()) return json
  return jsonc
}

async function readClaudeMcpServers(filepath: string): Promise<Record<string, any> | undefined> {
  const text = await Bun.file(filepath)
    .text()
    .catch(() => undefined)
  if (!text) return undefined

  const data = parseJson(text, filepath)
  if (!data || typeof data !== "object") return undefined

  const root = data as Record<string, any>
  const servers = root.mcpServers ?? root.mcp ?? root.mcp_servers
  if (!servers || typeof servers !== "object") return undefined
  return servers as Record<string, any>
}

async function readClaudeDirectoryMcpServers(filepath: string, directory: string): Promise<Record<string, any> | undefined> {
  const text = await Bun.file(filepath)
    .text()
    .catch(() => undefined)
  if (!text) return undefined

  const data = parseJson(text, filepath)
  if (!data || typeof data !== "object") return undefined

  const root = data as Record<string, any>

  // Claude Code stores directory configs under a "projects" key
  const projects = root.projects
  if (!projects || typeof projects !== "object") {
    log.debug("no projects key found in claude config", { filepath })
    return undefined
  }

  // Normalize the directory path to absolute
  const absoluteDir = path.resolve(directory)

  // Try to find the directory config by checking different path formats
  let dirConfig: any = undefined

  // Try exact match first
  dirConfig = projects[absoluteDir]

  // If not found, try to find by comparing normalized paths
  if (!dirConfig || typeof dirConfig !== "object") {
    for (const [key, value] of Object.entries(projects)) {
      if (typeof value !== "object" || value === null) continue

      try {
        // Expand tilde and resolve the path
        const expandedKey = key.startsWith("~") ? path.join(Global.Path.home, key.slice(1)) : key
        const normalizedKey = path.resolve(expandedKey)

        if (normalizedKey === absoluteDir) {
          dirConfig = value
          log.debug("found directory config via path normalization", { key, normalizedKey, absoluteDir })
          break
        }
      } catch {
        // Skip invalid paths
        continue
      }
    }
  }

  if (!dirConfig || typeof dirConfig !== "object") {
    log.debug("no directory config found", { absoluteDir, availableKeys: Object.keys(projects) })
    return undefined
  }

  const servers = dirConfig.mcpServers ?? dirConfig.mcp ?? dirConfig.mcp_servers
  if (!servers || typeof servers !== "object") {
    log.debug("no mcp servers in directory config", { absoluteDir })
    return undefined
  }

  log.debug("found directory-specific mcp servers", { absoluteDir, serverCount: Object.keys(servers).length })
  return servers as Record<string, any>
}

function parseJson(text: string, filepath: string): any | undefined {
  try {
    return JSON.parse(text)
  } catch {
    const errors: JsoncParseError[] = []
    const data = parseJsonc(text, errors, { allowTrailingComma: true })
    if (errors.length > 0) {
      const msg = errors.map((err) => printParseErrorCode(err.error)).join(", ")
      log.warn("failed to parse jsonc", { path: filepath, errors: msg })
      return undefined
    }
    return data
  }
}

async function importClaudeMcpServers(servers: Record<string, any>, targetConfigPath: string) {
  const targetDir = path.dirname(targetConfigPath)
  await fs.mkdir(targetDir, { recursive: true })

  const existingText = await Bun.file(targetConfigPath)
    .text()
    .catch(() => "")
  const existing = existingText ? (parseJson(existingText, targetConfigPath) ?? {}) : {}
  const merged = { ...existing }
  merged.mcp = merged.mcp ?? {}

  let importedCount = 0
  for (const [name, config] of Object.entries(servers)) {
    if (merged.mcp[name]) continue
    const mapped = mapClaudeMcpConfig(config)
    if (!mapped) continue
    merged.mcp[name] = mapped
    importedCount += 1
  }

  await Bun.write(targetConfigPath, JSON.stringify(merged, null, 2))
  log.info("claude mcp import", { importedCount, target: targetConfigPath })
  return importedCount
}

function mapClaudeMcpConfig(config: any) {
  if (!config || typeof config !== "object") return undefined

  if (typeof config.command === "string") {
    const args = Array.isArray(config.args) ? config.args.filter((x: any) => typeof x === "string") : []
    const result: Record<string, any> = {
      type: "local",
      command: [config.command, ...args],
    }
    if (config.env && typeof config.env === "object") {
      result.environment = Object.fromEntries(Object.entries(config.env).filter(([, v]) => typeof v === "string"))
    }
    if (typeof config.timeout === "number") result.timeout = config.timeout
    return result
  }

  if (typeof config.url === "string") {
    const result: Record<string, any> = {
      type: "remote",
      url: config.url,
    }
    if (config.headers && typeof config.headers === "object") {
      result.headers = Object.fromEntries(Object.entries(config.headers).filter(([, v]) => typeof v === "string"))
    }
    if (config.oauth !== undefined) result.oauth = config.oauth
    if (typeof config.timeout === "number") result.timeout = config.timeout
    return result
  }

  return undefined
}
