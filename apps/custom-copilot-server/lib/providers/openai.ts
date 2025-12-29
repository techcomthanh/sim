import OpenAI from 'openai'
import { BaseProvider } from './base'
import type { StreamChunk } from './types'
import { logger } from '@/lib/logger'

export class OpenAIProvider extends BaseProvider {
  name = 'openai'
  private client: OpenAI

  constructor(config: { apiKey: string; baseURL?: string }) {
    super(config)
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })
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
      throw new Error('Invalid OpenAI config: API key required')
    }

    logger.info(`OpenAI request: model=${params.model}`)

    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages as OpenAI.ChatCompletionMessageParam[],
      tools: params.tools as OpenAI.ChatCompletionTool[],
      stream: true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta
      if (delta?.content) {
        yield { type: 'content', content: delta.content }
      }
      // Handle tool calls if present
      if (delta?.tool_calls) {
        for (const tool of delta.tool_calls) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: tool.id,
              name: tool.function?.name,
              arguments: tool.function?.arguments
                ? JSON.parse(tool.function.arguments)
                : undefined,
            },
          }
        }
      }
    }
  }
}
