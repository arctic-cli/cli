import type { Argv } from "yargs"
import { cmd } from "./cmd"
import { Session } from "../../session"
import { bootstrap } from "../bootstrap"
import { Storage } from "../../storage/storage"
import { Project } from "../../project/project"
import { Instance } from "../../project/instance"
import { Pricing } from "../../provider/pricing"

interface SessionStats {
  totalSessions: number
  totalMessages: number
  totalCost: number
  totalTokens: {
    input: number
    output: number
    reasoning: number
    cache: {
      read: number
      write: number
    }
  }
  toolUsage: Record<string, number>
  modelUsage: Record<string, { count: number; cost: number; tokens: number; providerID?: string; modelID?: string }>
  dateRange: {
    earliest: number
    latest: number
  }
  days: number
  costPerDay: number
  tokensPerSession: number
  medianTokensPerSession: number
}

export const StatsCommand = cmd({
  command: "stats",
  describe: "show token usage and cost statistics",
  builder: (yargs: Argv) => {
    return yargs
      .option("days", {
        describe: "show stats for the last N days (default: all time)",
        type: "number",
      })
      .option("tools", {
        describe: "number of tools to show (default: all)",
        type: "number",
      })
      .option("project", {
        describe: "filter by project (default: all projects, empty string: current project)",
        type: "string",
      })
      .option("provider", {
        describe: "filter by provider ID",
        type: "string",
      })
      .option("model", {
        describe: "filter by model ID (partial match)",
        type: "string",
      })
  },
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      const stats = await aggregateSessionStats(
        args.days,
        args.project,
        args.provider,
        args.model as string | undefined,
      )
      displayStats(stats, args.tools, args.provider, args.model as string | undefined)
    })
  },
})

async function getCurrentProject(): Promise<Project.Info> {
  return Instance.project
}

async function getAllSessions(): Promise<Session.Info[]> {
  const sessions: Session.Info[] = []

  const projectKeys = await Storage.list(["project"])
  const projects = await Promise.all(projectKeys.map((key) => Storage.read<Project.Info>(key)))

  for (const project of projects) {
    if (!project) continue

    const sessionKeys = await Storage.list(["session", project.id])
    const projectSessions = await Promise.all(sessionKeys.map((key) => Storage.read<Session.Info>(key)))

    for (const session of projectSessions) {
      if (session) {
        sessions.push(session)
      }
    }
  }

  return sessions
}

