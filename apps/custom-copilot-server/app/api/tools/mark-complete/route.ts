import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

interface MarkCompleteRequest {
  toolCallId: string
  result?: unknown
  error?: string
}

interface MarkCompleteResponse {
  success: boolean
}

/**
 * POST /api/tools/mark-complete
 * Mark a tool execution as complete
 */
export async function POST(request: NextRequest) {
  try {
    const body: MarkCompleteRequest = await request.json()

    logger.info('Mark tool complete:', {
      toolCallId: body.toolCallId,
      hasResult: body.result !== undefined,
      error: body.error,
    })

    // In full implementation, would update tool execution status in database

    const response: MarkCompleteResponse = {
      success: true,
    }

    return Response.json(response)
  } catch (error) {
    logger.error('Mark complete error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
