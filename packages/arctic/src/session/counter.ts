import { Global } from "@/global"
import path from "path"

const MIN_SESSIONS_FOR_FEEDBACK = 2

export namespace SessionCounter {
  const file = Bun.file(path.join(Global.Path.state, "feedback-state.json"))

  interface FeedbackState {
    feedbackShown: boolean
  }

  async function load(): Promise<FeedbackState> {
    try {
      const data = await file.json()
      return {
        feedbackShown: !!data.feedbackShown,
      }
    } catch {
      return { feedbackShown: false }
    }
  }

  async function save(data: FeedbackState): Promise<void> {
    await Bun.write(file, JSON.stringify(data, null, 2))
  }

  export async function shouldShowFeedback(sessionCount: number): Promise<boolean> {
    const state = await load()
    if (state.feedbackShown) return false
    return sessionCount >= MIN_SESSIONS_FOR_FEEDBACK
  }

  export async function markFeedbackShown(): Promise<void> {
    await save({ feedbackShown: true })
  }

  export async function reset(): Promise<void> {
    await save({ feedbackShown: false })
  }
}