async function aggregateSessionStats(
  days?: number,
  projectFilter?: string,
  providerFilter?: string,
  modelFilter?: string,
): Promise<SessionStats> {
  const sessions = await getAllSessions()
  const DAYS_IN_SECOND = 24 * 60 * 60 * 1000
  const cutoffTime = days ? Date.now() - days * DAYS_IN_SECOND : 0

  let filteredSessions = days ? sessions.filter((session) => session.time.updated >= cutoffTime) : sessions

  if (projectFilter !== undefined) {
    if (projectFilter === "") {
      const currentProject = await getCurrentProject()
      filteredSessions = filteredSessions.filter((session) => session.projectID === currentProject.id)
    } else {
      filteredSessions = filteredSessions.filter((session) => session.projectID === projectFilter)
    }
  }

  const stats: SessionStats = {
    totalSessions: filteredSessions.length,
    totalMessages: 0,
    totalCost: 0,
    totalTokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: {
        read: 0,
        write: 0,
      },
    },
    toolUsage: {},
    modelUsage: {},
    dateRange: {
      earliest: Date.now(),
      latest: Date.now(),
    },
    days: 0,
    costPerDay: 0,
    tokensPerSession: 0,
    medianTokensPerSession: 0,
  }

  if (filteredSessions.length > 1000) {
    console.log(`Large dataset detected (${filteredSessions.length} sessions). This may take a while...`)
  }

  if (filteredSessions.length === 0) {
    return stats
  }

  let earliestTime = Date.now()
  let latestTime = 0

  const sessionTotalTokens: number[] = []

  const BATCH_SIZE = 20
  for (let i = 0; i < filteredSessions.length; i += BATCH_SIZE) {
    const batch = filteredSessions.slice(i, i + BATCH_SIZE)

    const batchPromises = batch.map(async (session) => {
      const messages = await Session.messages({ sessionID: session.id })

      let sessionCost = 0
      let sessionTokens = { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
      let sessionToolUsage: Record<string, number> = {}
      let sessionModelUsage: Record<
        string,
        { count: number; cost: number; tokens: number; providerID?: string; modelID?: string }
      > = {}

      for (const message of messages) {
        if (message.info.role === "assistant") {
          const providerID = message.info.providerID
          const modelID = message.info.modelID

          // Apply filters
          if (providerFilter && providerID !== providerFilter) continue
          if (modelFilter && modelID && !modelID.includes(modelFilter)) continue

          const tokens = message.info.tokens

          // Calculate cost using Pricing module
          let messageCost = message.info.cost || 0
          if (tokens && modelID) {
            const costBreakdown = await Pricing.calculateCostAsync(modelID, {
              input: tokens.input || 0,
              output: tokens.output || 0,
              cacheCreation: tokens.cache?.write || 0,
              cacheRead: tokens.cache?.read || 0,
            })

            if (costBreakdown) {
              messageCost = costBreakdown.totalCost
            }
          }

          sessionCost += messageCost

          if (tokens) {
            sessionTokens.input += tokens.input || 0
            sessionTokens.output += tokens.output || 0
            sessionTokens.reasoning += tokens.reasoning || 0
            sessionTokens.cache.read += tokens.cache?.read || 0
            sessionTokens.cache.write += tokens.cache?.write || 0
          }

          // Track model usage
          if (modelID) {
            const modelKey = `${providerID}/${modelID}`
            if (!sessionModelUsage[modelKey]) {
              sessionModelUsage[modelKey] = { count: 0, cost: 0, tokens: 0, providerID, modelID }
            }
            sessionModelUsage[modelKey].count++
            sessionModelUsage[modelKey].cost += messageCost
            sessionModelUsage[modelKey].tokens +=
              (tokens?.input || 0) +
              (tokens?.output || 0) +
              (tokens?.reasoning || 0) +
              (tokens?.cache?.read || 0) +
              (tokens?.cache?.write || 0)
          }
        }

        for (const part of message.parts) {
          if (part.type === "tool" && part.tool) {
            sessionToolUsage[part.tool] = (sessionToolUsage[part.tool] || 0) + 1
          }
        }
      }

      return {
        messageCount: messages.length,
        sessionCost,
        sessionTokens,
        sessionTotalTokens: sessionTokens.input + sessionTokens.output + sessionTokens.reasoning,
        sessionToolUsage,
        sessionModelUsage,
        earliestTime: session.time.created,
        latestTime: session.time.updated,
      }
    })

    const batchResults = await Promise.all(batchPromises)

    for (const result of batchResults) {
      earliestTime = Math.min(earliestTime, result.earliestTime)
      latestTime = Math.max(latestTime, result.latestTime)
      sessionTotalTokens.push(result.sessionTotalTokens)

      stats.totalMessages += result.messageCount
      stats.totalCost += result.sessionCost
      stats.totalTokens.input += result.sessionTokens.input
      stats.totalTokens.output += result.sessionTokens.output
      stats.totalTokens.reasoning += result.sessionTokens.reasoning
      stats.totalTokens.cache.read += result.sessionTokens.cache.read
      stats.totalTokens.cache.write += result.sessionTokens.cache.write

      for (const [tool, count] of Object.entries(result.sessionToolUsage)) {
        stats.toolUsage[tool] = (stats.toolUsage[tool] || 0) + count
      }

      for (const [model, usage] of Object.entries(result.sessionModelUsage)) {
        if (!stats.modelUsage[model]) {
          stats.modelUsage[model] = {
            count: 0,
            cost: 0,
            tokens: 0,
            providerID: usage.providerID,
            modelID: usage.modelID,
          }
        }
        stats.modelUsage[model].count += usage.count
        stats.modelUsage[model].cost += usage.cost
        stats.modelUsage[model].tokens += usage.tokens
      }
    }
  }

  const actualDays = Math.max(1, Math.ceil((latestTime - earliestTime) / DAYS_IN_SECOND))
  stats.dateRange = {
    earliest: earliestTime,
    latest: latestTime,
  }
  stats.days = actualDays
  stats.costPerDay = stats.totalCost / actualDays
  const totalTokens = stats.totalTokens.input + stats.totalTokens.output + stats.totalTokens.reasoning
  stats.tokensPerSession = filteredSessions.length > 0 ? totalTokens / filteredSessions.length : 0
  sessionTotalTokens.sort((a, b) => a - b)
  const mid = Math.floor(sessionTotalTokens.length / 2)
  stats.medianTokensPerSession =
    sessionTotalTokens.length === 0
      ? 0
      : sessionTotalTokens.length % 2 === 0
        ? (sessionTotalTokens[mid - 1] + sessionTotalTokens[mid]) / 2
        : sessionTotalTokens[mid]

  return stats
}

