import { Locale } from "@/util/locale"
import { useKeyboard } from "@opentui/solid"
import { Prompt, type PromptRef } from "@tui/component/prompt"
import { useRouteData } from "@tui/context/route"
import { useTheme } from "@tui/context/theme"
import { createMemo, Match, onMount, Show, Switch } from "solid-js"
import { Logo } from "../component/logo"
import { useArgs } from "../context/args"
import { useExitConfirmation } from "../context/exit-confirmation"
import { useKeybind } from "../context/keybind"
import { usePromptRef } from "../context/prompt"
import { useSync } from "../context/sync"
import { Toast, useToast } from "../ui/toast"

// TODO: what is the best way to do this?
let once = false

export function Home() {
  const sync = useSync()
  const { theme } = useTheme()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const toast = useToast()
  const keybind = useKeybind()
  const exitConfirmation = useExitConfirmation()
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
      <box flexGrow={1} flexDirection="column" alignItems="flex-start" justifyContent="space-between" gap={1}>
        <Logo />
        <box flexGrow={1} />
        <box width="100%" alignSelf="stretch" zIndex={1000}>
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
