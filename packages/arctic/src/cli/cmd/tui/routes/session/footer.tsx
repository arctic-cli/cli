import type { AssistantMessage } from "@arctic-cli/sdk/v2"
import { createMemo, Match, onCleanup, onMount, Show, Switch } from "solid-js"
import { createStore } from "solid-js/store"
import { useConnected } from "../../component/dialog-model"
import { useDirectory } from "../../context/directory"
import { useKeybind } from "../../context/keybind"
import { useRoute } from "../../context/route"
import { useSync } from "../../context/sync"
import { useTheme } from "../../context/theme"

export function Footer() {
  const { theme } = useTheme()
  const sync = useSync()
  const route = useRoute()
  const keybind = useKeybind()
  const permissions = createMemo(() => {
    if (route.data.type !== "session") return []
    return sync.data.permission[route.data.sessionID] ?? []
  })
  const session = createMemo(() => {
    if (route.data.type !== "session") return undefined
    return sync.session.get(route.data.sessionID)
  })
  const messages = createMemo(() => {
    if (route.data.type !== "session") return []
    return sync.data.message[route.data.sessionID] ?? []
  })
  const context = createMemo(() => {
    const last = messages().findLast((x) => x.role === "assistant" && x.tokens.output > 0) as AssistantMessage
    if (!last) return
    const total =
      last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
    const model = sync.data.provider.find((x) => x.id === last.providerID)?.models[last.modelID]
    const limit = model?.limit.context
    return {
      tokens: total.toLocaleString(),
      percentage: limit ? Math.round((total / limit) * 100) : null,
    }
  })
  const benchmarkLabel = createMemo(() => {
    const current = session()
    if (!current?.benchmark) return undefined
    const parent = current.benchmark.type === "parent" ? current : sync.session.get(current.benchmark.parentID)
    if (parent?.benchmark?.type !== "parent") return undefined
    const children = parent.benchmark.children
    if (!children.length) return "Benchmark: 0 slots"
    const index = children.findIndex((child) => child.sessionID === current.id)
    if (index === -1) return `Benchmark: parent (${children.length} slots)`
    const model = children[index].model
    const isApplied = parent.benchmark.appliedSessionID === current.id
    return `Benchmark: ${model.providerID}/${model.modelID} (slot ${index + 1}/${children.length})${isApplied ? " (Applied)" : ""}`
  })
  const benchmarkSwitchHint = createMemo(() => {
    const current = session()
    if (!current?.benchmark) return undefined
    const parent = current.benchmark.type === "parent" ? current : sync.session.get(current.benchmark.parentID)
    if (parent?.benchmark?.type !== "parent") return undefined
    if (parent.benchmark.children.length <= 1) return undefined
    return `Switch ${keybind.print("benchmark_prev")} / ${keybind.print("benchmark_next")}`
  })
  const runningProcesses = createMemo(() => sync.data.pty.filter((p) => p.status === "running"))
  const directory = useDirectory()
  const connected = useConnected()

  const [store, setStore] = createStore({
    welcome: false,
  })

  onMount(() => {
    function tick() {
      if (connected()) return
      if (!store.welcome) {
        setStore("welcome", true)
        timeout = setTimeout(() => tick(), 5000)
        return
      }

      if (store.welcome) {
        setStore("welcome", false)
        timeout = setTimeout(() => tick(), 10_000)
        return
      }
    }
    let timeout = setTimeout(() => tick(), 10_000)

    onCleanup(() => {
      clearTimeout(timeout)
    })
  })

  return (
    <box flexDirection="row" justifyContent="space-between" gap={1} flexShrink={0} paddingLeft={1}>
      <box flexDirection="row" gap={1}>
        <text fg={theme.textMuted}>{directory()}</text>
        <Show when={sync.data.permission_bypass_enabled}>
          <text fg={theme.textMuted}>·</text>
          <text fg={theme.error}>⏵⏵ permission bypass enabled</text>
        </Show>
        <Show when={runningProcesses().length > 0}>
          <text fg={theme.textMuted}>·</text>
          <text fg={theme.success}>
            ◉ {runningProcesses().length} process{runningProcesses().length > 1 ? "es" : ""}{" "}
            <span style={{ fg: theme.textMuted }}>(/processes)</span>
          </text>
        </Show>
      </box>
      <box gap={2} flexDirection="row" flexShrink={0} paddingRight={1}>
        <Switch>
          <Match when={store.welcome}>
            <text fg={theme.text}>
              Get started <span style={{ fg: theme.textMuted }}>/connect</span>
            </text>
          </Match>
          <Match when={connected()}>
            <Show when={context()}>
              {(ctx) => (
                <text fg={theme.textMuted}>
                  {ctx().tokens} tokens{ctx().percentage !== null ? ` (${ctx().percentage}%)` : ""}
                </text>
              )}
            </Show>
            <Show when={permissions().length > 0}>
              <text fg={theme.warning}>
                <span style={{ fg: theme.warning }}>◉</span> {permissions().length} Permission
                {permissions().length > 1 ? "s" : ""}
              </text>
            </Show>
            <Show when={benchmarkLabel()}>{(label) => <text fg={theme.text}>{label()}</text>}</Show>
            <Show when={benchmarkSwitchHint()}>{(hint) => <text fg={theme.textMuted}>{hint()}</text>}</Show>
          </Match>
        </Switch>
      </box>
    </box>
  )
}
