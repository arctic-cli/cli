import { test, expect, describe } from "bun:test"
import { SessionCounter } from "@/session/counter"

describe("SessionCounter", () => {
  test("should show feedback after 2 sessions", async () => {
    await SessionCounter.reset()
    
    // Should not show feedback before 2 sessions
    expect(await SessionCounter.shouldShowFeedback(0)).toBe(false)
    expect(await SessionCounter.shouldShowFeedback(1)).toBe(false)
    
    // Should show feedback at 2 sessions
    expect(await SessionCounter.shouldShowFeedback(2)).toBe(true)
    expect(await SessionCounter.shouldShowFeedback(5)).toBe(true)
  })

  test("should not show feedback after marked as shown", async () => {
    await SessionCounter.reset()
    
    // Should show feedback at 2 sessions
    expect(await SessionCounter.shouldShowFeedback(2)).toBe(true)
    
    // Mark as shown
    await SessionCounter.markFeedbackShown()
    
    // Should not show anymore
    expect(await SessionCounter.shouldShowFeedback(5)).toBe(false)
    expect(await SessionCounter.shouldShowFeedback(100)).toBe(false)
  })
})
