/**
 * TORBIT - Approved Knowledge Sources
 * 
 * Torbit must not search "the internet."
 * It may query APPROVED source classes only.
 * 
 * ✓ Framework changelogs
 * ✓ Official docs
 * ✓ Release feeds
 * ✓ Curated blogs
 * ✓ Security advisories
 * 
 * ✗ No Reddit
 * ✗ No Medium scraping
 * ✗ No random SEO blogs
 * ✗ No Twitter trends
 */

import type { KnowledgeSource } from './types'

// ============================================
// FRAMEWORK CHANGELOGS
// ============================================

export const FRAMEWORK_SOURCES: KnowledgeSource[] = [
  {
    id: 'nextjs-releases',
    name: 'Next.js Releases',
    type: 'changelog',
    url: 'https://github.com/vercel/next.js/releases',
    updateCadence: 'daily',
    trustLevel: 'official',
    domains: ['nextjs', 'react', 'web'],
    enabled: true,
  },
  {
    id: 'react-releases',
    name: 'React Releases',
    type: 'changelog',
    url: 'https://github.com/facebook/react/releases',
    updateCadence: 'daily',
    trustLevel: 'official',
    domains: ['react', 'web'],
    enabled: true,
  },
  {
    id: 'expo-releases',
    name: 'Expo Releases',
    type: 'changelog',
    url: 'https://github.com/expo/expo/releases',
    updateCadence: 'daily',
    trustLevel: 'official',
    domains: ['expo', 'react-native', 'mobile'],
    enabled: true,
  },
  {
    id: 'typescript-releases',
    name: 'TypeScript Releases',
    type: 'changelog',
    url: 'https://github.com/microsoft/TypeScript/releases',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['typescript', 'web'],
    enabled: true,
  },
  {
    id: 'tailwind-releases',
    name: 'Tailwind CSS Releases',
    type: 'changelog',
    url: 'https://github.com/tailwindlabs/tailwindcss/releases',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['tailwind', 'css', 'web'],
    enabled: true,
  },
]

// ============================================
// OFFICIAL DOCUMENTATION
// ============================================

export const DOCUMENTATION_SOURCES: KnowledgeSource[] = [
  {
    id: 'nextjs-docs',
    name: 'Next.js Documentation',
    type: 'documentation',
    url: 'https://nextjs.org/docs',
    updateCadence: 'daily',
    trustLevel: 'official',
    domains: ['nextjs', 'react', 'web'],
    enabled: true,
  },
  {
    id: 'react-docs',
    name: 'React Documentation',
    type: 'documentation',
    url: 'https://react.dev',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['react', 'web'],
    enabled: true,
  },
  {
    id: 'stripe-docs',
    name: 'Stripe API Documentation',
    type: 'documentation',
    url: 'https://stripe.com/docs/api',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['stripe', 'payments'],
    enabled: true,
  },
  {
    id: 'supabase-docs',
    name: 'Supabase Documentation',
    type: 'documentation',
    url: 'https://supabase.com/docs',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['supabase', 'database', 'auth'],
    enabled: true,
  },
  {
    id: 'clerk-docs',
    name: 'Clerk Documentation',
    type: 'documentation',
    url: 'https://clerk.com/docs',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['clerk', 'auth'],
    enabled: true,
  },
]

// ============================================
// CURATED BLOGS
// ============================================

export const BLOG_SOURCES: KnowledgeSource[] = [
  {
    id: 'vercel-blog',
    name: 'Vercel Blog',
    type: 'blog',
    url: 'https://vercel.com/blog',
    updateCadence: 'daily',
    trustLevel: 'official',
    domains: ['vercel', 'nextjs', 'deployment', 'web'],
    enabled: true,
  },
  {
    id: 'react-blog',
    name: 'React Blog',
    type: 'blog',
    url: 'https://react.dev/blog',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['react', 'web'],
    enabled: true,
  },
  {
    id: 'expo-blog',
    name: 'Expo Blog',
    type: 'blog',
    url: 'https://blog.expo.dev',
    updateCadence: 'weekly',
    trustLevel: 'official',
    domains: ['expo', 'react-native', 'mobile'],
    enabled: true,
  },
]

// ============================================
// SECURITY ADVISORIES
// ============================================

export const ADVISORY_SOURCES: KnowledgeSource[] = [
  {
    id: 'npm-advisories',
    name: 'npm Security Advisories',
    type: 'advisory',
    url: 'https://github.com/advisories',
    updateCadence: 'hourly',
    trustLevel: 'official',
    domains: ['npm', 'security', 'dependencies'],
    enabled: true,
  },
  {
    id: 'github-security',
    name: 'GitHub Security Advisories',
    type: 'advisory',
    url: 'https://github.com/advisories',
    updateCadence: 'hourly',
    trustLevel: 'official',
    domains: ['security', 'vulnerabilities'],
    enabled: true,
  },
]

// ============================================
// ALL APPROVED SOURCES
// ============================================

export const APPROVED_SOURCES: KnowledgeSource[] = [
  ...FRAMEWORK_SOURCES,
  ...DOCUMENTATION_SOURCES,
  ...BLOG_SOURCES,
  ...ADVISORY_SOURCES,
]

// ============================================
// SOURCE REGISTRY
// ============================================

const sourceRegistry = new Map<string, KnowledgeSource>()

// Initialize registry
for (const source of APPROVED_SOURCES) {
  sourceRegistry.set(source.id, source)
}

/**
 * Get a source by ID
 */
export function getSource(id: string): KnowledgeSource | undefined {
  return sourceRegistry.get(id)
}

/**
 * Get sources by domain
 */
export function getSourcesByDomain(domain: string): KnowledgeSource[] {
  return APPROVED_SOURCES.filter(
    source => source.enabled && source.domains.includes(domain)
  )
}

/**
 * Get sources by type
 */
export function getSourcesByType(type: KnowledgeSource['type']): KnowledgeSource[] {
  return APPROVED_SOURCES.filter(
    source => source.enabled && source.type === type
  )
}

/**
 * Check if a source is approved
 */
export function isApprovedSource(url: string): boolean {
  return APPROVED_SOURCES.some(
    source => source.enabled && url.startsWith(source.url)
  )
}

/**
 * Get all enabled sources
 */
export function getEnabledSources(): KnowledgeSource[] {
  return APPROVED_SOURCES.filter(source => source.enabled)
}

// ============================================
// SOURCE DOMAIN MAPPING
// ============================================

export const DOMAIN_KEYWORDS: Record<string, string[]> = {
  'nextjs': ['next.js', 'nextjs', 'next js', 'app router', 'pages router'],
  'react': ['react', 'reactjs', 'react.js', 'hooks', 'components'],
  'expo': ['expo', 'react native', 'react-native', 'mobile app'],
  'typescript': ['typescript', 'ts', 'types', 'typing'],
  'tailwind': ['tailwind', 'tailwindcss', 'utility css'],
  'stripe': ['stripe', 'payments', 'checkout', 'subscription'],
  'supabase': ['supabase', 'postgres', 'realtime'],
  'clerk': ['clerk', 'authentication', 'auth'],
  'vercel': ['vercel', 'deployment', 'edge'],
}

/**
 * Detect domains from text
 */
export function detectDomains(text: string): string[] {
  const lowercaseText = text.toLowerCase()
  const detectedDomains: string[] = []
  
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(keyword => lowercaseText.includes(keyword))) {
      detectedDomains.push(domain)
    }
  }
  
  return detectedDomains
}
