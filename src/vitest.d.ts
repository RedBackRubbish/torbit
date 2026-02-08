/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

export {}

interface CustomMatchers<R = unknown> {
  toBeInTheDocument(): R
  toHaveClass(className: string): R
  toHaveTextContent(text: string | RegExp): R
  toBeVisible(): R
  toBeDisabled(): R
  toHaveAttribute(attr: string, value?: string): R
  toHaveStyle(style: Record<string, unknown>): R
}

declare module 'vitest' {
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
