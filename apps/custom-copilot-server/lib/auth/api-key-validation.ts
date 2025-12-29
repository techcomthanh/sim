import { db } from '@/lib/db'
import { userApiKeys } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { decryptFromStorage } from '@/lib/crypto/encryption'
import { logger } from '@/lib/logger'

export interface ApiKeyValidation {
  valid: boolean
  userId?: string
  provider?: string
  decryptedKey?: string
  error?: string
}

/**
 * Validate and load user's API key for a provider
 */
export async function validateUserApiKey(
  userId: string,
  provider: string
): Promise<KeyValidation> {
  try {
    const result = await db
      .select()
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, userId))
      .limit(10)

    const keyRecord = result.find((k) => k.provider === provider)

    if (!keyRecord) {
      return {
        valid: false,
        error: `No API key found for provider: ${provider}`,
      }
    }

    const decryptedKey = decryptFromStorage(keyRecord.apiKeyEncrypted)

    return {
      valid: true,
      userId: keyRecord.userId,
      provider: keyRecord.provider,
      decryptedKey,
    }
  } catch (error) {
    logger.error('Error validating user API key:', error)
    return {
      valid: false,
      error: 'Failed to validate API key',
    }
  }
}

/**
 * Verify copilot API key (for requests from SIM app)
 */
export function validateCopilotApiKey(requestApiKey?: string): boolean {
  const validApiKey = process.env.COPILOT_API_KEY

  // If no server-side key is configured, skip validation
  if (!validApiKey) {
    logger.warn('COPILOT_API_KEY not configured - skipping validation')
    return true
  }

  // If request has no key but server requires one
  if (!requestApiKey) {
    return false
  }

  return requestApiKey === validApiKey
}

type KeyValidation = ApiKeyValidation
