import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'
import { OllamaProvider } from './ollama'
import type { AIProvider } from './types'
import { logger } from '@/lib/logger'

/**
 * Provider selection based on model name prefix:
 * - claude-* or anthropic:* → Anthropic
 * - gpt-* or openai:* → OpenAI
 * - ollama:* → Ollama
 * - * (fallback) → DEFAULT_PROVIDER env var
 *
 * @param model - Model identifier
 * @param userApiKey - Optional user's API key (overrides env vars)
 */
export function createProvider(model: string, userApiKey?: string): AIProvider {
  // Model name determines provider
  if (model.startsWith('claude-') || model.startsWith('anthropic:')) {
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set for claude models')
    }
    logger.info(`Using Anthropic provider for model: ${model}`)
    return new AnthropicProvider({ apiKey })
  }

  if (model.startsWith('gpt-') || model.startsWith('openai:')) {
    const apiKey = userApiKey || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not set for gpt models')
    }
    logger.info(`Using OpenAI provider for model: ${model}`)
    return new OpenAIProvider({ apiKey })
  }

  if (model.startsWith('ollama:')) {
    const baseURL = process.env.OLLAMA_URL || 'http://localhost:11434'
    logger.info(`Using Ollama provider for model: ${model}`)
    return new OllamaProvider({ baseURL })
  }

  // Use default provider from env
  const defaultProvider = process.env.DEFAULT_PROVIDER || 'anthropic'
  const defaultModel = process.env.DEFAULT_MODEL || 'claude-3-5-sonnet-20241022'

  logger.info(`Using default provider '${defaultProvider}' for model: ${model}`)

  if (defaultProvider === 'anthropic') {
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set for default provider')
    }
    return new AnthropicProvider({ apiKey })
  }

  if (defaultProvider === 'openai') {
    const apiKey = userApiKey || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not set for default provider')
    }
    return new OpenAIProvider({ apiKey })
  }

  if (defaultProvider === 'ollama') {
    const baseURL = process.env.OLLAMA_URL || 'http://localhost:11434'
    return new OllamaProvider({ baseURL })
  }

  throw new Error(`Unknown default provider: ${defaultProvider}`)
}

/**
 * Check if a provider is available (has API key configured)
 */
export function isProviderAvailable(provider: 'anthropic' | 'openai' | 'ollama'): boolean {
  if (provider === 'ollama') {
    return true // Ollama doesn't require API key
  }
  if (provider === 'anthropic') {
    return !!process.env.ANTHROPIC_API_KEY
  }
  if (provider === 'openai') {
    return !!process.env.OPENAI_API_KEY
  }
  return false
}
