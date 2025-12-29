import type { StreamEvent } from './types'

export function createSSEEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function* streamToSSE(
  stream: AsyncIterable<StreamEvent>
): AsyncGenerator<string, void, unknown> {
  for await (const event of stream) {
    yield createSSEEvent(event)
  }
}

export function createDoneEvent(responseId: string): StreamEvent {
  return { type: 'done', data: { responseId } }
}

export function createContentEvent(content: string): StreamEvent {
  return { type: 'content', data: content }
}

export function createToolCallEvent(
  id: string,
  name: string,
  args: string
): StreamEvent {
  return {
    type: 'tool_call',
    data: { id, name, arguments: args },
  }
}

export function createToolResultEvent(
  toolCallId: string,
  result: unknown
): StreamEvent {
  return {
    type: 'tool_result',
    data: { toolCallId, result },
  }
}

export function createErrorEvent(message: string, code?: string): StreamEvent {
  return {
    type: 'error',
    data: { message, code },
  }
}
