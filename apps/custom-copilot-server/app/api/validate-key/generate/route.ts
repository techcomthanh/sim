import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

interface GenerateKeyRequest {
  name?: string
}

interface GenerateKeyResponse {
  apiKey: string
  name: string
  createdAt: string
}

/**
 * POST /api/validate-key/generate
 * Generate a new API key for user
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateKeyRequest = await request.json()

    // Generate a random API key
    const apiKey = `sk-copilot-${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`

    const response: GenerateKeyResponse = {
      apiKey,
      name: body.name || 'API Key',
      createdAt: new Date().toISOString(),
    }

    logger.info('Generated API key:', { name: response.name })

    return Response.json(response)
  } catch (error) {
    logger.error('Generate key error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
