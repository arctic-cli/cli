import { test, expect, describe } from "bun:test"
import { Permission } from "@/permission"
import { Instance } from "@/project/instance"
import { tmpdir } from "../fixture/fixture"
import { Bus } from "@/bus"

describe("Permission.respond", () => {
  test("responds to pending permissions for a session", async () => {
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

        // Respond to all permissions with "always"
        const pending = Permission.pending()
        for (const permissionID of Object.keys(pending[sessionID])) {
          Permission.respond({ sessionID, permissionID, response: "always" })
        }

        // Wait for all promises to resolve
        await Promise.allSettled(permissions)

        // Clean up
        unsubscribe()

        // All permissions should be allowed with "always" response
        expect(responses.length).toBe(3)
        expect(responses.every((r) => r === "always")).toBe(true)

        // No pending permissions should remain
        const pendingAfter = Permission.pending()
        expect(pendingAfter[sessionID]).toEqual({})
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

        // Respond to session 1 only
        const pending = Permission.pending()
        for (const permissionID of Object.keys(pending[sessionID1])) {
          Permission.respond({ sessionID: sessionID1, permissionID, response: "always" })
        }

        // Wait for session 1 permission to resolve
        await perm1

        // Clean up
        unsubscribe()

        // Only session 1 should be allowed
        expect(responses.length).toBe(1)
        expect(responses[0].sessionID).toBe(sessionID1)

        // Session 2 permission should still be pending
        const pendingAfter = Permission.pending()
        expect(pendingAfter[sessionID2]).toBeDefined()
        expect(Object.keys(pendingAfter[sessionID2]).length).toBe(1)

        // Reject session 2 to clean up
        Permission.respond({
          sessionID: sessionID2,
          permissionID: Object.keys(pendingAfter[sessionID2])[0],
          response: "reject",
        })

        await perm2.catch(() => {})
      },
    })
  })
})
