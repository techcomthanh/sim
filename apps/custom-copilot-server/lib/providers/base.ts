import type { AIProvider, ProviderConfig, StreamChunk } from './types'
import { logger } from '@/lib/logger'

export abstract class BaseProvider implements AIProvider {
  abstract name: string
  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  abstract chat(params: {
    messages: { role: string; content: string }[]
    model: string
    tools?: unknown[]
    stream?: boolean
  }): AsyncIterable<StreamChunk>

  validateConfig(): boolean {
    return !!(this.config.apiKey || this.config.baseURL)
  }

  protected async *retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): AsyncGenerator<T, void, unknown> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        yield await fn()
        return
      } catch (error) {
        if (attempt === maxRetries - 1) throw error
        const delay = Math.pow(2, attempt) * 1000
        logger.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
}
