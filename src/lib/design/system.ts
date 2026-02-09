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
// DESIGN DECISION HIERARCHY
// ============================================================================
// When design choices conflict, the higher rule wins. This is JUDGMENT.
// Senior designers spend more time removing than adding.

export const DESIGN_DECISION_HIERARCHY = [
  'Clarity over density - if it is not immediately understandable, simplify',
  'Structure before decoration - layout and hierarchy first, styling second',
  'Fewer components over richer components - one good component beats three mediocre ones',
  'Remove before adding - can you achieve the same with less?',
  'One primary action per screen - do not compete for attention',
  'Obvious over clever - if you need to explain it, redesign it',
  'Content before chrome - UI should serve content, not overshadow it',
] as const

// ============================================================================
// SCREEN INTENT MODIFIERS
// ============================================================================
// Different screens need different treatment. Intent drives design.

export const SCREEN_INTENT_MODIFIERS = {
  hero: {
    intent: 'Capture attention, single CTA',
    headlineScale: 'text-5xl md:text-6xl lg:text-7xl',
    ctaCount: 1,
    sectionPadding: 'py-24 md:py-32 lg:py-40',
    density: 'spacious',
    emphasis: 'headline > visual > cta',
    rules: [
      'Maximum 12 words in headline',
      'Single primary CTA, optional secondary',
      'Visual or illustration as support, not focus',
      'No navigation links in hero area',
    ],
  },
  onboarding: {
    intent: 'Guide without overwhelming',
    headlineScale: 'text-2xl md:text-3xl',
    ctaCount: 1,
    sectionPadding: 'py-12 md:py-16',
    density: 'comfortable',
    emphasis: 'progress > content > action',
    rules: [
      'Show progress (step 1 of 3)',
      'One question or action per step',
      'Clear back/skip options',
      'Never more than 5 form fields visible',
    ],
  },
  dashboard: {
    intent: 'Information at a glance',
    headlineScale: 'text-xl md:text-2xl',
    ctaCount: 0,
    sectionPadding: 'py-6 md:py-8',
    density: 'comfortable',
    emphasis: 'data > navigation > actions',
    rules: [
      'Key metrics above the fold',
      'Cards for discrete data sets',
      'Consistent card heights in rows',
      'No decorative elements',
    ],
  },
  adminList: {
    intent: 'Scan and manage data efficiently',
    headlineScale: 'text-lg',
    ctaCount: 1,
    sectionPadding: 'py-4 md:py-6',
    density: 'compact',
    emphasis: 'table > filters > bulk-actions',
    rules: [
      'Table over cards for >5 items',
      'Inline actions, not modals',
      'Sortable columns with clear indicators',
      'Bulk select for power users',
    ],
  },
  detailView: {
    intent: 'Complete information with actions',
    headlineScale: 'text-2xl md:text-3xl',
    ctaCount: 2,
    sectionPadding: 'py-8 md:py-12',
    density: 'comfortable',
    emphasis: 'title > metadata > content > actions',
    rules: [
      'Sticky header with key info',
      'Related actions grouped together',
      'Metadata above main content',
      'Back navigation always visible',
    ],
  },
  emptyState: {
    intent: 'Guide to first action',
    headlineScale: 'text-xl',
    ctaCount: 1,
    sectionPadding: 'py-16 md:py-24',
    density: 'spacious',
    emphasis: 'message > illustration > action',
    rules: [
      'One clear CTA',
      'Explain what this area will contain',
      'Optional: subtle illustration',
      'No sad faces or negative language',
    ],
  },
  settings: {
    intent: 'Configure without confusion',
    headlineScale: 'text-lg',
    ctaCount: 1,
    sectionPadding: 'py-6 md:py-8',
    density: 'comfortable',
    emphasis: 'sections > fields > save',
    rules: [
      'Group related settings',
      'Descriptions under each field',
      'Sticky save button',
      'Danger zone at bottom',
    ],
  },
  pricing: {
    intent: 'Compare and convert',
    headlineScale: 'text-3xl md:text-4xl',
    ctaCount: 3,
    sectionPadding: 'py-16 md:py-24',
    density: 'comfortable',
    emphasis: 'recommended > features > cta',
    rules: [
      'Highlight one recommended plan',
      'Feature comparison aligned',
      'Price prominent, period small',
      'No more than 4 plans visible',
    ],
  },
} as const

// ============================================================================
// DENSITY CONTROL
// ============================================================================
// Not everything should be spacious. Data-heavy screens need different treatment.

