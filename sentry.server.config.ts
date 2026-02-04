import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Server Configuration
 * 
 * This file configures the initialization of the Sentry SDK on the server.
 * The config will be used whenever the server handles a request.
 */

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,

  // Set to 1.0 in development, reduce in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable debug in development
  debug: process.env.NODE_ENV === 'development',

  // Environment tag
  environment: process.env.NODE_ENV,

  // Filter out known non-errors
  beforeSend(event, hint) {
    const error = hint.originalException

    // Ignore expected API errors
    if (error instanceof Error) {
      // Ignore rate limiting (expected behavior)
      if (error.message?.includes('Rate limit')) {
        return null
      }
    }

    return event
  },
})
