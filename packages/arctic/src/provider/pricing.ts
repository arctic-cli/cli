// Models.dev API response types
type ModelsDevModel = {
  id: string
  name: string
  cost?: {
    input: number
    output: number
    cache_read?: number
    cache_write?: number
  }
  [key: string]: unknown
}

type ModelsDevProvider = {
  id: string
  name: string
  models: Record<string, ModelsDevModel>
  [key: string]: unknown
}

type ModelsDevResponse = Record<string, ModelsDevProvider>

// Cache for models.dev pricing data with 24-hour TTL
let modelsDevCache: { data: ModelsDevResponse; timestamp: number } | null = null
const MODELSDEV_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const MODELSDEV_API_URL = "https://models.dev/api.json"

// Fallback pricing for models not in models.dev (prices per million tokens)
const FALLBACK_PRICING: Record<string, ModelPricing> = {
  // Antigravity models (use Anthropic pricing since they proxy to Claude)
  "claude-sonnet-4-5-thinking": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-opus-4-5-thinking": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-opus-4-thinking": { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  "claude-haiku-4-5-thinking": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
}

/**
 * Initialize models.dev pricing cache (call early to populate cache for sync access)
 */
export async function initModelsDevPricing(): Promise<void> {
  await fetchModelsDevData()
}

async function fetchModelsDevData(): Promise<ModelsDevResponse> {
  if (modelsDevCache && Date.now() - modelsDevCache.timestamp < MODELSDEV_CACHE_TTL) {
    return modelsDevCache.data
  }

  const response = await fetch(MODELSDEV_API_URL)
  if (!response.ok) {
    throw new Error(`models.dev API error: ${response.status}`)
  }

  const data = (await response.json()) as ModelsDevResponse
  modelsDevCache = { data, timestamp: Date.now() }
  return data
}

export type TokenUsage = {
  input?: number
  output?: number
  cacheCreation?: number
  cacheRead?: number
}

export type CostBreakdown = {
  inputCost: number
  outputCost: number
  cacheCreationCost: number
  cacheReadCost: number
  totalCost: number
}

export type ModelPricing = {
  input: number
  output: number
  cacheWrite?: number
  cacheRead?: number
}

export namespace Pricing {
  /**
   * Extract model ID from full model string (strip provider prefix)
   */
  function extractModelId(modelId: string): string {
    const parts = modelId.split("/")
    return parts.length > 1 ? parts[1] : parts[0]
  }

  /**
   * Normalize model ID for matching (handle version number formats)
   */
  function normalizeModelId(modelId: string): string {
    return modelId.replace(/\./g, "-") // Convert 4.5 to 4-5
  }

  /**
   * Get pricing information for a specific model (sync - cached data only)
   */
  export function getModelPricing(modelId: string): ModelPricing | undefined {
    const modelName = extractModelId(modelId)
    const normalized = normalizeModelId(modelName)

    // Check fallback first
    if (FALLBACK_PRICING[modelName]) {
      return FALLBACK_PRICING[modelName]
    }
    if (FALLBACK_PRICING[normalized]) {
      return FALLBACK_PRICING[normalized]
    }

    if (!modelsDevCache) return undefined

    // Search all providers for the model, prefer non-zero pricing
    let zeroCostPricing: ModelPricing | undefined

    for (const provider of Object.values(modelsDevCache.data)) {
      // Try exact match first
      let model = provider.models[modelName]
      // Try normalized match if exact fails
      if (!model) {
        for (const [key, value] of Object.entries(provider.models)) {
          if (normalizeModelId(key) === normalized) {
            model = value
            break
          }
        }
      }

      if (model?.cost) {
        const pricing = {
          input: model.cost.input,
          output: model.cost.output,
          cacheWrite: model.cost.cache_write,
          cacheRead: model.cost.cache_read,
        }

        // If we find non-zero pricing, return it immediately
        if (pricing.input > 0 || pricing.output > 0) {
          return pricing
        }

        // Store zero-cost pricing as fallback
        if (!zeroCostPricing) {
          zeroCostPricing = pricing
        }
      }
    }

    // Return zero-cost pricing if that's all we found
    return zeroCostPricing
  }

  /**
   * Get pricing information for a specific model (async - fetches if needed)
   */
  export async function getModelPricingAsync(modelId: string): Promise<ModelPricing | undefined> {
    const modelName = extractModelId(modelId)
    const normalized = normalizeModelId(modelName)

    // Check fallback first
    if (FALLBACK_PRICING[modelName]) {
      return FALLBACK_PRICING[modelName]
    }
    if (FALLBACK_PRICING[normalized]) {
      return FALLBACK_PRICING[normalized]
    }

    const data = await fetchModelsDevData()

    // Search all providers for the model, prefer non-zero pricing
    let zeroCostPricing: ModelPricing | undefined

    for (const provider of Object.values(data)) {
      // Try exact match first
      let model = provider.models[modelName]
      // Try normalized match if exact fails
      if (!model) {
        for (const [key, value] of Object.entries(provider.models)) {
          if (normalizeModelId(key) === normalized) {
            model = value
            break
          }
        }
      }

      if (model?.cost) {
        const pricing = {
          input: model.cost.input,
          output: model.cost.output,
          cacheWrite: model.cost.cache_write,
          cacheRead: model.cost.cache_read,
        }

        // If we find non-zero pricing, return it immediately
        if (pricing.input > 0 || pricing.output > 0) {
          return pricing
        }

        // Store zero-cost pricing as fallback
        if (!zeroCostPricing) {
          zeroCostPricing = pricing
        }
      }
    }

    // Return zero-cost pricing if that's all we found
    return zeroCostPricing
  }

  /**
   * Calculate cost for token usage
   */
  export function calculateCost(modelId: string, usage: TokenUsage): CostBreakdown | undefined {
    const pricing = getModelPricing(modelId)
    if (!pricing) {
      return undefined
    }

    const { input = 0, output = 0, cacheCreation = 0, cacheRead = 0 } = usage

    const inputRate = pricing.input
    const outputRate = pricing.output
    const cacheWriteRate = pricing.cacheWrite ?? 0
    const cacheReadRate = pricing.cacheRead ?? 0

    // Calculate costs (prices are per million tokens)
    const inputCost = (input * inputRate) / 1_000_000
    const outputCost = (output * outputRate) / 1_000_000
    const cacheCreationCost = (cacheCreation * cacheWriteRate) / 1_000_000
    const cacheReadCost = (cacheRead * cacheReadRate) / 1_000_000

    const totalCost = inputCost + outputCost + cacheCreationCost + cacheReadCost

    return {
      inputCost,
      outputCost,
      cacheCreationCost,
      cacheReadCost,
      totalCost,
    }
  }

  /**
   * Calculate cost for token usage (async - fetches pricing if needed)
   */
  export async function calculateCostAsync(modelId: string, usage: TokenUsage): Promise<CostBreakdown | undefined> {
    const pricing = await getModelPricingAsync(modelId)
    if (!pricing) {
      return undefined
    }

    const { input = 0, output = 0, cacheCreation = 0, cacheRead = 0 } = usage

    const inputRate = pricing.input
    const outputRate = pricing.output
    const cacheWriteRate = pricing.cacheWrite ?? 0
    const cacheReadRate = pricing.cacheRead ?? 0

    // Calculate costs (prices are per million tokens)
    const inputCost = (input * inputRate) / 1_000_000
    const outputCost = (output * outputRate) / 1_000_000
    const cacheCreationCost = (cacheCreation * cacheWriteRate) / 1_000_000
    const cacheReadCost = (cacheRead * cacheReadRate) / 1_000_000

    const totalCost = inputCost + outputCost + cacheCreationCost + cacheReadCost

    return {
      inputCost,
      outputCost,
      cacheCreationCost,
      cacheReadCost,
      totalCost,
    }
  }

  /**
   * Format cost as currency string
   */
  export function formatCost(cost: number): string {
    if (cost === 0) return "$0.00"
    if (cost < 0.0001) return `$${cost.toExponential(2)}`
    if (cost < 0.01) return `$${cost.toFixed(4)}`
    if (cost < 1) return `$${cost.toFixed(3)}`
    return `$${cost.toFixed(2)}`
  }

  /**
   * Get all available models
   */
  export function listModels(): string[] {
    if (!modelsDevCache) return []
    const models: string[] = []
    for (const provider of Object.values(modelsDevCache.data)) {
      models.push(...Object.keys(provider.models))
    }
    return models
  }
}

// Initialize pricing data on module load
initModelsDevPricing().catch(() => {
  // Silently fail - sync methods will return undefined
})
