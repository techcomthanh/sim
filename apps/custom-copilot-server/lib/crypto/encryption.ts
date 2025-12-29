import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 64

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  if (key.length < KEY_LENGTH) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  }
  return Buffer.from(key.slice(0, KEY_LENGTH), 'utf-8')
}

export interface EncryptedData {
  encrypted: string // hex
  iv: string // hex
  authTag: string // hex
  salt: string // hex
}

/**
 * Encrypt data using AES-256-GCM
 * Each encryption uses a random IV and salt for uniqueness
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const salt = crypto.randomBytes(SALT_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf-8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    salt: salt.toString('hex'),
  }
}

/**
 * Decrypt AES-256-GCM encrypted data
 */
export function decrypt(data: EncryptedData): string {
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(data.iv, 'hex')
  )

  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'))

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')

  return decrypted
}

/**
 * Format encrypted data for database storage
 * Stores as: iv:authTag:salt:encrypted
 */
export function encryptForStorage(plaintext: string): string {
  const data = encrypt(plaintext)
  return `${data.iv}:${data.authTag}:${data.salt}:${data.encrypted}`
}

/**
 * Parse and decrypt data from database storage
 */
export function decryptFromStorage(stored: string): string {
  const [iv, authTag, salt, encrypted] = stored.split(':')
  return decrypt({ encrypted, iv, authTag, salt })
}

/**
 * Generate a random encryption key for .env
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex')
}
