/**
 * TORBIT - Knowledge System
 * 
 * PRODUCTION DOCTRINE - LOCKED
 * 
 * "Torbit may sense the world. Torbit may not blindly react to it."
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    KNOWLEDGE PERIMETER                      │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  ✅ TIER 1 - ALWAYS ALLOWED                                 │
 * │  ├─ Frameworks: React, Next.js, Expo, Node.js, TypeScript   │
 * │  ├─ Platforms: Vercel, Apple, Google, AWS, Cloudflare       │
 * │  ├─ Integrations: Stripe, Clerk, Supabase, SendGrid, etc.   │
 * │  └─ Security: npm advisories, GitHub advisories, CVEs       │
 * │                                                             │
 * │  ⚠️ TIER 2 - SUGGESTION ONLY (Strategist must approve)      │
 * │  ├─ RFCs (React, TC39)                                      │
 * │  ├─ Official roadmap posts                                  │
 * │  └─ W3C drafts                                              │
 * │                                                             │
 * │  ❌ FORBIDDEN - HARD BAN                                    │
 * │  ├─ Reddit, Medium, Dev.to, Hacker News                     │
 * │  ├─ Twitter / X, YouTube                                    │
 * │  ├─ "Top 10" articles, SEO blogs, Personal blogs            │
 * │  └─ Opinion ≠ production truth                              │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * SUGGESTION RULES (HARD):
 * - Max 3 suggestions
 * - Confidence >= 0.8
 * - Default: collapsed
 * - Never auto-apply
 * - Strategist approval required
 * 
 * KNOWLEDGE BOUNDARY:
 * ✅ Stable defaults, deprecations, security facts, vendor best practices
 * ❌ Opinionated trends, community sentiment, experimental tech, forecasts
 */

// ============================================
// TYPES
// ============================================

export type {
  KnowledgeSource,
  SourceType,
  TrustLevel,
  TrendFact,
  KnowledgeCache,
  Suggestion,
  SuggestionCategory,
  ImpactLevel,
  KnowledgeQuery,
  KnowledgeContext,
  ProjectType,
  KnowledgeApplication,
} from './types'

export {
  DEFAULT_CACHE_TTL,
  EMPTY_CACHE,
} from './types'

// ============================================
// APPROVED SOURCES (Tiered)
// ============================================

export {
  // Tier 1: Always Allowed
  TIER1_SOURCES,
  FRAMEWORK_SOURCES,
  PLATFORM_SOURCES,
  INTEGRATION_SOURCES,
  SECURITY_SOURCES,
  // Tier 2: Suggestion Only
  TIER2_SOURCES,
  // Combined
  APPROVED_SOURCES,
  // Forbidden
  FORBIDDEN_SOURCES,
  FORBIDDEN_PATTERNS,
  // Operations
  getSource,
  getSourcesByDomain,
  getSourcesByType,
  getSourcesByTier,
  isApprovedSource,
  isForbiddenSource,
  hasForbiddenReferences,
  validateSourceUrl,
  detectDomains,
} from './sources'

// ============================================
// KNOWLEDGE CHARTER (Boundary Rules)
// ============================================

export {
  // Allowed knowledge types
  STABLE_DEFAULTS,
  // Forbidden knowledge types
  FORBIDDEN_KNOWLEDGE_TYPES,
  // Validation
  isForbiddenKnowledge,
  isAllowedKnowledge,
  // Speech patterns
  CORRECT_SPEECH,
  FORBIDDEN_SPEECH,
  validateSpeech,
  // Experimental opt-in
  EXPERIMENTAL_OPT_IN_PHRASES,
  hasExperimentalOptIn,
} from './charter'

export type {
  DeprecationKnowledge,
  SecurityKnowledge,
  BestPracticeKnowledge,
  ForbiddenKnowledgeType,
} from './charter'

// ============================================
// CACHE
// ============================================

export {
  getCache,
  isCacheStale,
  isDomainCacheStale,
  addFacts,
  getFacts,
  getAllFacts,
  queryFacts,
  markSourceFetched,
  wasSourceFetched,
  clearCache,
  setCacheTTL,
  exportCache,
  importCache,
  getCacheStats,
} from './cache'

// ============================================
// SUMMARIZER
// ============================================

export {
  extractFacts,
  generateSummary,
} from './summarizer'

// ============================================
// VALIDATOR
// ============================================

