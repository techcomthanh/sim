import Redis from 'ioredis'
import { logger } from '@/lib/logger'

interface RateLimitConfig {
  requests: number
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

const DEFAULT_LIMIT: RateLimitConfig = {
  requests: 100,
  windowMs: 60000, // 1 minute
}

let redisClient: Redis | null = null

function getRedis(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set')
    }
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000)
      },
    })
  }
  return redisClient
}

/**
 * Check rate limit for a user
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig = DEFAULT_LIMIT
): Promise<RateLimitResult> {
  try {
    const redis = getRedis()
    const key = `ratelimit:${userId}`
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Use Redis sorted set for sliding window
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart)
    pipeline.zcard(key)
    pipeline.zadd(key, now, `${now}:${Math.random()}`)
    pipeline.pexpire(key, config.windowMs)
    const results = await pipeline.exec()

    if (!results) {
      throw new Error('Redis pipeline failed')
    }

    const count = results[1]?.[1] as number
    const remaining = Math.max(0, config.requests - count - 1)
    const resetAt = new Date(now + config.windowMs)

    return {
      allowed: count < config.requests,
      remaining,
      resetAt,
    }
  } catch (error) {
    logger.error('Rate limit check error:', error)
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      remaining: DEFAULT_LIMIT.requests,
      resetAt: new Date(Date.now() + DEFAULT_LIMIT.windowMs),
    }
  }
}

/**
 * Check rate limit by IP address
 */
export async function checkIpRateLimit(
  ip: string,
  config: RateLimitConfig = DEFAULT_LIMIT
): Promise<RateLimitResult> {
  try {
    const redis = getRedis()
    const key = `ratelimit:ip:${ip}`
    const now = Date.now()
    const windowStart = now - config.windowMs

    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart)
    pipeline.zcard(key)
    pipeline.zadd(key, now, `${now}:${Math.random()}`)
    pipeline.pexpire(key, config.windowMs)
    const results = await pipeline.exec()

    if (!results) {
      throw new Error('Redis pipeline failed')
    }

    const count = results[1]?.[1] as number
    const remaining = Math.max(0, config.requests - count - 1)
    const resetAt = new Date(now + config.windowMs)

    return {
      allowed: count < config.requests,
      remaining,
      resetAt,
    }
  } catch (error) {
    logger.error('IP rate limit check error:', error)
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      remaining: DEFAULT_LIMIT.requests,
      resetAt: new Date(Date.now() + DEFAULT_LIMIT.windowMs),
    }
  }
}

/**
 * Get client IP from request
 */
export function getClientIp(request: Request): string {
  // Check various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  if (realIp) {
    return realIp
  }
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  return 'unknown'
}
