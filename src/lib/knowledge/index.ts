/**
 * TORBIT - Knowledge System
 * 
 * Governed Knowledge Awareness Layer
 * 
 * "Torbit may sense the world. Torbit may not blindly react to it."
 * 
 * Core Principles:
 * ────────────────
 * 1. APPROVED SOURCES ONLY
 *    - Framework changelogs (Next.js, React, Expo)
 *    - Official documentation (Stripe, Supabase, Clerk)
 *    - Release feeds (GitHub releases, RFCs)
 *    - Curated blogs (Vercel, React, AWS)
 *    - Security advisories (CVE, npm advisories)
 *    - NO Reddit, Medium, random SEO blogs, Twitter
 * 
 * 2. CONDITIONAL FETCHING
 *    - Before planning, not during execution
 *    - Time-bound cache (24hr default)
 *    - Read-only, does not alter code
 * 
 * 3. TREND EXTRACTION, NOT ADOPTION
 *    - Produces facts, not decisions
 *    - Confidence scores on all facts
 *    - Relevance assessed per context
 * 
 * 4. GOVERNANCE CHECK BEFORE USE
 *    - Facts validated before caching
 *    - Suggestions validated before offering
 *    - Strategist approves before application
 *    - Environment & policy restrictions honored
 * 
 * 5. SUGGESTIONS NEVER AUTO-APPLY
 *    - optional: true (always)
 *    - accepted: false (until explicit)
 *    - strategistApproved: required for application
 * 
 * 6. EVERYTHING LOGGED
 *    - KNOWLEDGE_FETCH events
 *    - FACT_DETECTED, FACT_VALIDATED events
 *    - SUGGESTION_OFFERED, SUGGESTION_ACCEPTED events
 *    - Full audit trail for compliance
 */

// Types
export type {
  KnowledgeSource,
  SourceType,
  TrustLevel,
  TrendFact,
  KnowledgeCache,
  Suggestion,
  SuggestionCategory,
  KnowledgeQuery,
  KnowledgeContext,
  KnowledgeApplication,
} from './types'

// Approved Sources Registry
export {
  APPROVED_SOURCES,
  FRAMEWORK_SOURCES,
  DOCUMENTATION_SOURCES,
  BLOG_SOURCES,
  ADVISORY_SOURCES,
  getSource,
  getSourcesByDomain,
  getSourcesByType,
  isApprovedSource,
  detectDomains,
} from './sources'

// Time-Bound Cache
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

// Trend Summarizer
export {
  extractFacts,
  generateSummary,
} from './summarizer'

// Validator
export type { ValidationResult } from './validator'
export {
  validateFact,
  validateFacts,
  validateSuggestion,
  validateContentSafety,
  validatePolicyCompliance,
} from './validator'

// Suggestion Advisor
export {
  generateSuggestions,
  prioritizeSuggestions,
  filterForEnvironment,
  formatSuggestions,
  approveSuggestion,
  acceptSuggestion,
  rejectSuggestion,
} from './advisor'

// Ledger Events
export type {
  KnowledgeEventType,
  KnowledgeLedgerEvent,
  KnowledgeFetchStartedPayload,
  KnowledgeFetchCompletedPayload,
  FactDetectedPayload,
  SuggestionOfferedPayload,
  SuggestionApprovedPayload,
  SuggestionAcceptedPayload,
  SuggestionRejectedPayload,
} from './ledger-events'

export {
  createFetchStartedEvent,
  createFetchCompletedEvent,
  createFetchFailedEvent,
  createFactDetectedEvent,
  createFactValidatedEvent,
  createFactRejectedEvent,
  createSuggestionOfferedEvent,
  createSuggestionApprovedEvent,
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
// KNOWLEDGE WORKFLOW
// ============================================

import type { KnowledgeContext, Suggestion, TrendFact } from './types'
import { queryFacts, addFacts } from './cache'
import { extractFacts, generateSummary } from './summarizer'
import { validateFacts, validatePolicyCompliance } from './validator'
import { generateSuggestions, filterForEnvironment, prioritizeSuggestions } from './advisor'
import { 
  createContextCreatedEvent,
  createFactDetectedEvent,
  createFactValidatedEvent,
  createSuggestionOfferedEvent,
  logKnowledgeEvent,
} from './ledger-events'

/**
 * Main knowledge workflow
 * 
 * 1. Create context from user intent
 * 2. Query cached facts for relevant domains
 * 3. Generate suggestions
 * 4. Filter for environment
 * 5. Return prioritized suggestions
 */
export function processKnowledgeContext(
  context: KnowledgeContext
): {
  facts: TrendFact[]
  suggestions: Suggestion[]
  summary: string
} {
  // Log context creation
  logKnowledgeEvent(createContextCreatedEvent(context))
  
  // Query relevant facts from cache
  const facts = queryFacts({
    domains: context.relevantDomains,
    minConfidence: context.environment === 'production' ? 0.85 : 0.5,
    productionReadyOnly: context.environment === 'production',
  })
  
  // Validate facts for current environment
  const validFacts = facts.filter(fact => {
    const result = validatePolicyCompliance(fact, context.environment)
    return result.valid
  })
  
  // Generate suggestions
  let suggestions = generateSuggestions(validFacts, context)
  
  // Filter for environment
  suggestions = filterForEnvironment(suggestions, context.environment)
  
  // Prioritize
  suggestions = prioritizeSuggestions(suggestions, context)
  
  // Log suggestions offered
  for (const suggestion of suggestions) {
    logKnowledgeEvent(createSuggestionOfferedEvent(suggestion))
  }
  
  // Generate summary
  const summary = generateSummary(validFacts)
  
  return {
    facts: validFacts,
    suggestions,
    summary,
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
