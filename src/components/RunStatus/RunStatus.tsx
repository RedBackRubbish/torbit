"use client"
import React from 'react'
import { useCorrelationId } from '../CorrelationProvider'

export default function RunStatus({ runId, cost, retries, uncertainty }: { runId?: string, cost?: number, retries?: number, uncertainty?: number }) {
  const cid = useCorrelationId()
  return (
    <div data-testid="run-status" style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
      <div><strong>Run ID:</strong> {runId || cid}</div>
      <div><strong>Cost so far:</strong> ${cost?.toFixed(2) ?? '0.00'}</div>
      <div><strong>Retries:</strong> {retries ?? 0}</div>
      <div>
        <strong>Uncertainty:</strong>
        <span aria-label="uncertainty"> {uncertainty ? `${Math.round(uncertainty*100)}%` : 'unknown'}</span>
      </div>
    </div>
  )
}
