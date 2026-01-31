import { Global } from "@/global"
import { Installation } from "@/installation"
import { TextareaRenderable, TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import open from "open"
import { For, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { useTheme } from "../context/theme"
import { useDialog, type DialogContext } from "../ui/dialog"

const FEEDBACK_ENDPOINT = "https://usearctic.sh/api/feedback"
const CATEGORIES = [
  { value: "feature", label: "Feature Request", hint: "Something you'd like to see added" },
  { value: "improvement", label: "Improvement", hint: "Something that could work better" },
  { value: "praise", label: "Praise", hint: "Tell us what you love" },
  { value: "other", label: "Other", hint: "Anything else" },
] as const

export type FeedbackDialogProps = {
  onSubmit?: () => void
  onCancel?: () => void
}

export function FeedbackDialog(props: FeedbackDialogProps) {
  const dialog = useDialog()
  const { theme } = useTheme()
  let textarea: TextareaRenderable

  const [store, setStore] = createStore({
    step: "input" as "input" | "submitting" | "success",
    categoryIndex: 0,
    error: null as string | null,
  })

  const currentCategory = () => CATEGORIES[store.categoryIndex]

  useKeyboard((evt) => {
    if (store.step === "input") {
      if (evt.name === "left" || evt.name === "right") {
        const nextIndex =
          evt.name === "left"
            ? (store.categoryIndex - 1 + CATEGORIES.length) % CATEGORIES.length
            : (store.categoryIndex + 1) % CATEGORIES.length
        setStore("categoryIndex", nextIndex)
      }

      if (evt.name === "return") {
        const text = textarea.plainText.trim()
        if (text.length < 10) {
          setStore("error", "Please provide at least 10 characters")
          return
        }
        submitFeedback(text)
      }
    }

    if (store.step === "success" && evt.name === "return") {
      dialog.clear()
    }
  })

  async function submitFeedback(text: string) {
    setStore("step", "submitting")

    try {
      const deviceId = await Global.getDeviceId()
      const response = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: text,
          category: currentCategory().value,
          version: Installation.VERSION,
          deviceId,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error("Failed to submit feedback")
      }

      setStore("step", "success")
      props.onSubmit?.()
    } catch (e) {
      setStore("error", "Failed to submit. Please try again or use /feedback command.")
      setStore("step", "input")
    }
  }

  onMount(() => {
    dialog.setSize("large")
    setTimeout(() => {
      textarea?.focus()
    }, 1)
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {store.step === "success" ? "Thank you!" : "Share your feedback"}
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>

      {store.step !== "success" && (
        <box paddingBottom={1}>
          <text fg={theme.textMuted}>You've used Arctic in 2+ sessions. Your feedback helps us improve!</text>
        </box>
      )}

      {store.step === "input" && (
        <>
          <box gap={1}>
            <textarea
              onSubmit={() => {}}
              height={5}
              ref={(val: TextareaRenderable) => (textarea = val)}
              placeholder="What would you like to tell us? (10+ characters)"
              textColor={theme.text}
              focusedTextColor={theme.text}
              cursorColor={theme.text}
            />
          </box>

          {store.error && (
            <box>
              <text fg={theme.error}>{store.error}</text>
            </box>
          )}

          <box paddingTop={1} paddingBottom={1}>
            <text fg={theme.textMuted}>Category: {currentCategory().label}</text>
          </box>

          <box flexDirection="row" gap={1} paddingBottom={1} flexWrap="wrap">
            <For each={CATEGORIES}>
              {(cat, index) => (
                <box
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={index() === store.categoryIndex ? theme.primary : undefined}
                >
                  <text
                    fg={index() === store.categoryIndex ? theme.selectedListItemText : theme.textMuted}
                    attributes={index() === store.categoryIndex ? TextAttributes.BOLD : undefined}
                  >
                    {cat.label}
                  </text>
                </box>
              )}
            </For>
          </box>

          <box paddingBottom={1}>
            <text fg={theme.textMuted}>{currentCategory().hint}</text>
          </box>

          <box paddingBottom={1} gap={1} flexDirection="row">
            <text fg={theme.text}>
              ← → <span style={{ fg: theme.textMuted }}>change category</span>
            </text>
            <text fg={theme.text}>
              enter <span style={{ fg: theme.textMuted }}>submit</span>
            </text>
          </box>
        </>
      )}

      {store.step === "submitting" && (
        <box paddingTop={2} paddingBottom={2}>
          <text fg={theme.textMuted}>Submitting feedback...</text>
        </box>
      )}

      {store.step === "success" && (
        <>
          <box paddingTop={1} paddingBottom={1}>
            <text fg={theme.text}>Your feedback has been sent. Thank you for helping improve Arctic!</text>
          </box>
          <box paddingTop={1} paddingBottom={1}>
            <text fg={theme.primary} attributes={TextAttributes.BOLD}>
              Join the community
            </text>
          </box>
          <box gap={1}>
            <box
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={theme.primary}
              onMouseUp={() => open("https://github.com/arctic-cli/interface/discussions").catch(() => {})}
            >
              <text fg={theme.selectedListItemText}>GitHub Discussions</text>
            </box>
            <box
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={theme.primary}
              onMouseUp={() => open("https://discord.gg/ZXqPu6GgsV").catch(() => {})}
            >
              <text fg={theme.selectedListItemText}>Discord</text>
            </box>
          </box>
          <box paddingTop={2} paddingBottom={1} gap={1} flexDirection="row">
            <text fg={theme.text}>
              enter <span style={{ fg: theme.textMuted }}>close</span>
            </text>
          </box>
        </>
      )}
    </box>
  )
}

FeedbackDialog.show = (dialog: DialogContext) => {
  return new Promise<boolean>((resolve) => {
    dialog.replace(
      () => <FeedbackDialog onSubmit={() => resolve(true)} onCancel={() => resolve(false)} />,
      () => resolve(false),
    )
  })
}