export type { ValidationResult } from './validator'
export {
  validateFact,
  validateFacts,
  validateSuggestion,
  validateContentSafety,
  validatePolicyCompliance,
} from './validator'

// ============================================
// ADVISOR (Suggestion Generation)
// ============================================

export {
  // Constants
  MAX_SUGGESTIONS,
  MIN_CONFIDENCE,
  // Generation
  generateSuggestions,
  prioritizeSuggestions,
  // Triggers
  shouldShowSuggestions,
  detectProjectType,
  // Actions
  applySuggestion,
  dismissSuggestion,
  formatSuggestionsInline,
} from './advisor'

// ============================================
// LEDGER EVENTS
// ============================================

export type {
  KnowledgeEventType,
  KnowledgeLedgerEvent,
  KnowledgeFetchStartedPayload,
  KnowledgeFetchCompletedPayload,
  FactDetectedPayload,
  SuggestionOfferedPayload,
  SuggestionAcceptedPayload,
  SuggestionDismissedPayload,
} from './ledger-events'

export {
  createFetchStartedEvent,
  createFetchCompletedEvent,
  createFetchFailedEvent,
  createFactDetectedEvent,
  createFactValidatedEvent,
  createFactRejectedEvent,
  createSuggestionOfferedEvent,
  createSuggestionAcceptedEvent,
  createSuggestionRejectedEvent,
  createContextCreatedEvent,
  logKnowledgeEvent,
  getKnowledgeEvents,
  getKnowledgeEventsByType,
  getEventsForSuggestion,
  exportKnowledgeEvents,
} from './ledger-events'

// ============================================
// MAIN WORKFLOW
// ============================================

import type { KnowledgeContext, Suggestion, TrendFact } from './types'
import { queryFacts, addFacts } from './cache'
import { extractFacts, generateSummary } from './summarizer'
import { validateFacts, validatePolicyCompliance } from './validator'
import { 
  generateSuggestions, 
  shouldShowSuggestions,
  MAX_SUGGESTIONS,
} from './advisor'
import { 
  createContextCreatedEvent,
  createFactDetectedEvent,
  createFactValidatedEvent,
  createSuggestionOfferedEvent,
  logKnowledgeEvent,
} from './ledger-events'

/**
 * Process knowledge context and generate suggestions
 * 
 * Returns max 3 suggestions, confidence >= 0.8
 */
export function processKnowledgeContext(
  context: KnowledgeContext
): {
  facts: TrendFact[]
  suggestions: Suggestion[]
  summary: string
  shouldShow: boolean
} {
  // Log context creation
  logKnowledgeEvent(createContextCreatedEvent(context))
  
  // Check if we should show suggestions at all
  const shouldShow = shouldShowSuggestions(context)
  
  // Query relevant facts from cache
  const facts = queryFacts({
    domains: context.relevantDomains,
    minConfidence: 0.8, // Locked threshold
    productionReadyOnly: context.environment === 'production',
  })
  
  // Validate facts for current environment
  const validFacts = facts.filter(fact => {
    const result = validatePolicyCompliance(fact, context.environment)
    return result.valid
  })
  
  // Generate suggestions (max 3)
  let suggestions: Suggestion[] = []
  if (shouldShow) {
    suggestions = generateSuggestions(validFacts, context)
    
    // Log each suggestion offered
    for (const suggestion of suggestions) {
      logKnowledgeEvent(createSuggestionOfferedEvent(suggestion))
    }
  }
  
  // Generate summary
  const summary = generateSummary(validFacts)
  
  return {
    facts: validFacts,
    suggestions,
    summary,
    shouldShow,
  }
}

/**
 * Ingest content from approved source
 */
export function ingestFromSource(
  sourceId: string,
  domain: string,
  content: string,
  publishedAt?: string
): TrendFact[] {
  // Extract facts
  const extracted = extractFacts(sourceId, domain, content, publishedAt)
  
  // Validate
  const { valid, results } = validateFacts(extracted)
  
  // Log each fact
  for (const fact of extracted) {
    logKnowledgeEvent(createFactDetectedEvent(fact))
    const result = results.get(fact.id)
    if (result) {
      logKnowledgeEvent(createFactValidatedEvent(fact.id, result.score, result.warnings))
    }
  }
  
  // Cache valid facts
  addFacts(valid)
  
  return valid
}
