import { buttonVariants } from "@/components/ui/button"
import { Book, Github } from "lucide-react"
import Link from "next/link"
import { CopyButton } from "./copy-button"

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-bold before:-rotate-1 before:-z-10 relative z-10 inline-block px-[0.3rem] py-[0.2rem] font-mono text-2xl text-primary-foreground outline-none before:pointer-events-none before:absolute before:inset-0 before:rounded-xs before:bg-primary">
      {children}
    </span>
  )
}

export default function HomePage() {
  const installCommandMacLinux = "curl -fsSL https://usearctic.sh/install | bash"
  const installCommandWindows = "irm https://usearctic.sh/install.ps1 | iex"

  return (
    <div className="h-screen w-full flex items-center overflow-hidden">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="space-y-12 md:space-y-16">
          {/* Header */}
          <div className="space-y-8 text-center">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">Arctic</h1>

            <p className="text-2xl md:text-3xl text-fd-muted-foreground max-w-3xl mx-auto leading-relaxed">
              <Highlight>Multi-provider</Highlight> terminal interface for AI coding.
            </p>
          </div>

          {/* Description */}
          <div className="max-w-4xl mx-auto space-y-6 text-lg md:text-xl text-center text-fd-muted-foreground/90">
            <p>
              Switch seamlessly between Codex, Gemini, Anthropic, and GitHub Copilot without changing your workflow.
            </p>
            <p>Unified limits, sessions, and tools in your terminal.</p>
          </div>

          {/* Install Commands */}
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-6">Get Started</h2>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-fd-muted-foreground mb-2">macOS / Linux</div>
                <CopyButton command={installCommandMacLinux} />
              </div>

              <div>
                <div className="text-sm font-medium text-fd-muted-foreground mb-2">Windows</div>
                <CopyButton command={installCommandWindows} />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex justify-center gap-4 pt-8">
            <Link href="/docs" className={buttonVariants({ size: "lg" })}>
              <Book className="size-4" />
              Documentation
            </Link>
            <Link
              href="https://github.com/arctic-cli/interface"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              <Github className="size-4" />
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
