import { test, expect, describe } from "bun:test"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "@/project/instance"
import { Skill } from "@/skill/types"
import * as fs from "fs/promises"
import path from "path"

const VALID_SKILL = `---
name: git-release
description: Create consistent releases and changelogs from Git history. Use when preparing a tagged release.
license: MIT
compatibility: claude-code, cursor, vscode
metadata:
  audience: maintainers
  workflow: github
argument-hint: [version]
disable-model-invocation: true
allowed-tools: Read, Bash, Glob, Grep
---
## What I do

- Draft release notes from merged PRs
- Propose a version bump based on conventional commits

## When to use me

Use this skill when you are preparing a tagged release.
`

const MINIMAL_SKILL = `---
name: minimal-skill
description: A minimal skill for testing purposes only.
---
This is the content.
`

const INVALID_SKILL_SHORT_DESC = `---
name: bad-skill
description: Too short
---
Content here
`

describe("Skill", () => {
  describe("Frontmatter", () => {
    test("parses valid frontmatter with all fields", () => {
      const data = {
        name: "git-release",
        description: "Create consistent releases and changelogs from Git history. Use when preparing a tagged release.",
        license: "MIT",
        compatibility: ["claude-code", "cursor", "vscode"],
        metadata: { audience: "maintainers", workflow: "github" },
        "argument-hint": ["version"],
        "disable-model-invocation": true,
        "allowed-tools": ["Read", "Bash", "Glob", "Grep"],
      }

      const result = Skill.Frontmatter.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe("git-release")
        expect(result.data.license).toBe("MIT")
        expect(result.data["disable-model-invocation"]).toBe(true)
      }
    })

    test("parses minimal frontmatter", () => {
      const data = {
        name: "minimal",
        description: "A minimal skill for testing purposes only.",
      }

      const result = Skill.Frontmatter.safeParse(data)
      expect(result.success).toBe(true)
    })

    test("rejects short description", () => {
      const data = {
        name: "bad",
        description: "Too short",
      }

      const result = Skill.Frontmatter.safeParse(data)
      expect(result.success).toBe(false)
    })

    test("accepts compatibility as string", () => {
      const data = {
        name: "test",
        description: "A skill with string compatibility field.",
        compatibility: "claude-code, cursor",
      }

      const result = Skill.Frontmatter.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe("SkillRegistry", () => {
    test("discovers skills from config directories", async () => {
      await using tmp = await tmpdir({
        git: true,
        async init(dir) {
          const arcticDir = path.join(dir, ".arctic", "skills")
          await fs.mkdir(arcticDir, { recursive: true })
          await fs.writeFile(path.join(arcticDir, "git-release.md"), VALID_SKILL)
          await fs.writeFile(path.join(arcticDir, "minimal.md"), MINIMAL_SKILL)
        },
      })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const { SkillRegistry } = await import("@/skill/registry")
          const skills = await SkillRegistry.all()

          expect(skills.length).toBe(2)
          expect(skills.map((s) => s.name).sort()).toEqual(["git-release", "minimal-skill"])
        },
      })
    })

    test("parses skill content correctly", async () => {
      await using tmp = await tmpdir({
        git: true,
        async init(dir) {
          const arcticDir = path.join(dir, ".arctic", "skills")
          await fs.mkdir(arcticDir, { recursive: true })
          await fs.writeFile(path.join(arcticDir, "git-release.md"), VALID_SKILL)
        },
      })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const { SkillRegistry } = await import("@/skill/registry")
          const skill = await SkillRegistry.get("git-release")

          expect(skill).toBeDefined()
          expect(skill!.name).toBe("git-release")
          expect(skill!.license).toBe("MIT")
          expect(skill!.compatibility).toEqual(["claude-code", "cursor", "vscode"])
          expect(skill!.disableModelInvocation).toBe(true)
          expect(skill!.allowedTools).toEqual(["Read", "Bash", "Glob", "Grep"])
          expect(skill!.content).toContain("## What I do")
        },
      })
    })

    test("skips invalid skills", async () => {
      await using tmp = await tmpdir({
        git: true,
        async init(dir) {
          const arcticDir = path.join(dir, ".arctic", "skills")
          await fs.mkdir(arcticDir, { recursive: true })
          await fs.writeFile(path.join(arcticDir, "valid.md"), MINIMAL_SKILL)
          await fs.writeFile(path.join(arcticDir, "invalid.md"), INVALID_SKILL_SHORT_DESC)
        },
      })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const { SkillRegistry } = await import("@/skill/registry")
          const skills = await SkillRegistry.all()

          expect(skills.length).toBe(1)
          expect(skills[0].name).toBe("minimal-skill")
        },
      })
    })

    test("search finds matching skills", async () => {
      await using tmp = await tmpdir({
        git: true,
        async init(dir) {
          const arcticDir = path.join(dir, ".arctic", "skills")
          await fs.mkdir(arcticDir, { recursive: true })
          await fs.writeFile(path.join(arcticDir, "git-release.md"), VALID_SKILL)
          await fs.writeFile(path.join(arcticDir, "minimal.md"), MINIMAL_SKILL)
        },
      })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const { SkillRegistry } = await import("@/skill/registry")

          const result = await SkillRegistry.search("git")
          expect(result.total).toBe(1)
          expect(result.matches[0].name).toBe("git-release")

          const allResult = await SkillRegistry.search("*")
          expect(allResult.total).toBe(2)
        },
      })
    })

    test("discovers skills from .agent/skills directory", async () => {
      await using tmp = await tmpdir({
        git: true,
        async init(dir) {
          const agentDir = path.join(dir, ".agent", "skills")
          await fs.mkdir(agentDir, { recursive: true })
          await fs.writeFile(path.join(agentDir, "agent-skill.md"), VALID_SKILL)
        },
      })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const { SkillRegistry } = await import("@/skill/registry")
          const skills = await SkillRegistry.all()

          expect(skills.length).toBe(1)
          expect(skills[0].name).toBe("git-release")
        },
      })
    })

    test("discovers skills from both .arctic/skills and .agent/skills", async () => {
      await using tmp = await tmpdir({
        git: true,
        async init(dir) {
          const arcticDir = path.join(dir, ".arctic", "skills")
          await fs.mkdir(arcticDir, { recursive: true })
          await fs.writeFile(path.join(arcticDir, "arctic-skill.md"), MINIMAL_SKILL)

          const agentDir = path.join(dir, ".agent", "skills")
          await fs.mkdir(agentDir, { recursive: true })
          await fs.writeFile(path.join(agentDir, "agent-skill.md"), VALID_SKILL)
        },
      })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const { SkillRegistry } = await import("@/skill/registry")
          const skills = await SkillRegistry.all()

          expect(skills.length).toBe(2)
          expect(skills.map((s) => s.name).sort()).toEqual(["git-release", "minimal-skill"])
        },
      })
    })
  })
})
