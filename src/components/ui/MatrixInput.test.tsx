import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MatrixInput from './MatrixInput'

describe('MatrixInput', () => {
  it('should render input correctly', () => {
    render(<MatrixInput placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('should render label when provided', () => {
    render(<MatrixInput label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('should render error message', () => {
    render(<MatrixInput error="Invalid input" />)
    expect(screen.getByText(/invalid input/i)).toBeInTheDocument()
  })

  it('should apply error styles when error is present', () => {
    render(<MatrixInput error="Error" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveClass('border-glitch-400')
  })

  it('should accept user input', async () => {
    const user = userEvent.setup()
    render(<MatrixInput data-testid="input" />)
    const input = screen.getByTestId('input')
    
    await user.type(input, 'test@example.com')
    expect(input).toHaveValue('test@example.com')
  })

  it('should use custom id when provided', () => {
    render(<MatrixInput id="custom-id" label="Custom" />)
    const input = screen.getByLabelText('Custom')
    expect(input).toHaveAttribute('id', 'custom-id')
  })

  it('should generate id from label if not provided', () => {
    render(<MatrixInput label="Test Label" />)
    const input = screen.getByLabelText('Test Label')
    expect(input).toHaveAttribute('id', 'test-label')
  })

  it('should pass additional props to input', () => {
    render(<MatrixInput type="email" required />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toBeRequired()
  })
})
