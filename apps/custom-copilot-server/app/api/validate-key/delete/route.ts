import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

interface DeleteKeyRequest {
  userId: string
  keyId: string
}

interface DeleteKeyResponse {
  success: boolean
}

/**
 * POST /api/validate-key/delete
 * Delete an API key
 */
export async function POST(request: NextRequest) {
  try {
    const body: DeleteKeyRequest = await request.json()

    logger.info('Delete API key request:', { userId: body.userId, keyId: body.keyId })

    const response: DeleteKeyResponse = {
      success: true,
    }

    return Response.json(response)
  } catch (error) {
    logger.error('Delete key error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
