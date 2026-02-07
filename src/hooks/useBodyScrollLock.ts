'use client'

import { useEffect } from 'react'

/**
 * Prevent background page scroll while overlays/dialogs are open.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [active])
}
