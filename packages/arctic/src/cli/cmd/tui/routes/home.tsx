import { Locale } from "@/util/locale"
import { Prompt, type PromptRef } from "@tui/component/prompt"
import { useRouteData } from "@tui/context/route"
import { useTheme } from "@tui/context/theme"
import open from "open"
import { createMemo, Match, onMount, Show, Switch } from "solid-js"
import { useCommandDialog } from "../component/dialog-command"
import { Logo } from "../component/logo"
import { useArgs } from "../context/args"
import { useExitConfirmation } from "../context/exit-confirmation"
import { usePromptRef } from "../context/prompt"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"

// TODO: what is the best way to do this?
let once = false

export function Home() {
  const sync = useSync()
  const { theme } = useTheme()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const exitConfirmation = useExitConfirmation()
  const command = useCommandDialog()
  const mcpError = createMemo(() => {
    return Object.values(sync.data.mcp).some((x) => x.status === "failed")
  })

  const connectedMcpCount = createMemo(() => {
    return Object.values(sync.data.mcp).filter((x) => x.status === "connected").length
  })

  const Hint = (
    <Show when={connectedMcpCount() > 0}>
      <box flexShrink={0} flexDirection="row" gap={1}>
        <text fg={theme.text}>
          <Switch>
            <Match when={mcpError()}>
              <span style={{ fg: theme.error }}>•</span> mcp errors{" "}
              <span style={{ fg: theme.textMuted }}>ctrl+x s</span>
            </Match>
            <Match when={true}>
              <span style={{ fg: theme.success }}>•</span>{" "}
              {Locale.pluralize(connectedMcpCount(), "{} mcp server", "{} mcp servers")}
            </Match>
          </Switch>
        </text>
      </box>
    </Show>
  )

  let prompt: PromptRef
  const args = useArgs()
  onMount(() => {
    if (once) return
    if (route.initialPrompt) {
      prompt.set(route.initialPrompt)
      once = true
    } else if (args.prompt) {
      prompt.set({ input: args.prompt, parts: [] })
      once = true
    }
  })

  return (
    <>
      <box flexGrow={1} flexDirection="column" alignItems="flex-start" justifyContent="flex-end" gap={1}>
        <scrollbox
          flexGrow={1}
          flexShrink={1}
          width="100%"
          onMouseDown={() => {
            setTimeout(() => prompt?.focus(), 1)
          }}
        >
          <Logo
            onConnectProvider={() => command.trigger("provider.connect")}
            onChangeModel={() => command.trigger("model.list")}
            onViewUsage={() => command.trigger("arctic.usage")}
            onChangeTheme={() => command.trigger("theme.switch")}
            onJoinDiscord={() => open("https://discord.gg/ZXqPu6GgsV").catch(() => {})}
          />
        </scrollbox>
        <box width="100%" alignSelf="stretch" zIndex={1000} flexShrink={0}>
          <Prompt
            ref={(r) => {
              prompt = r
              promptRef.set(r)
            }}
            hint={Hint}
            exitConfirmation={exitConfirmation()}
          />
        </box>
        <Toast />
      </box>
    </>
  )
}