export function displayStats(stats: SessionStats, toolLimit?: number, providerFilter?: string, modelFilter?: string) {
  const width = 56

  function renderRow(label: string, value: string): string {
    const availableWidth = width - 1
    const paddingNeeded = availableWidth - label.length - value.length
    const padding = Math.max(0, paddingNeeded)
    return `│${label}${" ".repeat(padding)}${value} │`
  }

  // Overview section
  console.log("┌────────────────────────────────────────────────────────┐")
  console.log("│                       OVERVIEW                         │")
  console.log("├────────────────────────────────────────────────────────┤")
  console.log(renderRow("Sessions", stats.totalSessions.toLocaleString()))
  console.log(renderRow("Messages", stats.totalMessages.toLocaleString()))
  console.log(renderRow("Days", stats.days.toString()))
  if (providerFilter) {
    console.log(renderRow("Provider Filter", providerFilter))
  }
  if (modelFilter) {
    console.log(renderRow("Model Filter", modelFilter))
  }
  console.log("└────────────────────────────────────────────────────────┘")
  console.log()

  // Cost & Tokens section
  console.log("┌────────────────────────────────────────────────────────┐")
  console.log("│                    COST & TOKENS                       │")
  console.log("├────────────────────────────────────────────────────────┤")
  const cost = isNaN(stats.totalCost) ? 0 : stats.totalCost
  const costPerDay = isNaN(stats.costPerDay) ? 0 : stats.costPerDay
  const tokensPerSession = isNaN(stats.tokensPerSession) ? 0 : stats.tokensPerSession
  console.log(renderRow("Total Cost", `$${cost.toFixed(2)}`))
  console.log(renderRow("Avg Cost/Day", `$${costPerDay.toFixed(2)}`))
  console.log(renderRow("Avg Tokens/Session", formatNumber(Math.round(tokensPerSession))))
  const medianTokensPerSession = isNaN(stats.medianTokensPerSession) ? 0 : stats.medianTokensPerSession
  console.log(renderRow("Median Tokens/Session", formatNumber(Math.round(medianTokensPerSession))))
  console.log(renderRow("Input", formatNumber(stats.totalTokens.input)))
  console.log(renderRow("Output", formatNumber(stats.totalTokens.output)))
  console.log(renderRow("Cache Read", formatNumber(stats.totalTokens.cache.read)))
  console.log(renderRow("Cache Write", formatNumber(stats.totalTokens.cache.write)))
  console.log("└────────────────────────────────────────────────────────┘")
  console.log()

  // Most Used Models section
  if (Object.keys(stats.modelUsage).length > 0) {
    const sortedModels = Object.entries(stats.modelUsage).sort(([, a], [, b]) => b.count - a.count)
    const topModels = sortedModels.slice(0, 5)

    console.log("┌────────────────────────────────────────────────────────┐")
    console.log("│                   MOST USED MODELS                     │")
    console.log("├────────────────────────────────────────────────────────┤")

    for (const [model, usage] of topModels) {
      const maxModelLength = 45
      const truncatedModel = model.length > maxModelLength ? model.substring(0, maxModelLength - 2) + ".." : model
      console.log(renderRow(truncatedModel, `${usage.count}×`))
      console.log(renderRow("  Cost", `$${usage.cost.toFixed(2)}`))
      console.log(renderRow("  Tokens", formatNumber(usage.tokens)))
      if (topModels.indexOf([model, usage]) < topModels.length - 1) {
        console.log("├────────────────────────────────────────────────────────┤")
      }
    }
    console.log("└────────────────────────────────────────────────────────┘")
    console.log()
  }

  // Tool Usage section
  if (Object.keys(stats.toolUsage).length > 0) {
    const sortedTools = Object.entries(stats.toolUsage).sort(([, a], [, b]) => b - a)
    const toolsToDisplay = toolLimit ? sortedTools.slice(0, toolLimit) : sortedTools

    console.log("┌────────────────────────────────────────────────────────┐")
    console.log("│                      TOOL USAGE                        │")
    console.log("├────────────────────────────────────────────────────────┤")

    const maxCount = Math.max(...toolsToDisplay.map(([, count]) => count))
    const totalToolUsage = Object.values(stats.toolUsage).reduce((a, b) => a + b, 0)

    for (const [tool, count] of toolsToDisplay) {
      const barLength = Math.max(1, Math.floor((count / maxCount) * 20))
      const bar = "█".repeat(barLength)
      const percentage = ((count / totalToolUsage) * 100).toFixed(1)

      const maxToolLength = 18
      const truncatedTool = tool.length > maxToolLength ? tool.substring(0, maxToolLength - 2) + ".." : tool
      const toolName = truncatedTool.padEnd(maxToolLength)

      const content = ` ${toolName} ${bar.padEnd(20)} ${count.toString().padStart(3)} (${percentage.padStart(4)}%)`
      const padding = Math.max(0, width - content.length - 1)
      console.log(`│${content}${" ".repeat(padding)} │`)
    }
    console.log("└────────────────────────────────────────────────────────┘")
  }
  console.log()
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}
