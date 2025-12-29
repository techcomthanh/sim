export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface StreamChunk {
  type: 'content' | 'tool_call'
  content?: string
  toolCall?: Partial<ToolCall>
}

export interface ProviderConfig {
  apiKey?: string
  baseURL?: string
  timeout?: number
  maxRetries?: number
}

export interface AIProvider {
  name: string
  chat(params: {
    messages: Message[]
    model: string
    tools?: unknown[]
    stream?: boolean
  }): AsyncIterable<StreamChunk>
  validateConfig(): boolean
}
