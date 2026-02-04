'use client'

import { useEffect } from 'react'
import { PageErrorFallback } from '@/components/ErrorBoundary'

/**
 * Global Error Boundary for the App Router
 * Catches errors in route segments
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[GlobalError]', error)
  }, [error])

  return <PageErrorFallback error={error} reset={reset} />
}