export const DENSITY_PRESETS = {
  spacious: {
    name: 'Spacious',
    use: 'Landing pages, marketing, hero sections',
    rowHeight: 'h-14 md:h-16',
    cellPadding: 'px-6 py-4',
    sectionGap: 'gap-8 md:gap-12',
    fontSize: 'text-base',
    borderVisibility: 'border-opacity-6',
  },
  comfortable: {
    name: 'Comfortable',
    use: 'Dashboards, settings, detail pages',
    rowHeight: 'h-12',
    cellPadding: 'px-4 py-3',
    sectionGap: 'gap-6',
    fontSize: 'text-sm',
    borderVisibility: 'border-opacity-8',
  },
  compact: {
    name: 'Compact',
    use: 'Admin tables, data grids, power-user UIs',
    rowHeight: 'h-10',
    cellPadding: 'px-3 py-2',
    sectionGap: 'gap-4',
    fontSize: 'text-sm',
    borderVisibility: 'border-opacity-10',
  },
} as const

// ============================================================================
// NO-DRIBBBLE RULES (Seriously)
// ============================================================================
// These are the #1 reason AI UIs look fake. Explicitly forbidden.

export const DRIBBBLE_BANS = [
  // Visual Noise
  'Gradients on backgrounds (unless explicitly luxury/creative)',
  'Floating shapes or blobs in backgrounds',
  'Mesh gradients or aurora effects',
  'Glassmorphism / frosted glass effects',
  'Neumorphism / soft 3D shadows',
  
  // Over-styling
  'Excessive rounded corners (rounded-3xl, rounded-full on containers)',
  'Glow effects on buttons or cards',
  'Animated gradient borders',
  'Rainbow or multi-color gradients',
  'Drop shadows larger than shadow-md',
  
  // Decorative Waste
  'Illustration-heavy heroes by default',
  'Abstract decorative patterns',
  '3D icons or isometric graphics',
  'Floating badges or ribbons',
  'Confetti or particle effects',
  
  // Layout Crimes
  'Cards tilted at angles',
  'Overlapping elements for style',
  'Text over busy backgrounds',
  'Split-screen layouts without purpose',
  'Masonry grids for simple content',
] as const

// ============================================================================
// OUTCOME SCORING (INTERNAL ONLY)
// ============================================================================
// Silent scoring system. If score < threshold, simplify again.
// Never exposed to users. Just makes generations converge toward "obvious".

export const OUTCOME_SCORING = {
  dimensions: {
    clarity: {
      weight: 0.4,
      description: 'Is the purpose immediately understandable?',
      signals: {
        positive: [
          'Single clear headline',
          'One obvious primary action',
          'Scannable content structure',
          'No competing elements',
        ],
        negative: [
          'Multiple CTAs fighting for attention',
          'Wall of text',
          'Unclear hierarchy',
          'Too many visual elements',
        ],
      },
    },
    hierarchy: {
      weight: 0.3,
      description: 'Is there a clear visual order?',
      signals: {
        positive: [
          'Size contrast between levels',
          'Color/opacity for importance',
          'Consistent spacing rhythm',
          'F or Z reading pattern',
        ],
        negative: [
          'Everything same size',
          'Flat visual weight',
          'Inconsistent spacing',
          'No focal point',
        ],
      },
    },
    restraint: {
      weight: 0.3,
      description: 'Has unnecessary been removed?',
      signals: {
        positive: [
          'Generous whitespace',
          'Minimal color palette',
          'No decorative elements',
          'Content-first layout',
        ],
        negative: [
          'Decorative noise',
          'Multiple accent colors',
          'Cramped spacing',
          'Style over substance',
        ],
      },
    },
  },
  threshold: 0.7, // Below this = simplify again
  action: 'If any dimension scores low, ask: "What can I remove?"',
} as const

// ============================================================================
// FIRST-GENERATION SIMPLICITY BIAS
// ============================================================================
// Hard rule: First generation should UNDER-build. Let users ask for more.
// Never overwhelm. Never over-deliver. Start minimal, iterate up.

export const FIRST_GENERATION_RULES = {
  principle: 'Under-build on first generation. Let users ask for more.',
  
  maxElements: {
    pages: 3,           // Start with 3 pages max, not 10
    sectionsPerPage: 4, // 4 sections max per page
    ctasPerPage: 1,     // One primary CTA per page
    navItems: 5,        // 5 nav items max
    formFields: 5,      // 5 form fields max visible
    tableColumns: 5,    // 5 table columns max
    cardVariants: 2,    // 2 card styles max (primary, secondary)
  },
  
  defaultOff: [
    'Animations beyond hover states',
    'Dark mode toggle (unless requested)',
    'Multi-step wizards (single page first)',
    'Modals (inline editing first)',
    'Tabs (single view first)',
    'Filters (show all first)',
    'Pagination (simple list first)',
    'Search (unless core feature)',
  ],
  
  defer: [
    'Settings pages',
    'Profile pages',
    'Empty states',
    'Error states',
    'Loading skeletons',
    'Mobile nav variations',
  ],
  
  bias: 'When in doubt, leave it out. Users will ask for what they need.',
} as const

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

