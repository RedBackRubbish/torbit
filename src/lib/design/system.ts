/**
 * TORBIT DESIGN SYSTEM - High-End Output Standards
 * 
 * This module encodes visual taste into the AI's outputs.
 * Every generated app should look like it was designed by a senior product designer.
 * 
 * Philosophy: Restraint is taste. Density is amateur.
 */

// ============================================================================
// DESIGN PRESETS
// ============================================================================
// These are the actual CSS values, not vague descriptions.
// The AI should use these exact values.

export const DESIGN_PRESETS = {
  /**
   * Premium Dark (Default)
   * Inspired by: Linear, Vercel, Raycast
   * Feel: Sophisticated, focused, developer-friendly
   */
  premiumDark: {
    name: 'Premium Dark',
    inspiration: 'Linear, Vercel, Raycast',
    colors: {
      background: {
        primary: '#000000',
        secondary: '#0a0a0a',
        tertiary: '#111111',
        elevated: '#141414',
      },
      text: {
        primary: 'rgba(255, 255, 255, 0.95)',
        secondary: 'rgba(255, 255, 255, 0.65)',
        muted: 'rgba(255, 255, 255, 0.40)',
        disabled: 'rgba(255, 255, 255, 0.25)',
      },
      border: {
        default: 'rgba(255, 255, 255, 0.06)',
        subtle: 'rgba(255, 255, 255, 0.04)',
        hover: 'rgba(255, 255, 255, 0.12)',
      },
      accent: {
        primary: '#ffffff',
        hover: 'rgba(255, 255, 255, 0.9)',
      },
    },
    spacing: {
      page: 'px-6 md:px-12 lg:px-24',
      section: 'py-16 md:py-24 lg:py-32',
      card: 'p-6 md:p-8',
      gap: 'gap-4 md:gap-6',
    },
    typography: {
      hero: 'text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight',
      h1: 'text-3xl md:text-4xl font-semibold tracking-tight',
      h2: 'text-2xl md:text-3xl font-medium tracking-tight',
      h3: 'text-xl font-medium',
      body: 'text-[15px] leading-relaxed',
      small: 'text-[13px]',
      micro: 'text-[11px]',
    },
    effects: {
      cardBorder: 'border border-white/[0.06] rounded-xl',
      cardHover: 'hover:border-white/[0.12] transition-colors',
      buttonPrimary: 'bg-white text-black hover:bg-white/90',
      buttonSecondary: 'bg-white/[0.06] text-white hover:bg-white/[0.12]',
      input: 'bg-white/[0.04] border border-white/[0.08] focus:border-white/[0.2]',
    },
    rules: [
      'No shadows on dark backgrounds - use border opacity instead',
      'Primary buttons are white, not colored',
      'Use opacity for hierarchy, not different grays',
      'Generous whitespace - sections breathe',
      'Icons at 16-20px, muted color (white/40)',
    ],
  },

  /**
   * Clean Light
   * Inspired by: Notion, Linear (light), Apple
   * Feel: Clean, airy, professional
   */
  cleanLight: {
    name: 'Clean Light',
    inspiration: 'Notion, Linear light mode, Apple',
    colors: {
      background: {
        primary: '#ffffff',
        secondary: '#fafafa',
        tertiary: '#f5f5f5',
        elevated: '#ffffff',
      },
      text: {
        primary: '#171717',
        secondary: '#525252',
        muted: '#a3a3a3',
        disabled: '#d4d4d4',
      },
      border: {
        default: 'rgba(0, 0, 0, 0.08)',
        subtle: 'rgba(0, 0, 0, 0.04)',
        hover: 'rgba(0, 0, 0, 0.15)',
      },
      accent: {
        primary: '#171717',
        hover: '#262626',
      },
    },
    spacing: {
      page: 'px-6 md:px-12 lg:px-24',
      section: 'py-16 md:py-24 lg:py-32',
      card: 'p-6 md:p-8',
      gap: 'gap-4 md:gap-6',
    },
    typography: {
      hero: 'text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-neutral-900',
      h1: 'text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900',
      h2: 'text-2xl md:text-3xl font-medium tracking-tight text-neutral-800',
      h3: 'text-xl font-medium text-neutral-800',
      body: 'text-[15px] leading-relaxed text-neutral-600',
      small: 'text-[13px] text-neutral-500',
      micro: 'text-[11px] text-neutral-400',
    },
    effects: {
      cardBorder: 'border border-neutral-200 rounded-xl',
      cardShadow: 'shadow-sm',
      cardHover: 'hover:shadow-md hover:border-neutral-300 transition-all',
      buttonPrimary: 'bg-neutral-900 text-white hover:bg-neutral-800',
      buttonSecondary: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
      input: 'bg-white border border-neutral-200 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100',
    },
    rules: [
      'Subtle shadows for elevation, not heavy drop-shadows',
      'Borders are barely visible - rgba(0,0,0,0.08)',
      'Text hierarchy through color, not weight',
      'White backgrounds with subtle gray accents',
      'No pure black text - use #171717',
    ],
  },

  /**
   * SaaS Professional
   * Inspired by: Stripe, Intercom, Segment
   * Feel: Trustworthy, polished, enterprise-ready
   */
  saasProf: {
    name: 'SaaS Professional',
    inspiration: 'Stripe, Intercom, Segment',
    colors: {
      background: {
        primary: '#ffffff',
        secondary: '#f8fafc',
        tertiary: '#f1f5f9',
        elevated: '#ffffff',
      },
      text: {
        primary: '#0f172a',
        secondary: '#475569',
        muted: '#94a3b8',
        disabled: '#cbd5e1',
      },
      border: {
        default: '#e2e8f0',
        subtle: '#f1f5f9',
        hover: '#cbd5e1',
      },
      accent: {
        primary: '#6366f1', // Indigo
        hover: '#4f46e5',
        light: '#eef2ff',
      },
    },
    typography: {
      hero: 'text-4xl md:text-5xl font-bold tracking-tight text-slate-900',
      h1: 'text-3xl font-bold tracking-tight text-slate-900',
      h2: 'text-2xl font-semibold text-slate-900',
      h3: 'text-lg font-semibold text-slate-800',
      body: 'text-base text-slate-600',
      small: 'text-sm text-slate-500',
      micro: 'text-xs text-slate-400',
    },
    effects: {
      cardBorder: 'border border-slate-200 rounded-lg',
      cardShadow: 'shadow-sm',
      buttonPrimary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
      buttonSecondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
      input: 'border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
    },
    rules: [
      'Accent color for CTAs only, not decoration',
      'Card shadows should be subtle (shadow-sm)',
      'Use slate palette, not neutral',
      'Professional rounded corners (rounded-lg, not full)',
      'Consistent 4px/8px spacing rhythm',
    ],
  },
} as const

