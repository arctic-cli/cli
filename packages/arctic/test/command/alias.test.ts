import { test, expect, describe } from "bun:test"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "@/project/instance"
import { Command } from "@/command"

describe("Command aliases", () => {
  test("should resolve command by alias", async () => {
    await using tmp = await tmpdir()
    
    // create config with command that has aliases
    await Bun.write(
      `${tmp.path}/arctic.json`,
      JSON.stringify({
        command: {
          auth: {
            template: "Connect to a provider",
            aliases: ["connect", "login"],
            description: "Authenticate with a provider",
          },
        },
      }),
    )

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        // should find by name
        const byName = await Command.get("auth")
        expect(byName).toBeDefined()
        expect(byName?.name).toBe("auth")
        expect(byName?.aliases).toEqual(["connect", "login"])

        // should find by first alias
        const byAlias1 = await Command.get("connect")
        expect(byAlias1).toBeDefined()
        expect(byAlias1?.name).toBe("auth")

        // should find by second alias
        const byAlias2 = await Command.get("login")
        expect(byAlias2).toBeDefined()
        expect(byAlias2?.name).toBe("auth")

        // should return undefined for non-existent command
        const notFound = await Command.get("nonexistent")
        expect(notFound).toBeUndefined()
      },
    })
  })

  test("should list all commands with aliases", async () => {
    await using tmp = await tmpdir()
    
    await Bun.write(
      `${tmp.path}/arctic.json`,
      JSON.stringify({
        command: {
          auth: {
            template: "Connect to a provider",
            aliases: ["connect"],
            description: "Authenticate with a provider",
          },
          deploy: {
            template: "Deploy the application",
            description: "Deploy to production",
          },
        },
      }),
    )

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const commands = await Command.list()
        
        // should include default commands plus custom ones
        expect(commands.length).toBeGreaterThan(2)
        
        const authCommand = commands.find((c) => c.name === "auth")
        expect(authCommand).toBeDefined()
        expect(authCommand?.aliases).toEqual(["connect"])
        
        const deployCommand = commands.find((c) => c.name === "deploy")
        expect(deployCommand).toBeDefined()
        expect(deployCommand?.aliases).toBeUndefined()
      },
    })
  })
})
