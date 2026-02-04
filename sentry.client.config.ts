import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Client Configuration
 * 
 * This file configures the initialization of the Sentry SDK on the browser.
 * The config will be used whenever a page is visited.
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,

  // Set to 1.0 in development, reduce in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture replay for 10% of all sessions
  replaysSessionSampleRate: 0.1,
  
  // Capture replay on errors
  replaysOnErrorSampleRate: 1.0,

  // Enable debug in development
  debug: process.env.NODE_ENV === 'development',

  // Environment tag
  environment: process.env.NODE_ENV,

  // Filter out known non-errors
  beforeSend(event, hint) {
    const error = hint.originalException

    // Ignore user-cancelled requests
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return null
      }
      // Ignore WebContainer-specific errors that are expected
      if (error.message?.includes('WebContainer')) {
        return null
      }
    }

    return event
  },

  // Additional integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text and inputs for privacy
      maskAllText: true,
      maskAllInputs: true,
    }),
  ],
})
