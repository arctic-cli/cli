import { test, expect, describe } from "bun:test"
import { Permission } from "@/permission"
import { Instance } from "@/project/instance"
import { tmpdir } from "../fixture/fixture"
import { Bus } from "@/bus"

describe("Permission.allowAll", () => {
  test("allows all pending permissions for a session", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const sessionID = "test-session"
        const responses: string[] = []

        // Subscribe to replied events
        const unsubscribe = Bus.subscribe(Permission.Event.Replied, (event) => {
          responses.push(event.properties.response)
        })

        // Create multiple permission requests (don't await yet)
        const permissions = [
          Permission.ask({
            type: "bash",
            title: "Run bash command",
            pattern: "echo test",
            sessionID,
            messageID: "msg1",
            metadata: {},
          }),
          Permission.ask({
            type: "read",
            title: "Read file",
            pattern: "/tmp/test.txt",
            sessionID,
            messageID: "msg2",
            metadata: {},
          }),
          Permission.ask({
            type: "write",
            title: "Write file",
            pattern: "/tmp/output.txt",
            sessionID,
            messageID: "msg3",
            metadata: {},
          }),
        ]

        // Wait a bit for permissions to be pending
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Allow all permissions
        Permission.allowAll({ sessionID })

        // Wait for all promises to resolve
        await Promise.allSettled(permissions)

        // Clean up
        unsubscribe()

        // All permissions should be allowed with "always" response
        expect(responses.length).toBe(3)
        expect(responses.every((r) => r === "always")).toBe(true)

        // No pending permissions should remain
        const pending = Permission.pending()
        expect(pending[sessionID]).toEqual({})
      },
    })
  })

  test("handles empty pending permissions", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const sessionID = "test-session-empty"

        // Call allowAll with no pending permissions
        Permission.allowAll({ sessionID })

        // Should not throw
        expect(true).toBe(true)
      },
    })
  })

  test("only affects specified session", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const sessionID1 = "session-1"
        const sessionID2 = "session-2"
        const responses: { sessionID: string; response: string }[] = []

        // Subscribe to replied events
        const unsubscribe = Bus.subscribe(Permission.Event.Replied, (event) => {
          responses.push({
            sessionID: event.properties.sessionID,
            response: event.properties.response,
          })
        })

        // Create permissions for both sessions
        const perm1 = Permission.ask({
          type: "bash",
          title: "Session 1 command",
          sessionID: sessionID1,
          messageID: "msg1",
          metadata: {},
        })

        const perm2 = Permission.ask({
          type: "bash",
          title: "Session 2 command",
          sessionID: sessionID2,
          messageID: "msg2",
          metadata: {},
        })

        // Wait for permissions to be pending
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Allow all for session 1 only
        Permission.allowAll({ sessionID: sessionID1 })

        // Wait for session 1 permission to resolve
        await perm1

        // Clean up
        unsubscribe()

        // Only session 1 should be allowed
        expect(responses.length).toBe(1)
        expect(responses[0].sessionID).toBe(sessionID1)

        // Session 2 permission should still be pending
        const pending = Permission.pending()
        expect(pending[sessionID2]).toBeDefined()
        expect(Object.keys(pending[sessionID2]).length).toBe(1)

        // Reject session 2 to clean up
        Permission.respond({
          sessionID: sessionID2,
          permissionID: Object.keys(pending[sessionID2])[0],
          response: "reject",
        })

        await perm2.catch(() => {})
      },
    })
  })
})

describe("Permission.toggleAllowAllMode", () => {
  test("toggles allow-all mode for a session", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const sessionID = "test-session"

        // Initial state should be false
        expect(Permission.isAllowAllMode(sessionID)).toBe(false)

        // Toggle to true
        const enabled = Permission.toggleAllowAllMode(sessionID)
        expect(enabled).toBe(true)
        expect(Permission.isAllowAllMode(sessionID)).toBe(true)

        // Toggle back to false
        const disabled = Permission.toggleAllowAllMode(sessionID)
        expect(disabled).toBe(false)
        expect(Permission.isAllowAllMode(sessionID)).toBe(false)
      },
    })
  })

  test("auto-approves permissions when allow-all mode is enabled", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const sessionID = "test-session"

        // Enable allow-all mode
        Permission.toggleAllowAllMode(sessionID)

        // Create a permission request
        const perm = Permission.ask({
          type: "bash",
          title: "Run bash command",
          pattern: "echo test",
          sessionID,
          messageID: "msg1",
          metadata: {},
        })

        // Should resolve immediately without prompting
        await perm

        // No pending permissions should exist
        const pending = Permission.pending()
        expect(pending[sessionID] || {}).toEqual({})
      },
    })
  })

  test("publishes event when mode changes", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const sessionID = "test-session"
        const events: { sessionID: string; enabled: boolean }[] = []

        // Subscribe to mode change events
        const unsubscribe = Bus.subscribe(Permission.Event.AllowAllModeChanged, (event) => {
          events.push({
            sessionID: event.properties.sessionID,
            enabled: event.properties.enabled,
          })
        })

        // Toggle mode twice
        Permission.toggleAllowAllMode(sessionID)
        Permission.toggleAllowAllMode(sessionID)

        // Clean up
        unsubscribe()

        // Should have received two events
        expect(events.length).toBe(2)
        expect(events[0]).toEqual({ sessionID, enabled: true })
        expect(events[1]).toEqual({ sessionID, enabled: false })
      },
    })
  })
})
