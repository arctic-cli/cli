import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card"
import { GridBackground } from "@/components/ui/grid-background"
import { ArrowRight, Github as GithubIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { CopyButton } from "./copy-button"
import { InstallSelector } from "./install-selector"
import { Navbar } from "./navbar"

export default function HomePage() {
  const installCommandMacLinux = "curl -fsSL https://usearctic.sh/install | bash"

  return (
    <div className="min-h-screen w-full overflow-x-hidden antialiased">
      <Navbar />
      <GridBackground className="relative">
        <section className="px-6 pt-32 pb-20 md:pt-48 md:pb-32 relative z-10">
          <div className="mx-auto max-w-5xl">
            <div className="text-center space-y-8">
              <h1 className="text-6xl md:text-8xl font-semibold tracking-tight text-foreground/95 leading-[0.95] md:leading-[0.95]">
                Arctic
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground/90 max-w-2xl mx-auto font-normal tracking-tight leading-relaxed">
                A unified interface for every AI coding plan.
                <br className="hidden md:block" />
                See your limits. Stay in control.
              </p>
            </div>

            <div className="mt-12 flex flex-col items-center gap-6">
              <div className="w-full max-w-2xl relative z-20">
                <InstallSelector />
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <Link href="/docs" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  Documentation
                  <ArrowRight className="size-4" />
                </Link>
                <span className="text-border">|</span>
                <Link
                  href="https://github.com/arctic-cli/interface"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <GithubIcon className="size-4" />
                  GitHub
                </Link>
              </div>
            </div>
          </div>
        </section>
      </GridBackground>

      <section className="px-6 pb-32 relative z-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-black/5">
            <video src="/arctic.mp4" autoPlay playsInline loop muted preload="auto" className="w-full h-auto">
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      <section className="px-6 py-32 bg-muted/20">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
            <div className="space-y-6 order-2 md:order-1">
              <div className="inline-block px-3 py-1 rounded-full bg-foreground/5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Universal
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
                Works with all your coding plans.
              </h2>
              <p className="text-lg text-muted-foreground/80 leading-relaxed">
                Codex. Claude Code. Gemini. Antigravity. GitHub Copilot. Every major AI coding plan in one place. Switch
                providers instantly without losing your context or workflow.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                {["Codex", "Claude Code", "Gemini", "Antigravity", "Copilot", "Z.ai", "Kimi"].map((provider) => (
                  <span
                    key={provider}
                    className="px-3 py-1.5 rounded-full bg-background/80 border border-border/50 text-xs font-medium text-muted-foreground"
                  >
                    {provider}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-border/50 shadow-xl order-1 md:order-2">
              <Image
                src="/session_interface.png"
                alt="Arctic Session Interface"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-32 bg-muted/20">
        <div className="mx-auto max-w-5xl space-y-16">
          <div className="text-center space-y-4">
            <div className="inline-block px-3 py-1 rounded-full bg-foreground/5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Live usage tracking
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight max-w-3xl mx-auto">
              See exactly how much you have left on each plan.
            </h2>
            <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto">
              Arctic fetches and displays usage limits for all your subscription-based coding plans. Track requests,
              tokens, and quotas in real-time.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { name: "Claude Code", img: "/cc_usage.png", desc: "Daily message limits" },
              { name: "Gemini CLI", img: "/google_usage.png", desc: "Request quotas" },
            ].map((provider) => (
              <Card key={provider.name} className="group overflow-hidden transition-all hover:shadow-lg">
                <CardHeader className="border-b">
                  <CardTitle>{provider.name}</CardTitle>
                  <CardDescription>{provider.desc}</CardDescription>
                </CardHeader>
                <CardPanel className="p-6">
                  <Image
                    src={provider.img}
                    alt={`${provider.name} Usage Limits`}
                    width={800}
                    height={400}
                    className="w-full rounded-lg"
                  />
                </CardPanel>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
            <div className="rounded-2xl overflow-hidden border border-border/50 shadow-xl">
              <Image src="/stats.png" alt="Arctic Stats" width={1200} height={800} className="w-full h-auto" />
            </div>
            <div className="space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-foreground/5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Insights
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
                Track your usage.
                <br />
                Know what you spend.
              </h2>
              <p className="text-lg text-muted-foreground/80 leading-relaxed">
                Run <code className="px-2 py-1 rounded bg-muted text-sm font-mono">arctic stats</code> to see your
                complete usage breakdown. Track costs, tokens, and requests across all your AI providers. Understand
                your patterns and optimize your spending.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-32">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <div className="inline-block px-3 py-1 rounded-full bg-foreground/5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Private by design
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">Your code stays yours.</h2>
          <p className="text-lg text-muted-foreground/80 leading-relaxed max-w-2xl mx-auto">
            Arctic runs entirely on your machine. No proxies. No data collection. No training on your code. Direct
            connection from you to your AI provider.
          </p>
          <div className="pt-4">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-background border border-border/50 text-sm font-medium">
              <span className="text-muted-foreground">You</span>
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span className="text-foreground">AI Provider</span>
            </div>
          </div>
        </div>
      </section>

      <GridBackground className="border-t border-border/50">
        <section className="px-6 py-32">
          <div className="mx-auto max-w-3xl text-center space-y-10">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Get started in seconds.</h2>
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <CopyButton command={installCommandMacLinux} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">macOS and Linux supported</p>
          </div>
        </section>
      </GridBackground>
    </div>
  )
}