function detectScreenIntent(prompt: string): keyof typeof SCREEN_INTENT_MODIFIERS | null {
  const lower = prompt.toLowerCase()
  
  if (lower.includes('hero') || lower.includes('landing') || lower.includes('homepage')) {
    return 'hero'
  }
  if (lower.includes('onboarding') || lower.includes('signup flow') || lower.includes('wizard')) {
    return 'onboarding'
  }
  if (lower.includes('dashboard') || lower.includes('analytics') || lower.includes('metrics')) {
    return 'dashboard'
  }
  if (lower.includes('admin') || lower.includes('list') || lower.includes('table') || lower.includes('manage')) {
    return 'adminList'
  }
  if (lower.includes('detail') || lower.includes('view') || lower.includes('profile')) {
    return 'detailView'
  }
  if (lower.includes('empty') || lower.includes('no data') || lower.includes('getting started')) {
    return 'emptyState'
  }
  if (lower.includes('settings') || lower.includes('preferences') || lower.includes('config')) {
    return 'settings'
  }
  if (lower.includes('pricing') || lower.includes('plans') || lower.includes('subscription')) {
    return 'pricing'
  }
  
  return null
}

function detectDensity(prompt: string): keyof typeof DENSITY_PRESETS {
  const lower = prompt.toLowerCase()
  
  if (lower.includes('compact') || lower.includes('dense') || lower.includes('admin') || lower.includes('data-heavy')) {
    return 'compact'
  }
  if (lower.includes('spacious') || lower.includes('landing') || lower.includes('hero') || lower.includes('marketing')) {
    return 'spacious'
  }
  
  return 'comfortable'
}

