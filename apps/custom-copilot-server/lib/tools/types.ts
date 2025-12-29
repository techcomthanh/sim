export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  type: 'client' | 'server'
  handler?: (params: unknown) => Promise<unknown>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  result: unknown
  error?: string
}

export interface ToolRegistry {
  register(tool: ToolDefinition): void
  get(name: string): ToolDefinition | undefined
  list(): ToolDefinition[]
  execute(call: ToolCall): Promise<ToolResult>
}
