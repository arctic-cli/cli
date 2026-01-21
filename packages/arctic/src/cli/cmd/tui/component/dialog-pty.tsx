import { createMemo, createSignal } from "solid-js"
import { useSync } from "@tui/context/sync"
import { DialogSelect, type DialogSelectRef, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useTheme } from "../context/theme"
import { Keybind } from "@/util/keybind"
import { TextAttributes } from "@opentui/core"
import { useSDK } from "@tui/context/sdk"
import { useToast } from "@tui/ui/toast"

function Status(props: { status: "running" | "exited" }) {
  const { theme } = useTheme()
  if (props.status === "running") {
    return <span style={{ fg: theme.success, attributes: TextAttributes.BOLD }}>● Running</span>
  }
  return <span style={{ fg: theme.textMuted }}>○ Exited</span>
}

export function DialogPty() {
  const sync = useSync()
  const sdk = useSDK()
  const toast = useToast()
  const [, setRef] = createSignal<DialogSelectRef<unknown>>()
  const [busy, setBusy] = createSignal<{ id: string; action: "stopping" | "restarting" } | null>(null)

  const options = createMemo(() => {
    const ptyData = sync.data.pty
    const busyState = busy()

    if (ptyData.length === 0) {
      return [
        {
          value: "__empty__",
          title: "No running processes",
          description: "processes started by the AI will appear here",
          disabled: true,
        },
      ]
    }

    return ptyData.map((pty) => {
      const isBusy = busyState?.id === pty.id
      const footer = isBusy ? (
        <span>{busyState.action}...</span>
      ) : (
        <Status status={pty.status} />
      )

      return {
        value: pty.id,
        title: pty.title,
        description: `${pty.command} ${pty.args.join(" ")}`.trim(),
        footer,
      }
    })
  })

  const keybinds = createMemo(() => [
    {
      keybind: Keybind.parse("d")[0],
      title: "stop",
      onTrigger: async (option: DialogSelectOption<string>) => {
        if (option.value === "__empty__") return
        if (busy() !== null) return

        const pty = sync.data.pty.find((p) => p.id === option.value)
        if (!pty || pty.status !== "running") return

        setBusy({ id: option.value, action: "stopping" })
        try {
          await sdk.client.pty.remove({ ptyID: option.value })
          toast.show({ message: `Stopped ${pty.title}`, variant: "success" })
        } catch {
          toast.show({ message: "Failed to stop process", variant: "error" })
        } finally {
          setBusy(null)
        }
      },
    },
    {
      keybind: Keybind.parse("r")[0],
      title: "restart",
      onTrigger: async (option: DialogSelectOption<string>) => {
        if (option.value === "__empty__") return
        if (busy() !== null) return

        const pty = sync.data.pty.find((p) => p.id === option.value)
        if (!pty) return

        setBusy({ id: option.value, action: "restarting" })
        try {
          if (pty.status === "running") {
            await sdk.client.pty.remove({ ptyID: option.value })
          }
          await sdk.client.pty.create({
            command: pty.command,
            args: pty.args,
            cwd: pty.cwd,
            title: pty.title,
          })
          toast.show({ message: `Restarted ${pty.title}`, variant: "success" })
        } catch {
          toast.show({ message: "Failed to restart process", variant: "error" })
        } finally {
          setBusy(null)
        }
      },
    },
  ])

  return (
    <DialogSelect
      ref={setRef}
      title="Processes"
      options={options()}
      keybind={keybinds()}
      onSelect={() => {}}
    />
  )
}
