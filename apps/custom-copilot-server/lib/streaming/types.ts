export type StreamEventType = 'content' | 'tool_call' | 'tool_result' | 'done' | 'error'

export interface StreamEvent {
  type: StreamEventType
  data: unknown
}

export interface ContentEvent {
  type: 'content'
  data: string
}

export interface ToolCallEvent {
  type: 'tool_call'
  data: {
    id: string
    name: string
    arguments: string
  }
}

export interface ToolResultEvent {
  type: 'tool_result'
  data: {
    toolCallId: string
    result: unknown
  }
}

export interface DoneEvent {
  type: 'done'
  data: {
    responseId: string
  }
}

export interface ErrorEvent {
  type: 'error'
  data: {
    message: string
    code?: string
  }
}