// ============================================================================
// ANTI-PATTERNS
// ============================================================================
// Things that make apps look cheap. Never do these.

export const ANTI_PATTERNS = [
  // Color
  'Using saturated colors everywhere (only use for CTAs)',
  'Pure black (#000) on white backgrounds (use #0f172a or #171717)',
  'Using blue for everything (choose a deliberate accent)',
  'Rainbow gradient backgrounds (unless explicitly luxury/creative)',
  
  // Typography
  'Multiple font weights on one line',
  'ALL CAPS for more than 2 words',
  'Tiny text below 11px',
  'Inconsistent font sizes (use a scale)',
  
  // Spacing
  'Cramped layouts with no breathing room',
  'Inconsistent padding (16px here, 20px there)',
  'Full-width containers on large screens (max-w-7xl)',
  'No vertical rhythm in sections',
  
  // Components
  'Heavy box shadows (use border opacity or shadow-sm)',
  'Pill-shaped buttons everywhere (save for tags/badges)',
  'Icon overload (max 1 icon per button)',
  'Border radius inconsistency',
  
  // UX
  'Click here links (descriptive text only)',
  'Walls of text (break into scannable chunks)',
  'Loading spinners instead of skeletons',
  'Modal overuse (inline editing is cleaner)',
]

// ============================================================================
// HIGH-END PATTERNS
// ============================================================================
// What makes apps feel premium

