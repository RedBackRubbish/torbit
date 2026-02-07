'use client'

import { useEffect } from 'react'

/**
 * Builder-specific Error Boundary
 * Handles errors within the /builder route segment
 */
export default function BuilderError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[BuilderError]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">🚀💥</div>
        <h1 className="text-2xl font-bold text-white mb-4">
          Builder crashed
        </h1>
        <p className="text-neutral-400 mb-2">
          {error.message || "Something went wrong in the builder."}
        </p>
        <p className="text-neutral-500 text-sm mb-6">
          Your work may be recoverable. Try resetting or go back home.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-matrix-600 hover:bg-matrix-700 text-white rounded-lg transition-colors"
          >
            Reset Builder
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
