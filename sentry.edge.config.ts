import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Edge Configuration
 * 
 * This file configures the initialization of the Sentry SDK for Edge runtime.
 * Used for middleware and Edge API routes.
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
})
