import type { ToolCall, ToolResult } from './types'
import type { StreamEvent } from '@/lib/streaming/types'
import type { ToolRouter } from './router'
import { createToolCallEvent, createToolResultEvent } from '@/lib/streaming/sse'
import { logger } from '@/lib/logger'

/**
 * Execute tool calls and yield stream events
 */
export async function* executeToolCalls(
  toolCalls: ToolCall[],
  router: ToolRouter
): AsyncGenerator<StreamEvent, void, unknown> {
  for (const call of toolCalls) {
    // Emit tool_call event
    yield createToolCallEvent(
      call.id,
      call.name,
      JSON.stringify(call.arguments)
    )

    // Execute tool
    const result = await router.execute(call)

    // Emit tool_result event
    yield createToolResultEvent(call.id, result)
  }
}
