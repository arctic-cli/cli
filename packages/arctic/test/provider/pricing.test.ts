import { test, expect, describe, beforeAll } from "bun:test"
import { Pricing, initModelsDevPricing } from "@/provider/pricing"

describe("Pricing with models.dev", () => {
  beforeAll(async () => {
    // Initialize pricing cache before tests
    await initModelsDevPricing()
  })

  test("fetches pricing from LiteLLM", async () => {
    const pricing = await Pricing.getModelPricingAsync("claude-3-5-sonnet-20241022")
    expect(pricing).toBeDefined()
    expect(pricing?.input).toBeGreaterThan(0)
    expect(pricing?.output).toBeGreaterThan(0)
  })

  test("calculates cost for Claude model", async () => {
    const cost = await Pricing.calculateCostAsync("claude-3-5-sonnet-20241022", {
      input: 1000,
      output: 500,
    })
    expect(cost).toBeDefined()
    expect(cost?.totalCost).toBeGreaterThan(0)
    expect(cost?.inputCost).toBeGreaterThan(0)
    expect(cost?.outputCost).toBeGreaterThan(0)
  })

  test("handles cache costs", async () => {
    const cost = await Pricing.calculateCostAsync("claude-3-5-sonnet-20241022", {
      input: 1000,
      output: 500,
      cacheCreation: 200,
      cacheRead: 100,
    })
    expect(cost).toBeDefined()
    expect(cost?.totalCost).toBeGreaterThan(0)
  })

  test("normalizes model IDs with provider prefix", async () => {
    const cost1 = await Pricing.calculateCostAsync("claude-3-5-sonnet-20241022", {
      input: 1000,
      output: 500,
    })
    const cost2 = await Pricing.calculateCostAsync("anthropic/claude-3-5-sonnet-20241022", {
      input: 1000,
      output: 500,
    })
    expect(cost1).toBeDefined()
    expect(cost2).toBeDefined()
    // Both should return the same pricing
    expect(cost1?.totalCost).toBe(cost2?.totalCost)
  })

  test("uses fallback pricing for GLM models", async () => {
    const pricing = await Pricing.getModelPricingAsync("glm-4.7")
    expect(pricing).toBeDefined()
    expect(pricing?.input).toBe(0.6)
    expect(pricing?.output).toBe(2.2)
    expect(pricing?.cacheRead).toBe(0.11)
  })

  test("uses fallback pricing for GLM models with provider prefix", async () => {
    const pricing = await Pricing.getModelPricingAsync("zai-coding-plan/glm-4.7")
    expect(pricing).toBeDefined()
    expect(pricing?.input).toBe(0.6)
    expect(pricing?.output).toBe(2.2)
  })

  test("uses fallback pricing for Antigravity models", async () => {
    const pricing1 = await Pricing.getModelPricingAsync("antigravity/claude-sonnet-4-5-thinking")
    expect(pricing1).toBeDefined()
    expect(pricing1?.input).toBe(3)
    expect(pricing1?.output).toBe(15)

    const pricing2 = await Pricing.getModelPricingAsync("antigravity/claude-opus-4-5-thinking")
    expect(pricing2).toBeDefined()
    expect(pricing2?.input).toBe(5)
    expect(pricing2?.output).toBe(25)
  })

  test("calculates cost for fallback models", async () => {
    const cost = await Pricing.calculateCostAsync("zai-coding-plan/glm-4.7", {
      input: 1000000,
      output: 500000,
    })
    expect(cost).toBeDefined()
    // 1M tokens * $0.6 + 0.5M tokens * $2.2 = $0.60 + $1.10 = $1.70
    expect(cost?.totalCost).toBeCloseTo(1.7, 2)
  })

  test("returns undefined for unknown model", async () => {
    const pricing = await Pricing.getModelPricingAsync("unknown-model-12345")
    expect(pricing).toBeUndefined()
  })

  test("formats costs correctly", () => {
    expect(Pricing.formatCost(0)).toBe("$0.00")
    expect(Pricing.formatCost(0.00005)).toBe("$5.00e-5")
    expect(Pricing.formatCost(0.005)).toBe("$0.0050")
    expect(Pricing.formatCost(0.5)).toBe("$0.500")
    expect(Pricing.formatCost(5)).toBe("$5.00")
  })
})
