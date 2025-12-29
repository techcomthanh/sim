import { BaseProvider } from './base'
import type { StreamChunk } from './types'
import { logger } from '@/lib/logger'

export class OllamaProvider extends BaseProvider {
  name = 'ollama'
  private baseURL: string

  constructor(config: { baseURL: string }) {
    super(config)
    this.baseURL = config.baseURL || 'http://localhost:11434'
  }

  validateConfig(): boolean {
    return true // Ollama doesn't require API key
  }

  async *chat(params: {
    messages: { role: string; content: string }[]
    model: string
    tools?: unknown[]
    stream?: boolean
  }): AsyncIterable<StreamChunk> {
    logger.info(`Ollama request: model=${params.model}, url=${this.baseURL}`)

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: true,
        tools: params.tools,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      for (const line of chunk.split('\n').filter(Boolean)) {
        try {
          const data = JSON.parse(line)
          if (data.message?.content) {
            yield { type: 'content', content: data.message.content }
          }
          if (data.done) return
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  }
}
