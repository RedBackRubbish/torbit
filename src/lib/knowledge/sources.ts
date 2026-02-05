/**
 * TORBIT - Approved Knowledge Sources
 * 
 * PRODUCTION DOCTRINE - LOCKED
 * 
 * Rule: Torbit may only "know" things that come from
 * authoritative, non-opinionated sources.
 * 
 * Tier 1: Always Allowed (defines platform reality)
 * Tier 2: Suggestion-Only (never auto-applied)
 * Forbidden: Hard ban, no exceptions
 */

import type { KnowledgeSource, SourceType } from './types'

// ============================================
// TIER 1: FRAMEWORKS & RUNTIMES
// Always Allowed - These define platform reality
// ============================================

export const FRAMEWORK_SOURCES: KnowledgeSource[] = [
  {
    id: 'react-official',
    name: 'React',
    type: 'documentation',
    url: 'https://react.dev/blog',
    updateCadence: 'monthly',
    trustLevel: 'official',
    domains: ['react', 'frontend'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'react-rfcs',
    name: 'React RFCs',
    type: 'release-feed',
    url: 'https://github.com/reactjs/rfcs',
    updateCadence: 'monthly',
    trustLevel: 'official',
    domains: ['react'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'nextjs-releases',
    name: 'Next.js',
    type: 'changelog',
    url: 'https://github.com/vercel/next.js/releases',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['nextjs', 'frontend', 'fullstack'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'expo-docs',
    name: 'Expo Docs',
    type: 'documentation',
    url: 'https://docs.expo.dev',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['expo', 'mobile', 'react-native'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'expo-releases',
    name: 'Expo Releases',
    type: 'changelog',
    url: 'https://github.com/expo/expo/releases',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['expo', 'mobile'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'react-native-docs',
    name: 'React Native',
    type: 'documentation',
    url: 'https://reactnative.dev',
    updateCadence: 'monthly',
    trustLevel: 'official',
    domains: ['react-native', 'mobile'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'nodejs-releases',
    name: 'Node.js',
    type: 'changelog',
    url: 'https://nodejs.org/en/blog',
    updateCadence: 'monthly',
    trustLevel: 'official',
    domains: ['nodejs', 'backend', 'runtime'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'typescript-releases',
    name: 'TypeScript',
    type: 'changelog',
    url: 'https://github.com/microsoft/TypeScript/releases',
    updateCadence: 'quarterly',
    trustLevel: 'official',
    domains: ['typescript', 'language'],
    enabled: true,
    tier: 1,
  },
]

// ============================================
// TIER 1: PLATFORM VENDORS
// Deployment rules, breaking changes, SDK updates
// ============================================

export const PLATFORM_SOURCES: KnowledgeSource[] = [
  {
    id: 'vercel-blog',
    name: 'Vercel Blog',
    type: 'blog',
    url: 'https://vercel.com/blog',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['vercel', 'deployment', 'nextjs'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'apple-developer',
    name: 'Apple Developer News',
    type: 'blog',
    url: 'https://developer.apple.com/news',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['ios', 'mobile', 'apple'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'google-developers',
    name: 'Google Developers Blog',
    type: 'blog',
    url: 'https://developers.google.com/blog',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['google', 'android', 'cloud'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'aws-blog',
    name: 'AWS Blog',
    type: 'blog',
    url: 'https://aws.amazon.com/blogs',
    updateCadence: 'daily',
    trustLevel: 'official',
    domains: ['aws', 'cloud', 'infrastructure'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'cloudflare-blog',
    name: 'Cloudflare Blog',
    type: 'blog',
    url: 'https://blog.cloudflare.com',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['cloudflare', 'edge', 'cdn'],
    enabled: true,
    tier: 1,
  },
]

// ============================================
// TIER 1: INTEGRATION VENDORS
// APIs change. Torbit must not hallucinate deprecated flows.
// ============================================

export const INTEGRATION_SOURCES: KnowledgeSource[] = [
  // Payments
  {
    id: 'stripe-changelog',
    name: 'Stripe Changelog',
    type: 'changelog',
    url: 'https://stripe.com/docs/changelog',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['stripe', 'payments'],
    enabled: true,
    tier: 1,
  },
  // Auth
  {
    id: 'clerk-docs',
    name: 'Clerk Docs',
    type: 'documentation',
    url: 'https://clerk.com/docs',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['clerk', 'auth'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'authjs-docs',
    name: 'Auth.js Docs',
    type: 'documentation',
    url: 'https://authjs.dev',
    updateCadence: 'monthly',
    trustLevel: 'official',
    domains: ['authjs', 'auth'],
    enabled: true,
    tier: 1,
  },
  // Database
  {
    id: 'supabase-changelog',
    name: 'Supabase Changelog',
    type: 'changelog',
    url: 'https://supabase.com/changelog',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['supabase', 'database', 'auth'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'neon-blog',
    name: 'Neon Blog',
    type: 'blog',
    url: 'https://neon.tech/blog',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['neon', 'database', 'postgres'],
    enabled: true,
    tier: 1,
  },
  // Maps
  {
    id: 'google-maps-notes',
    name: 'Google Maps Release Notes',
    type: 'changelog',
    url: 'https://developers.google.com/maps/documentation/javascript/releases',
    updateCadence: 'monthly',
    trustLevel: 'official',
    domains: ['maps', 'google'],
    enabled: true,
    tier: 1,
  },
  // Email
  {
    id: 'sendgrid-changelog',
    name: 'SendGrid Changelog',
    type: 'changelog',
    url: 'https://docs.sendgrid.com/release-notes',
    updateCadence: 'monthly',
    trustLevel: 'official',
    domains: ['sendgrid', 'email'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'resend-changelog',
    name: 'Resend Changelog',
    type: 'changelog',
    url: 'https://resend.com/changelog',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['resend', 'email'],
    enabled: true,
    tier: 1,
  },
  // Analytics
  {
    id: 'sentry-releases',
    name: 'Sentry Release Notes',
    type: 'changelog',
    url: 'https://github.com/getsentry/sentry/releases',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['sentry', 'analytics', 'monitoring'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'posthog-changelog',
    name: 'PostHog Changelog',
    type: 'changelog',
    url: 'https://posthog.com/changelog',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['posthog', 'analytics'],
    enabled: true,
    tier: 1,
  },
]

// ============================================
// TIER 1: SECURITY & STABILITY
// Torbit must avoid insecure defaults
// ============================================

export const SECURITY_SOURCES: KnowledgeSource[] = [
  {
    id: 'npm-advisories',
    name: 'npm Security Advisories',
    type: 'advisory',
    url: 'https://www.npmjs.com/advisories',
    updateCadence: 'daily',
    trustLevel: 'official',
    domains: ['security', 'npm', 'dependencies'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'github-advisories',
    name: 'GitHub Security Advisories',
    type: 'advisory',
    url: 'https://github.com/advisories',
    updateCadence: 'daily',
    trustLevel: 'official',
    domains: ['security', 'vulnerabilities'],
    enabled: true,
    tier: 1,
  },
  {
    id: 'nodejs-security',
    name: 'Node.js Security Releases',
    type: 'advisory',
    url: 'https://nodejs.org/en/blog/vulnerability',
    updateCadence: 'monthly',
    trustLevel: 'official',
    domains: ['security', 'nodejs', 'runtime'],
    enabled: true,
    tier: 1,
  },
]

// ============================================
// TIER 2: SUGGESTION-ONLY
// Inform suggestions, never defaults
// Strategist must approve usage
// ============================================

export const TIER2_SOURCES: KnowledgeSource[] = [
  {
    id: 'react-rfcs-experimental',
    name: 'React RFCs (Experimental)',
    type: 'release-feed',
    url: 'https://github.com/reactjs/rfcs',
    updateCadence: 'monthly',
    trustLevel: 'verified',
    domains: ['react', 'experimental'],
    enabled: true,
    tier: 2,
  },
  {
    id: 'tc39-proposals',
    name: 'TC39 Proposals',
    type: 'release-feed',
    url: 'https://github.com/tc39/proposals',
    updateCadence: 'monthly',
    trustLevel: 'verified',
    domains: ['javascript', 'ecmascript', 'language'],
    enabled: true,
    tier: 2,
  },
  {
    id: 'w3c-drafts',
    name: 'W3C Drafts',
    type: 'release-feed',
    url: 'https://www.w3.org/TR',
    updateCadence: 'monthly',
    trustLevel: 'verified',
    domains: ['web', 'standards'],
    enabled: true,
    tier: 2,
  },
]

// ============================================
// FORBIDDEN SOURCES - HARD BAN
// No exceptions. Opinion ≠ production truth.
// ============================================

export const FORBIDDEN_SOURCES = [
  'reddit.com',
  'medium.com',
  'dev.to',
  'news.ycombinator.com',
  'twitter.com',
  'x.com',
  'youtube.com',
] as const

export const FORBIDDEN_PATTERNS = [
  /reddit\.com/i,
  /medium\.com/i,
  /dev\.to/i,
  /news\.ycombinator\.com/i,
  /twitter\.com/i,
  /x\.com/i,
  /youtube\.com/i,
  /top.?\d+/i,
  /best.?frameworks?/i,
  /\d+.?things/i,
  /personal.?blog/i,
] as const

// ============================================
// COMBINED REGISTRIES
// ============================================

export const TIER1_SOURCES: KnowledgeSource[] = [
  ...FRAMEWORK_SOURCES,
  ...PLATFORM_SOURCES,
  ...INTEGRATION_SOURCES,
  ...SECURITY_SOURCES,
]

export const APPROVED_SOURCES: KnowledgeSource[] = [
  ...TIER1_SOURCES,
  ...TIER2_SOURCES,
]

// ============================================
// SOURCE REGISTRY OPERATIONS
// ============================================

const sourceMap = new Map<string, KnowledgeSource>()
APPROVED_SOURCES.forEach(source => sourceMap.set(source.id, source))

/**
 * Get a source by ID
 */
export function getSource(id: string): KnowledgeSource | undefined {
  return sourceMap.get(id)
}

/**
 * Get sources by domain
 */
export function getSourcesByDomain(domain: string): KnowledgeSource[] {
  return APPROVED_SOURCES.filter(source => 
    source.enabled && source.domains.includes(domain)
  )
}

/**
 * Get sources by type
 */
export function getSourcesByType(type: SourceType): KnowledgeSource[] {
  return APPROVED_SOURCES.filter(source => 
    source.enabled && source.type === type
  )
}

/**
 * Get sources by tier
 */
export function getSourcesByTier(tier: 1 | 2): KnowledgeSource[] {
  return APPROVED_SOURCES.filter(source => 
    source.enabled && source.tier === tier
  )
}

/**
 * Check if a source ID is approved
 */
export function isApprovedSource(id: string): boolean {
  return sourceMap.has(id)
}

/**
 * Check if a URL is from a forbidden source
 */
export function isForbiddenSource(url: string): boolean {
  return FORBIDDEN_PATTERNS.some(pattern => pattern.test(url))
}

/**
 * Check if content contains forbidden source references
 */
export function hasForbiddenReferences(content: string): boolean {
  const lowerContent = content.toLowerCase()
  return FORBIDDEN_SOURCES.some(source => lowerContent.includes(source))
}

/**
 * Validate a source URL
 */
export function validateSourceUrl(url: string): {
  valid: boolean
  tier: 1 | 2 | null
  reason?: string
} {
  if (isForbiddenSource(url)) {
    return {
      valid: false,
      tier: null,
      reason: 'Source is in forbidden list',
    }
  }
  
  const matchedSource = APPROVED_SOURCES.find(source => {
    try {
      return url.includes(new URL(source.url).hostname)
    } catch {
      return false
    }
  })
  
  if (matchedSource) {
    return {
      valid: true,
      tier: matchedSource.tier as 1 | 2,
    }
  }
  
  return {
    valid: false,
    tier: null,
    reason: 'Source not in approved list',
  }
}

// ============================================
// DOMAIN DETECTION
// ============================================

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  nextjs: ['next.js', 'nextjs', 'app router', 'pages router', 'vercel'],
  react: ['react', 'jsx', 'hooks', 'component', 'useState', 'useEffect'],
  expo: ['expo', 'expo router', 'eas'],
  'react-native': ['react native', 'react-native', 'metro'],
  typescript: ['typescript', 'ts', 'type', 'interface'],
  nodejs: ['node', 'nodejs', 'node.js', 'npm', 'package.json'],
  stripe: ['stripe', 'payment', 'checkout', 'subscription'],
  supabase: ['supabase', 'postgres', 'realtime'],
  clerk: ['clerk', 'authentication', 'sign in', 'sign up'],
  auth: ['auth', 'login', 'session', 'jwt', 'oauth'],
  database: ['database', 'db', 'sql', 'query', 'migration'],
  security: ['security', 'vulnerability', 'cve', 'advisory'],
  mobile: ['mobile', 'ios', 'android', 'app store', 'play store'],
}

/**
 * Detect domains from text content
 */
export function detectDomains(text: string): string[] {
  const lowerText = text.toLowerCase()
  const detected: string[] = []
  
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      detected.push(domain)
    }
  }
  
  return [...new Set(detected)]
}
