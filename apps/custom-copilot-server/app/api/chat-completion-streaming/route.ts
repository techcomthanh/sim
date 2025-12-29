import { NextRequest } from 'next/server'
import { ChatRequestSchema } from '@/lib/schemas/request'
import { createProvider } from '@/lib/providers/factory'
import { createToolRouter } from '@/lib/tools/router'
import { executeToolCalls } from '@/lib/tools/executor'
import { loadWorkflowContext, buildSystemPrompt } from '@/lib/context/workflow-loader'
import { loadChatHistory, formatChatHistory, storeMessage } from '@/lib/context/chat-history'
import { validateCopilotApiKey, validateUserApiKey } from '@/lib/auth/api-key-validation'
import { checkRateLimit, checkIpRateLimit, getClientIp } from '@/lib/auth/rate-limiter'
import {
  createSSEEvent,
  createContentEvent,
  createDoneEvent,
  createToolCallEvent,
  createErrorEvent,
} from '@/lib/streaming/sse'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  try {
    // Validate copilot API key
    const requestApiKey = request.headers.get('x-api-key') || undefined
    if (!validateCopilotApiKey(requestApiKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      })
    }

    const body = await request.json()
    const validated = ChatRequestSchema.parse(body)

    logger.info('Chat request:', {
      userId: validated.userId,
      workflowId: validated.workflowId,
      mode: validated.mode,
      model: validated.model,
    })

    // Rate limiting by user
    const userRateLimit = await checkRateLimit(validated.userId, {
      requests: 100,
      windowMs: 60000,
    })

    if (!userRateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          resetAt: userRateLimit.resetAt,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': userRateLimit.remaining.toString(),
            'X-RateLimit-Reset': userRateLimit.resetAt.toISOString(),
            ...CORS_HEADERS,
          },
        }
      )
    }

    // IP-based rate limiting (additional layer)
    const clientIp = getClientIp(request)
    const ipRateLimit = await checkIpRateLimit(clientIp, {
      requests: 200,
      windowMs: 60000,
    })

    if (!ipRateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'IP rate limit exceeded',
          resetAt: ipRateLimit.resetAt,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': ipRateLimit.remaining.toString(),
            'X-RateLimit-Reset': ipRateLimit.resetAt.toISOString(),
            ...CORS_HEADERS,
          },
        }
      )
    }

    // Get provider name from model
    const providerName = getProviderFromModel(validated.model)

    // Create AI provider with user's API key if available
    let providerApiKey: string | undefined
    if (providerName) {
      const keyValidation = await validateUserApiKey(validated.userId, providerName)
      if (keyValidation.valid && keyValidation.decryptedKey) {
        providerApiKey = keyValidation.decryptedKey
        logger.info(`Using user's API key for provider: ${providerName}`)
      }
    }

    const provider = createProvider(validated.model, providerApiKey)

    // Create tool router
    const simUrl = process.env.SIM_APP_URL || 'http://localhost:3000'
    const apiKey = process.env.COPILOT_API_KEY
    const toolRouter = createToolRouter(simUrl, apiKey)

    // Load workflow context
    const workflow = await loadWorkflowContext(
      validated.workflowId,
      simUrl,
      apiKey
    )

    // Load chat history
    const history = await loadChatHistory(
      validated.userId,
      validated.workflowId,
      20
    )

    // Build messages array with context
    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = []

    // Add system prompt from workflow
    if (workflow) {
      messages.push({
        role: 'system',
        content: buildSystemPrompt(workflow),
      })
    }

    // Add chat history
    messages.push(...formatChatHistory(history))

    // Add current user message
    messages.push({ role: 'user', content: validated.message })

    // Create encoder for streaming
    const encoder = new TextEncoder()

    // Track response for storage
    let assistantResponse = ''

    // Create readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let pendingToolCalls: any[] = []

          // Stream from AI provider
          for await (const chunk of provider.chat({
            messages,
            model: validated.model,
            tools: validated.tools,
            stream: true,
          })) {
            if (chunk.type === 'content' && chunk.content) {
              assistantResponse += chunk.content
              controller.enqueue(
                encoder.encode(createSSEEvent(createContentEvent(chunk.content)))
              )
            }
            if (chunk.type === 'tool_call' && chunk.toolCall) {
              const toolCall = {
                id: chunk.toolCall.id || `tc-${Date.now()}`,
                name: chunk.toolCall.name || '',
                arguments: chunk.toolCall.arguments || {},
              }
              pendingToolCalls.push(toolCall)
            }
          }

          // Execute tools after AI finishes (only in agent mode)
          if (pendingToolCalls.length > 0 && validated.mode === 'agent') {
            for await (const event of executeToolCalls(pendingToolCalls, toolRouter)) {
              controller.enqueue(encoder.encode(createSSEEvent(event)))
            }

            // Continue conversation with tool results would go here
            // TODO: Implement multi-turn conversation with tool results
          }

          controller.enqueue(encoder.encode(createSSEEvent(createDoneEvent(`resp-${Date.now()}`))))
          controller.close()

          // Store messages after streaming completes
          try {
            await storeMessage({
              userId: validated.userId,
              workflowId: validated.workflowId,
              role: 'user',
              content: validated.message,
            })
            await storeMessage({
              userId: validated.userId,
              workflowId: validated.workflowId,
              role: 'assistant',
              content: assistantResponse,
            })
          } catch (storeError) {
            logger.error('Error storing messages:', storeError)
          }
        } catch (error) {
          logger.error('Stream error:', error)
          controller.enqueue(
            encoder.encode(
              createSSEEvent(
                createErrorEvent(
                  error instanceof Error ? error.message : 'Unknown error'
                )
              )
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-RateLimit-Remaining': userRateLimit.remaining.toString(),
        'X-RateLimit-Reset': userRateLimit.resetAt.toISOString(),
        ...CORS_HEADERS,
      },
    })
  } catch (error) {
    logger.error('Request error:', error)
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    })
  }
}

/**
 * Extract provider name from model identifier
 */
function getProviderFromModel(model: string): string | undefined {
  if (model.startsWith('claude-')) return 'anthropic'
  if (model.startsWith('gpt-')) return 'openai'
  if (model.startsWith('ollama:')) return 'ollama'
  return undefined
}
