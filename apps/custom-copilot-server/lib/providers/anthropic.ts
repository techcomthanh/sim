import Anthropic from '@anthropic-ai/sdk'
import { BaseProvider } from './base'
import type { StreamChunk } from './types'
import { logger } from '@/lib/logger'

export class AnthropicProvider extends BaseProvider {
  name = 'anthropic'
  private client: Anthropic

  constructor(config: { apiKey: string }) {
    super(config)
    this.client = new Anthropic({ apiKey: config.apiKey })
  }

  validateConfig(): boolean {
    return !!this.config.apiKey
  }

  async *chat(params: {
    messages: { role: string; content: string }[]
    model: string
    tools?: unknown[]
    stream?: boolean
  }): AsyncIterable<StreamChunk> {
    if (!this.validateConfig()) {
      throw new Error('Invalid Anthropic config: API key required')
    }

    logger.info(`Anthropic request: model=${params.model}`)

    const stream = await this.client.messages.create({
      model: params.model,
      messages: params.messages as Anthropic.MessageParam[],
      tools: params.tools as Anthropic.Tool[],
      stream: true,
      max_tokens: 4096,
    })

    for await (const event of stream) {
      switch (event.type) {
        case 'content_block_delta':
          if (event.delta.type === 'text_delta') {
            yield { type: 'content', content: event.delta.text }
          }
          break
        case 'content_block_stop':
          break
        case 'message_stop':
          return
      }
    }
  }
}