export function getDesignGuidance(userPrompt: string): string {
  const lowerPrompt = userPrompt.toLowerCase()
  
  // Detect style from user prompt
  let presetKey: keyof typeof DESIGN_PRESETS = 'premiumDark'
  
  if (lowerPrompt.includes('light') || lowerPrompt.includes('clean') || lowerPrompt.includes('minimal')) {
    presetKey = 'cleanLight'
  } else if (lowerPrompt.includes('saas') || lowerPrompt.includes('dashboard') || lowerPrompt.includes('enterprise')) {
    presetKey = 'saasProf'
  }
  
  const preset = DESIGN_PRESETS[presetKey]
  
  // Detect screen intent and density
  const screenIntent = detectScreenIntent(userPrompt)
  const density = detectDensity(userPrompt)
  const densityPreset = DENSITY_PRESETS[density]
  
  // Build intent-specific guidance
  let intentGuidance = ''
  if (screenIntent) {
    const intent = SCREEN_INTENT_MODIFIERS[screenIntent]
    intentGuidance = `
SCREEN INTENT: ${screenIntent.toUpperCase()}
Goal: ${intent.intent}
- Headline: ${intent.headlineScale}
- CTAs allowed: ${intent.ctaCount}
- Padding: ${intent.sectionPadding}
- Priority: ${intent.emphasis}

Rules for this screen:
${intent.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`
  }
  
  return `
═══════════════════════════════════════════════════════════════════════════════
                        DESIGN JUDGMENT (READ FIRST)
═══════════════════════════════════════════════════════════════════════════════

Before applying any styles, follow this hierarchy. Higher rules ALWAYS win:

${DESIGN_DECISION_HIERARCHY.map((r, i) => `${i + 1}. ${r}`).join('\n')}

SENIOR DESIGNERS REMOVE MORE THAN THEY ADD.
Before adding any component, ask: "Can I achieve this with less?"

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
${intentGuidance}

═══════════════════════════════════════════════════════════════════════════════
                              DENSITY: ${density.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════

This screen uses "${densityPreset.name}" density (${densityPreset.use}):
- Row height: ${densityPreset.rowHeight}
- Cell padding: ${densityPreset.cellPadding}
- Section gap: ${densityPreset.sectionGap}
- Font size: ${densityPreset.fontSize}

═══════════════════════════════════════════════════════════════════════════════
                          NEVER DO (DRIBBBLE BANS)
═══════════════════════════════════════════════════════════════════════════════

These patterns make apps look fake. They are FORBIDDEN:

${DRIBBBLE_BANS.slice(0, 10).map(b => `✗ ${b}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
                        SELF-CRITIQUE (BEFORE FINISHING)
═══════════════════════════════════════════════════════════════════════════════

Before completing, run this mental checklist:

1. Does this screen have more than one primary CTA? → Remove extras
2. Is there unnecessary visual noise? → Simplify
3. Can any section be removed without losing clarity? → Remove it
4. Are there competing colors or accents? → Reduce to one
5. Would a senior designer at Linear approve this? → If not, iterate

OUTCOME SCORING (internal check):
- Clarity (40%): Is purpose immediately understandable?
- Hierarchy (30%): Is there clear visual order?
- Restraint (30%): Has unnecessary been removed?

If any dimension feels weak → simplify before finishing.

═══════════════════════════════════════════════════════════════════════════════
                     FIRST-GENERATION SIMPLICITY (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════

This is a FIRST GENERATION. Under-build. Let users ask for more.

LIMITS FOR FIRST GENERATION:
- Max 3 pages (not 10)
- Max 4 sections per page
- Max 1 primary CTA per page
- Max 5 nav items
- Max 5 form fields visible
- Max 5 table columns

DEFAULT OFF (unless explicitly requested):
- Animations beyond hover states
- Dark mode toggle
- Multi-step wizards
- Modals (use inline editing)
- Tabs (single view first)
- Complex filters

DEFER FOR LATER:
- Settings pages
- Profile pages
- Empty states
- Error states
- Loading skeletons

When in doubt, leave it out. Users will ask for what they need.
The best designs don't look fancy. They look OBVIOUS.
`
}

// ============================================================================
// DaisyUI THEME MAPPING
// ============================================================================
// NOTE: The design presets above use raw Tailwind for Torbit's OWN UI (Next.js).
// Generated apps use DaisyUI semantic classes. This mapping bridges the two:
// when we detect a user's style intent, we recommend a DaisyUI theme name
// rather than injecting raw hex colors that conflict with DaisyUI's theme system.

export const DAISYUI_THEME_MAP: Record<keyof typeof DESIGN_PRESETS, { theme: string; alt: string }> = {
  premiumDark: { theme: 'dark', alt: 'business' },
  cleanLight: { theme: 'light', alt: 'corporate' },
  saasProf: { theme: 'corporate', alt: 'light' },
}

/**
 * Get DaisyUI theme guidance for generated apps.
 * This should be injected into agent prompts INSTEAD of raw design system hex values
 * when building DaisyUI-driven generated apps.
 */
export function getDaisyUIGuidance(userPrompt: string): string {
  const lower = userPrompt.toLowerCase()

  let themeName = 'dark'
  let altTheme = 'business'

  if (lower.includes('light') || lower.includes('clean') || lower.includes('minimal')) {
    themeName = 'light'
    altTheme = 'corporate'
  } else if (lower.includes('saas') || lower.includes('enterprise') || lower.includes('corporate')) {
    themeName = 'corporate'
    altTheme = 'light'
  } else if (lower.includes('cupcake') || lower.includes('playful') || lower.includes('pastel')) {
    themeName = 'cupcake'
    altTheme = 'pastel'
  } else if (lower.includes('luxury') || lower.includes('premium') || lower.includes('gold')) {
    themeName = 'luxury'
    altTheme = 'business'
  } else if (lower.includes('cyberpunk') || lower.includes('neon') || lower.includes('retro')) {
    themeName = 'cyberpunk'
    altTheme = 'synthwave'
  } else if (lower.includes('nature') || lower.includes('eco') || lower.includes('green')) {
    themeName = 'emerald'
    altTheme = 'garden'
  }

  return `
═══════════════════════════════════════════════════════════════════════════════
                      DAISYUI THEME (GENERATED APP)
═══════════════════════════════════════════════════════════════════════════════

RECOMMENDED THEME: "${themeName}" (alt: "${altTheme}")

Set in app.html:
<html lang="en" data-theme="${themeName}">

USE SEMANTIC CLASSES (not raw hex colors):
- Backgrounds: bg-base-100, bg-base-200, bg-base-300
- Text: text-base-content, text-base-content/70 (muted)
- Primary: bg-primary, text-primary-content, btn-primary
- Cards: card bg-base-100 shadow-xl
- Buttons: btn btn-primary, btn btn-secondary, btn btn-ghost
- Inputs: input input-bordered
- Alerts: alert alert-info, alert-success, alert-warning, alert-error

DO NOT use raw hex colors like #3b82f6 — DaisyUI themes handle this automatically.
`
}

export type DesignPreset = keyof typeof DESIGN_PRESETS
export type ScreenIntent = keyof typeof SCREEN_INTENT_MODIFIERS
export type DensityPreset = keyof typeof DENSITY_PRESETS