export const HIGH_END_PATTERNS = [
  // Visual Hierarchy
  'One focal point per section',
  'Size contrast between heading and body (at least 2 steps)',
  'Muted secondary elements (opacity-60)',
  'Clear visual flow (Z or F pattern)',
  
  // Micro-interactions
  'Subtle hover states (border color, background shift)',
  'Smooth transitions (150-200ms)',
  'Skeleton loaders for content',
  'Optimistic updates for actions',
  
  // Spacing
  'Generous section padding (py-24 minimum)',
  'Consistent component gaps (gap-4 or gap-6)',
  'Content max-width (max-w-2xl for text, max-w-6xl for layouts)',
  'Breathing room around CTAs',
  
  // Typography
  'One typeface, multiple weights',
  'Line height 1.6 for body text',
  'Letter spacing -0.02em on large headings',
  'Color for hierarchy (primary/secondary/muted)',
  
  // Details
  'Border radius consistency (pick one: 8px, 12px, or 16px)',
  'Icon size consistency (16px, 20px, or 24px)',
  'Consistent button heights (h-9, h-10, h-11)',
  'Monospace for data/numbers',
]

// ============================================================================
// PROMPT INJECTIONS
// ============================================================================
// These get injected into the system prompt based on context

export function getDesignGuidance(userPrompt: string): string {
  const lowerPrompt = userPrompt.toLowerCase()
  
  // Detect style from user prompt
  let preset = DESIGN_PRESETS.premiumDark
  
  if (lowerPrompt.includes('light') || lowerPrompt.includes('clean') || lowerPrompt.includes('minimal')) {
    preset = DESIGN_PRESETS.cleanLight
  } else if (lowerPrompt.includes('saas') || lowerPrompt.includes('dashboard') || lowerPrompt.includes('enterprise')) {
    preset = DESIGN_PRESETS.saasProf
  }
  
  return `
═══════════════════════════════════════════════════════════════════════════════
                           DESIGN SYSTEM (MANDATORY)
═══════════════════════════════════════════════════════════════════════════════

You are using the "${preset.name}" design system (inspired by ${preset.inspiration}).

COLORS (use these exact values):
- Background: ${preset.colors.background.primary} (primary), ${preset.colors.background.secondary} (secondary)
- Text: ${preset.colors.text.primary} (primary), ${preset.colors.text.secondary} (secondary), ${preset.colors.text.muted} (muted)
- Borders: ${preset.colors.border.default}

TYPOGRAPHY:
- Hero: ${preset.typography.hero}
- H1: ${preset.typography.h1}
- H2: ${preset.typography.h2}
- Body: ${preset.typography.body}
- Small: ${preset.typography.small}

COMPONENT STYLES:
- Cards: ${preset.effects.cardBorder}
- Primary Button: ${preset.effects.buttonPrimary}
- Secondary Button: ${preset.effects.buttonSecondary}
- Inputs: ${preset.effects.input}

DESIGN RULES:
${preset.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

NEVER DO:
- Saturated colors except for one accent
- Heavy shadows (shadow-lg, shadow-xl)
- Cramped spacing
- Multiple colors competing for attention
- Inconsistent border radius

ALWAYS DO:
- Generous whitespace (py-16 minimum for sections)
- Subtle borders (opacity 0.06-0.12)
- One accent color for CTAs
- Consistent sizing (h-10 buttons, 16px icons)
- Smooth transitions (transition-colors, transition-all)
`
}

export type DesignPreset = keyof typeof DESIGN_PRESETS
