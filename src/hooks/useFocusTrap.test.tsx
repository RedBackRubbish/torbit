import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import { useFocusTrap } from './useFocusTrap'

function ModalHarness({ open }: { open: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, open)

  return (
    <div>
      <button type="button">Open Dialog</button>
      {open && (
        <div ref={dialogRef} role="dialog" aria-modal="true">
          <button type="button">First Action</button>
          <button type="button">Last Action</button>
        </div>
      )}
    </div>
  )
}

describe('useFocusTrap', () => {
  it('moves focus into the dialog when opened', async () => {
    render(<ModalHarness open />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'First Action' })).toHaveFocus()
    })
  })

  it('cycles focus from last to first with Tab', async () => {
    render(<ModalHarness open />)

    const first = screen.getByRole('button', { name: 'First Action' })
    const last = screen.getByRole('button', { name: 'Last Action' })

    await waitFor(() => expect(first).toHaveFocus())

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })

    expect(first).toHaveFocus()
  })

  it('cycles focus from first to last with Shift+Tab', async () => {
    render(<ModalHarness open />)

    const first = screen.getByRole('button', { name: 'First Action' })
    const last = screen.getByRole('button', { name: 'Last Action' })

    await waitFor(() => expect(first).toHaveFocus())

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    expect(last).toHaveFocus()
  })

  it('restores focus when dialog closes', async () => {
    const { rerender } = render(<ModalHarness open={false} />)
    const opener = screen.getByRole('button', { name: 'Open Dialog' })
    opener.focus()

    rerender(<ModalHarness open />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'First Action' })).toHaveFocus()
    })

    rerender(<ModalHarness open={false} />)
    expect(opener).toHaveFocus()
  })
})
