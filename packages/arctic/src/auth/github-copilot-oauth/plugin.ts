import type { Plugin, PluginInput } from "@arctic-cli/plugin"

export const ArcticGithubCopilotAuth: Plugin = async (input: PluginInput) => {
  return {
    auth: {
      provider: "github-copilot",

      async loader(getAuth, provider) {
        const auth = await getAuth()

        if (auth.type === "oauth" || auth.type === "api") {
          return {}
        }

        return {}
      },

      methods: [
        {
          label: "GitHub Personal Access Token",
          type: "api" as const,
        },
      ],
    },
  }
}

export default ArcticGithubCopilotAuth
