/**
 * Next.js middleware entry point.
 * Delegates to proxy.ts for session refresh, route protection, and security.
 */

export { proxy as middleware, config } from './proxy'
