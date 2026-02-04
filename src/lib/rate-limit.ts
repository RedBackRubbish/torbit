// ============================================================================
// RATE LIMITER - In-Memory Token Bucket with IP-based limiting
// ============================================================================
// Simple rate limiting for API routes. Uses token bucket algorithm.
// For production, consider using Redis with upstash/ratelimit or similar.
// ============================================================================

interface RateLimitEntry {
  tokens: number
  lastRefill: number
}

interface RateLimiterConfig {
  /** Maximum tokens (requests) in the bucket */
  maxTokens: number
  /** Tokens to refill per interval */
  refillRate: number
  /** Refill interval in milliseconds */
  refillInterval: number
  /** Identifier for the rate limiter (for logging) */
  name?: string
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetIn: number // milliseconds until bucket is full
  limit: number
}

class RateLimiter {
  private buckets: Map<string, RateLimitEntry> = new Map()
  private config: RateLimiterConfig
  
  // Cleanup interval to prevent memory leaks
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(config: RateLimiterConfig) {
    this.config = config
    
    // Start cleanup every 5 minutes to remove stale entries
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
    }
  }

  /**
   * Check rate limit for a given identifier (usually IP address)
   * @param identifier - Unique identifier for the client (IP, user ID, etc.)
   * @returns RateLimitResult with success status and metadata
   */
  check(identifier: string): RateLimitResult {
    const now = Date.now()
    let entry = this.buckets.get(identifier)

    if (!entry) {
      // First request from this identifier
      entry = {
        tokens: this.config.maxTokens - 1, // -1 for current request
        lastRefill: now,
      }
      this.buckets.set(identifier, entry)
      return {
        success: true,
        remaining: entry.tokens,
        resetIn: this.config.refillInterval,
        limit: this.config.maxTokens,
      }
    }

    // Refill tokens based on time elapsed
    const timeSinceRefill = now - entry.lastRefill
    const tokensToAdd = Math.floor(timeSinceRefill / this.config.refillInterval) * this.config.refillRate
    
    if (tokensToAdd > 0) {
      entry.tokens = Math.min(this.config.maxTokens, entry.tokens + tokensToAdd)
      entry.lastRefill = now
    }

    // Check if we have tokens available
    if (entry.tokens > 0) {
      entry.tokens -= 1
      this.buckets.set(identifier, entry)
      return {
        success: true,
        remaining: entry.tokens,
        resetIn: this.config.refillInterval - (now - entry.lastRefill),
        limit: this.config.maxTokens,
      }
    }

    // Rate limited
    return {
      success: false,
      remaining: 0,
      resetIn: this.config.refillInterval - (now - entry.lastRefill),
      limit: this.config.maxTokens,
    }
  }

  /**
   * Remove stale entries older than 10 minutes
   */
  private cleanup() {
    const now = Date.now()
    const staleThreshold = 10 * 60 * 1000 // 10 minutes

    for (const [key, entry] of this.buckets.entries()) {
      if (now - entry.lastRefill > staleThreshold) {
        this.buckets.delete(key)
      }
    }
  }

  /**
   * Destroy the rate limiter (cleanup interval)
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// ============================================================================
// Pre-configured Rate Limiters
// ============================================================================

/**
 * Chat API rate limiter
 * 20 requests per minute per IP
 */
export const chatRateLimiter = new RateLimiter({
  name: 'chat',
  maxTokens: 20,       // 20 requests max
  refillRate: 1,       // 1 token per interval
  refillInterval: 3000, // 3 seconds (20 req/min)
})

/**
 * Strict rate limiter for expensive operations
 * 5 requests per minute per IP
 */
export const strictRateLimiter = new RateLimiter({
  name: 'strict',
  maxTokens: 5,
  refillRate: 1,
  refillInterval: 12000, // 12 seconds (5 req/min)
})

/**
 * Helper to get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check common headers for proxied requests
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Get the first IP in the list (client IP)
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback - this won't work behind proxies
  return 'unknown'
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please slow down.',
      retryAfter: Math.ceil(result.resetIn / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetIn / 1000).toString(),
        'Retry-After': Math.ceil(result.resetIn / 1000).toString(),
      },
    }
  )
}
