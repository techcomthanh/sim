import type { ToolDefinition, ToolCall, ToolResult, ToolRegistry } from './types'
import { SimToolClient } from './sim-client'
import { logger } from '@/lib/logger'

/**
 * Tool router that dispatches to client (SIM) or server (local) tools
 */
export class ToolRouter implements ToolRegistry {
  private tools = new Map<string, ToolDefinition>()
  private simClient: SimToolClient

  constructor(simUrl: string, apiKey?: string) {
    this.simClient = new SimToolClient({ simUrl, apiKey })
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool)
    logger.info(`Registered tool: ${tool.name} (${tool.type})`)
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  async execute(call: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(call.name)

    if (!tool) {
      return {
        toolCallId: call.id,
        result: null,
        error: `Tool not found: ${call.name}`,
      }
    }

    try {
      let result: unknown

      if (tool.type === 'client') {
        // Delegate to SIM app
        logger.info(`Executing client tool: ${call.name}`)
        result = await this.simClient.executeTool(call.name, call.arguments)
      } else if (tool.type === 'server' && tool.handler) {
        // Execute locally
        logger.info(`Executing server tool: ${call.name}`)
        result = await tool.handler(call.arguments)
      } else {
        throw new Error(`Invalid tool configuration: ${tool.name}`)
      }

      return { toolCallId: call.id, result }
    } catch (error) {
      logger.error(`Tool execution error: ${call.name}`, error)
      return {
        toolCallId: call.id,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * Create tool router with SIM app connection
 */
export function createToolRouter(simUrl: string, apiKey?: string): ToolRouter {
  const router = new ToolRouter(simUrl, apiKey)
  registerServerTools(router)
  return router
}

/**
 * Register server-side tools
 */
function registerServerTools(router: ToolRouter): void {
  // TODO: Add server tools in subsequent phases
  // For now, we'll register basic tools

  router.register({
    name: 'echo',
    description: 'Echo back the input text (for testing)',
    type: 'server',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
      },
      required: ['text'],
    },
    handler: async (params) => ({ echo: (params as { text: string }).text }),
  })

  router.register({
    name: 'get_current_time',
    description: 'Get the current server time',
    type: 'server',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => ({ time: new Date().toISOString() }),
  })
}
