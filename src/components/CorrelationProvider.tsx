"use client"
import React, { createContext, useContext, useMemo, useEffect } from 'react'
import { setClientCorrelationId } from '@/lib/observability/clientCorrelation'

const CorrelationContext = createContext<string | null>(null)

export function CorrelationProvider({ children, correlationId }: { children: React.ReactNode, correlationId?: string }) {
  const cid = useMemo(() => correlationId || `cid-${Math.random().toString(16).slice(2)}`, [correlationId])
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
    // fallback to generated id
    return `cid-${Math.random().toString(16).slice(2)}`
  }
  return v
}

export default CorrelationProvider
