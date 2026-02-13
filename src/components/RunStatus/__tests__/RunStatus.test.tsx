import React from 'react'
import { render, screen } from '@testing-library/react'
import RunStatus from '../RunStatus'
import { CorrelationProvider } from '../../CorrelationProvider'

describe('RunStatus', () => {
  it('renders provided run info and fallback correlation id', () => {
    render(
      <CorrelationProvider correlationId="test-cid-123">
        <RunStatus runId="run-1" cost={12.34} retries={2} uncertainty={0.42} />
      </CorrelationProvider>
    )
    expect(screen.getByText(/Run ID:/)).toBeTruthy()
    expect(screen.getByText(/run-1/)).toBeTruthy()
    expect(screen.getByText(/\$12.34/)).toBeTruthy()
    expect(screen.getByText(/42%/)).toBeTruthy()
  })
})
