"use client"
import React, { createContext, useContext, useMemo, useEffect, useId } from 'react'
import { setClientCorrelationId } from '@/lib/observability/clientCorrelation'

const CorrelationContext = createContext<string | null>(null)

export function CorrelationProvider({ children, correlationId }: { children: React.ReactNode, correlationId?: string }) {
  const generatedId = useId().replace(/:/g, '')
  const cid = useMemo(() => correlationId || `cid-${generatedId}`, [correlationId, generatedId])
  useEffect(() => {
    setClientCorrelationId(cid)
    return () => setClientCorrelationId('')
  }, [cid])

  return (
    <CorrelationContext.Provider value={cid}>
      {children}
    </CorrelationContext.Provider>
  )
}

export function useCorrelationId() {
  const v = useContext(CorrelationContext)
  if (!v) {
    return 'cid-unavailable'
  }
  return v
}

export default CorrelationProvider
