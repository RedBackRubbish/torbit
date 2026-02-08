'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { INTEGRATION_CAPABILITIES, type IntegrationCapability } from '@/lib/integrations/capabilities'

interface CapabilitySelection {
  selectedCapabilities: string[]
  showMoreCapabilities: boolean
  setShowMoreCapabilities: (show: boolean) => void
  toggleCapability: (id: string) => void
  getCapabilityById: (id: string) => IntegrationCapability | undefined
  moreRef: RefObject<HTMLDivElement | null>
}

/**
 * Keeps capability chip state isolated from page layout concerns.
 */
export function useCapabilitySelection(initial: string[] = []): CapabilitySelection {
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(initial)
  const [showMoreCapabilities, setShowMoreCapabilities] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const capabilityMap = useMemo(() => {
    return new Map(INTEGRATION_CAPABILITIES.map((cap) => [cap.id, cap]))
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setShowMoreCapabilities(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleCapability = (id: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(id) ? prev.filter((capabilityId) => capabilityId !== id) : [...prev, id]
    )
  }

  return {
    selectedCapabilities,
    showMoreCapabilities,
    setShowMoreCapabilities,
    toggleCapability,
    getCapabilityById: (id: string) => capabilityMap.get(id),
    moreRef,
  }
}
