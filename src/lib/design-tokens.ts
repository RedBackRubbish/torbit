/**
 * TORBIT Design Tokens
 * Matrix-inspired design system
 * 
 * "The Matrix has you..."
 */

export const tokens = {
  colors: {
    // The Matrix Green palette
    matrix: {
      50: '#e8ffe8',
      100: '#c1ffc1',
      200: '#8aff8a',
      300: '#4dff4d',
      400: '#00ff41', // THE Matrix green
      500: '#00d835',
      600: '#00b32b',
      700: '#008f22',
      800: '#006b1a',
      900: '#004711',
      950: '#002208',
    },
    // Deep black backgrounds
    void: {
      50: '#1a1a1a',
      100: '#141414',
      200: '#0f0f0f',
      300: '#0a0a0a',
      400: '#080808',
      500: '#050505',
      600: '#030303',
      700: '#020202',
      800: '#010101',
      900: '#000000',
      950: '#000000',
    },
    // Accent - digital cyan
    cyber: {
      400: '#00f5ff',
      500: '#00d4dd',
      600: '#00b3bb',
    },
    // Warning/Error - digital red
    glitch: {
      400: '#ff0040',
      500: '#cc0033',
      600: '#990026',
    },
    // Success states
    success: '#00ff41',
    warning: '#ffff00',
    error: '#ff0040',
  },

  typography: {
    fontFamily: {
      mono: [
        'JetBrains Mono',
        'Fira Code',
        'SF Mono',
        'Monaco',
        'Consolas',
        'monospace',
      ],
      display: [
        'Orbitron',
        'Share Tech Mono',
        'monospace',
      ],
      sans: [
        'Inter',
        'SF Pro Display',
        '-apple-system',
        'sans-serif',
      ],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1.1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
      '7xl': ['4.5rem', { lineHeight: '1' }],
      '8xl': ['6rem', { lineHeight: '1' }],
    },
  },

  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },

  animation: {
    // Matrix rain drop speed
    rainSpeed: '8s',
    // Glitch effect timing
    glitchDuration: '0.3s',
    // Fade in timing
    fadeIn: '0.5s',
    // Pulse glow
    pulse: '2s',
  },

  effects: {
    // Text glow effect
    textGlow: {
      sm: '0 0 10px rgba(0, 255, 65, 0.5)',
      md: '0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0, 255, 65, 0.3)',
      lg: '0 0 30px rgba(0, 255, 65, 0.6), 0 0 60px rgba(0, 255, 65, 0.4), 0 0 100px rgba(0, 255, 65, 0.2)',
    },
    // Box glow
    boxGlow: {
      sm: '0 0 15px rgba(0, 255, 65, 0.3)',
      md: '0 0 30px rgba(0, 255, 65, 0.4)',
      lg: '0 0 50px rgba(0, 255, 65, 0.5)',
    },
    // Scanlines overlay opacity
    scanlines: 0.03,
  },

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const

export type DesignTokens = typeof tokens

// Matrix characters for rain effect
export const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// Utility to get random matrix character
export const getRandomMatrixChar = (): string => {
  return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
}

export default tokens
