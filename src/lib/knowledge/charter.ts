/**
 * TORBIT - Knowledge Boundary Charter
 * 
 * PRODUCTION DOCTRINE - LOCKED
 * 
 * What Torbit is ALLOWED to know vs FORBIDDEN.
 * This is critical — freeze this.
 */

// ============================================
// ✅ ALLOWED KNOWLEDGE
// ============================================

/**
 * A. STABLE DEFAULTS
 * These define platform reality. Facts, not trends.
 */
export const STABLE_DEFAULTS = {
  nextjs: {
    'app-router': 'App Router is production default',
    'pages-router': 'Pages Router is legacy',
  },
  react: {
    'server-components': 'Server Components are default in App Router',
    'client-components': 'Use "use client" for interactivity',
  },
  expo: {
    'expo-router': 'Expo Router is current standard',
  },
  stripe: {
    'payment-intents': 'Stripe recommends Payment Intents',
    'checkout-sessions': 'Checkout Sessions for hosted flow',
  },
  auth: {
    'clerk': 'Clerk is production-ready auth',
    'authjs': 'Auth.js for self-hosted auth',
  },
} as const

/**
 * B. DEPRECATIONS
 * Removed APIs, deprecated SDK methods, end-of-life runtimes.
 */
export interface DeprecationKnowledge {
  item: string
  deprecatedIn: string
  removedIn?: string
  replacement?: string
  source: string
}

/**
 * C. SECURITY FACTS
 * Known vulnerabilities, unsafe defaults, required permissions.
 */
export interface SecurityKnowledge {
  cve?: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  affected: string
  fix?: string
  source: string
}

/**
 * D. VENDOR-STATED BEST PRACTICES
 * Only if explicitly stated by vendor. Never inferred.
 */
export interface BestPracticeKnowledge {
  practice: string
  vendor: string
  source: string
  explicit: true // Must be explicitly stated
}

// ============================================
// ❌ FORBIDDEN KNOWLEDGE
// Torbit does not speculate.
// ============================================

export const FORBIDDEN_KNOWLEDGE_TYPES = [
  // A. Opinionated Trends
  'most-people-use',
  'better-than',
  'developers-prefer',
  'popular-choice',
  
  // B. Community Sentiment
  'popularity',
  'hype',
  'meme-frameworks',
  'trending',
  
  // C. Experimental Tech (unless opted in)
  'experimental',
  'bleeding-edge',
  'beta-features',
  
  // D. Forecasts
  'will-be-future',
  'is-dying',
  'will-replace',
  'prediction',
] as const

export type ForbiddenKnowledgeType = typeof FORBIDDEN_KNOWLEDGE_TYPES[number]

// ============================================
// KNOWLEDGE VALIDATION
// ============================================

/**
 * Check if knowledge claim is forbidden
 */
export function isForbiddenKnowledge(claim: string): boolean {
  const lowerClaim = claim.toLowerCase()
  
  const forbiddenPatterns = [
    // Opinionated trends
    /most (?:people|developers|teams) use/i,
    /\w+ is better than \w+/i,
    /developers prefer/i,
    /popular choice/i,
    /everyone is using/i,
    /hottest (?:new )?framework/i,
    
    // Community sentiment
    /is (?:very )?popular/i,
    /gaining popularity/i,
    /trending/i,
    /viral/i,
    /hyped/i,
    
    // Experimental (without opt-in)
    /experimental feature/i,
    /bleeding[- ]edge/i,
    /try this new/i,
    
    // Forecasts
    /will be the future/i,
    /is dying/i,
    /will replace/i,
    /in the future/i,
    /my prediction/i,
    /i think.*will/i,
  ]
  
  return forbiddenPatterns.some(pattern => pattern.test(lowerClaim))
}

/**
 * Check if knowledge is from allowed category
 */
export function isAllowedKnowledge(claim: string, sourceId: string): boolean {
  // Must not be forbidden
  if (isForbiddenKnowledge(claim)) {
    return false
  }
  
  // Must have a source
  if (!sourceId) {
    return false
  }
  
  // Allowed patterns (facts, not opinions)
  const allowedPatterns = [
    // Stable defaults
    /is (?:the )?(?:production )?default/i,
    /is (?:now )?(?:the )?standard/i,
    /is legacy/i,
    /is deprecated/i,
    
    // Deprecations
    /has been deprecated/i,
    /will be removed in/i,
    /no longer supported/i,
    /end[- ]of[- ]life/i,
    
    // Security
    /vulnerability/i,
    /CVE-\d{4}-\d+/i,
    /security (?:fix|patch|update)/i,
    /unsafe/i,
    
    // Vendor best practices
    /recommends?/i,
    /best practice/i,
    /should use/i,
  ]
  
  return allowedPatterns.some(pattern => pattern.test(claim))
}

// ============================================
// SPEECH PATTERNS
// How Torbit speaks about knowledge
// ============================================

/**
 * Correct tone examples
 */
export const CORRECT_SPEECH = [
  "I'll use the current production default.",
  "App Router is the standard for new Next.js projects.",
  "This API is deprecated. Using the recommended alternative.",
  "The official documentation recommends this approach.",
] as const

/**
 * Forbidden speech patterns
 */
export const FORBIDDEN_SPEECH = [
  "This is the hottest new framework.",
  "Most developers prefer X over Y.",
  "X is trending right now.",
  "I think this will be the future.",
  "Everyone is switching to X.",
] as const

/**
 * Validate speech pattern
 */
export function validateSpeech(speech: string): {
  valid: boolean
  reason?: string
} {
  const lowerSpeech = speech.toLowerCase()
  
  // Check for forbidden patterns
  const forbiddenPatterns = [
    { pattern: /hottest/, reason: 'Avoid hype language' },
    { pattern: /most developers/, reason: 'Avoid unverified claims' },
    { pattern: /trending/, reason: 'Avoid trend language' },
    { pattern: /everyone is/, reason: 'Avoid absolute claims' },
    { pattern: /i think/, reason: 'Avoid speculation' },
    { pattern: /will be the future/, reason: 'Avoid predictions' },
    { pattern: /is dying/, reason: 'Avoid predictions' },
    { pattern: /better than/, reason: 'Avoid comparisons without data' },
  ]
  
  for (const { pattern, reason } of forbiddenPatterns) {
    if (pattern.test(lowerSpeech)) {
      return { valid: false, reason }
    }
  }
  
  return { valid: true }
}

// ============================================
// EXPERIMENTAL OPT-IN
// ============================================

/**
 * User must explicitly request experimental tech
 */
export const EXPERIMENTAL_OPT_IN_PHRASES = [
  'use experimental',
  'use bleeding-edge',
  'try the beta',
  'use canary',
  'use unstable',
] as const

/**
 * Check if user opted into experimental
 */
export function hasExperimentalOptIn(userMessage: string): boolean {
  const lower = userMessage.toLowerCase()
  return EXPERIMENTAL_OPT_IN_PHRASES.some(phrase => lower.includes(phrase))
}
