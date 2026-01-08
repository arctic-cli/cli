"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

type InstallMethod = "curl" | "npm" | "bun" | "pnpm" | "yarn" | "powershell"

const INSTALL_COMMANDS: Record<InstallMethod, string> = {
  curl: "curl -fsSL https://usearctic.sh/install | bash",
  npm: "npm install -g @arctic-cli/arctic@beta",
  bun: "bun install -g @arctic-cli/arctic@beta",
  pnpm: "pnpm install -g @arctic-cli/arctic@beta",
  yarn: "yarn global add @arctic-cli/arctic@beta",
  powershell: "irm https://usearctic.sh/install.ps1 | iex",
}

const INSTALL_LABELS: Record<InstallMethod, string> = {
  curl: "curl",
  npm: "npm",
  bun: "bun",
  pnpm: "pnpm",
  yarn: "yarn",
  powershell: "powershell",
}

export function InstallSelector() {
  const [method, setMethod] = useState<InstallMethod>("curl")
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(INSTALL_COMMANDS[method])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative inline-flex w-full flex-col rounded-lg border border-input bg-background shadow-xs ring-ring/24 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] hover:border-ring hover:ring-[3px] dark:before:shadow-[0_-1px_--theme(--color-white/8%)]">
      <div className="flex items-center gap-1 border-b border-border/50 px-4 py-2">
        {(Object.keys(INSTALL_COMMANDS) as InstallMethod[]).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`relative px-3 py-1 text-xs font-mono transition-colors ${
              method === m ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {INSTALL_LABELS[m]}
            {method === m && <div className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />}
          </button>
        ))}
      </div>
      <button onClick={copy} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors">
        <code className="flex-1 text-left font-mono text-sm text-foreground leading-none">
          {INSTALL_COMMANDS[method]}
        </code>
        <div className="shrink-0">
          {copied ? (
            <Check className="size-4 text-green-600 dark:text-green-500" />
          ) : (
            <Copy className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </button>
    </div>
  )
}
