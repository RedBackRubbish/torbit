/**
 * TORBIT - Knowledge Ledger Events
 * 
 * Every knowledge operation logged.
 * Creates audit trail for:
 * - What trends were sensed
 * - What suggestions were offered
 * - What was accepted/rejected
 * - Why decisions were made
 */

import type { TrendFact, Suggestion, KnowledgeContext } from './types'

// ============================================
// KNOWLEDGE EVENT TYPES
// ============================================

// Extend base event types with knowledge-specific events
export type KnowledgeEventType = 
  | 'KNOWLEDGE_FETCH_STARTED'
  | 'KNOWLEDGE_FETCH_COMPLETED'
  | 'KNOWLEDGE_FETCH_FAILED'
  | 'FACT_DETECTED'
  | 'FACT_VALIDATED'
  | 'FACT_REJECTED'
  | 'FACT_CACHED'
  | 'SUGGESTION_OFFERED'      // User sees suggestion
  | 'SUGGESTION_ACCEPTED'     // User clicked Apply
  | 'SUGGESTION_DISMISSED'    // User clicked Dismiss (logged once, never shown again)
  | 'KNOWLEDGE_CACHE_CLEARED'
  | 'KNOWLEDGE_CONTEXT_CREATED'

// ============================================
// EVENT PAYLOADS
// ============================================

export interface KnowledgeFetchStartedPayload {
  sourceId: string
  sourceName: string
  domains: string[]
}

export interface KnowledgeFetchCompletedPayload {
  sourceId: string
  factsDetected: number
  factsValid: number
  duration: number
}

export interface KnowledgeFetchFailedPayload {
  sourceId: string
  error: string
  willRetry: boolean
}

export interface FactDetectedPayload {
  factId: string
  sourceId: string
  domain: string
  topic: string
  confidence: number
}

export interface FactValidatedPayload {
  factId: string
  score: number
  warnings: string[]
}

export interface FactRejectedPayload {
  factId: string
  reasons: string[]
}

export interface FactCachedPayload {
  factId: string
  ttl: number
  cacheSize: number
}

export interface SuggestionOfferedPayload {
  suggestionId: string
  title: string
  why: string
  impact: 'low' | 'medium' | 'high'
  category: string
  confidence: number
}

export interface SuggestionAcceptedPayload {
  suggestionId: string
  title: string
  triggeredFlow: 'strategist-review' | 'consent' | 'apply'
}

export interface SuggestionDismissedPayload {
  suggestionId: string
  title: string
  // Logged once, never shown again for this project
  permanent: true
}

export interface KnowledgeCacheClearedPayload {
  previousSize: number
  clearedDomains: string[]
}

export interface KnowledgeContextCreatedPayload {
  contextId: string
  intent: string
  domains: string[]
  environment: string
}

// ============================================
// EVENT CREATION
// ============================================

/**
 * Create knowledge fetch started event
 */
export function createFetchStartedEvent(
  sourceId: string,
  sourceName: string,
  domains: string[]
): KnowledgeLedgerEvent {
  return {
    id: `kf-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'KNOWLEDGE_FETCH_STARTED',
    category: 'knowledge',
    actor: 'system',
    payload: { sourceId, sourceName, domains },
  }
}

/**
 * Create knowledge fetch completed event
 */
export function createFetchCompletedEvent(
  sourceId: string,
  factsDetected: number,
  factsValid: number,
  duration: number
): KnowledgeLedgerEvent {
  return {
    id: `kc-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'KNOWLEDGE_FETCH_COMPLETED',
    category: 'knowledge',
    actor: 'system',
    payload: { sourceId, factsDetected, factsValid, duration },
  }
}

/**
 * Create knowledge fetch failed event
 */
export function createFetchFailedEvent(
  sourceId: string,
  error: string,
  willRetry: boolean = false
): KnowledgeLedgerEvent {
  return {
    id: `kff-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'KNOWLEDGE_FETCH_FAILED',
    category: 'knowledge',
    actor: 'system',
    payload: { sourceId, error, willRetry },
  }
}

/**
 * Create fact detected event
 */
export function createFactDetectedEvent(fact: TrendFact): KnowledgeLedgerEvent {
  return {
    id: `fd-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'FACT_DETECTED',
    category: 'knowledge',
    actor: 'system',
    payload: {
      factId: fact.id,
      sourceId: fact.sourceId,
      domain: fact.domain,
      topic: fact.topic,
      confidence: fact.confidence,
    },
  }
}

/**
 * Create fact validated event
 */
export function createFactValidatedEvent(
  factId: string,
  score: number,
  warnings: string[]
): KnowledgeLedgerEvent {
  return {
    id: `fv-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'FACT_VALIDATED',
    category: 'knowledge',
    actor: 'system',
    payload: { factId, score, warnings },
  }
}

/**
 * Create fact rejected event
 */
export function createFactRejectedEvent(
  factId: string,
  reasons: string[]
): KnowledgeLedgerEvent {
  return {
    id: `fr-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'FACT_REJECTED',
    category: 'knowledge',
    actor: 'system',
    payload: { factId, reasons },
  }
}

/**
 * Create suggestion offered event
 */
export function createSuggestionOfferedEvent(
  suggestion: Suggestion
): KnowledgeLedgerEvent {
  return {
    id: `so-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'SUGGESTION_OFFERED',
    category: 'knowledge',
    actor: 'system',
    payload: {
      suggestionId: suggestion.id,
      title: suggestion.title,
      why: suggestion.why,
      impact: suggestion.impact,
      category: suggestion.category,
      confidence: suggestion.confidence,
    },
  }
}

/**
 * Create suggestion accepted event (user clicked Apply)
 */
export function createSuggestionAcceptedEvent(
  suggestionId: string,
  title: string,
  triggeredFlow: 'strategist-review' | 'consent' | 'apply'
): KnowledgeLedgerEvent {
  return {
    id: `sac-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'SUGGESTION_ACCEPTED',
    category: 'knowledge',
    actor: 'user',
    payload: { suggestionId, title, triggeredFlow },
  }
}

/**
 * Create suggestion dismissed event (logged once, never shown again)
 */
export function createSuggestionDismissedEvent(
  suggestionId: string,
  title: string
): KnowledgeLedgerEvent {
  return {
    id: `sd-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'SUGGESTION_DISMISSED',
    category: 'knowledge',
    actor: 'user',
    payload: { suggestionId, title, permanent: true },
  }
}

/**
 * Create context created event
 */
export function createContextCreatedEvent(
  context: KnowledgeContext
): KnowledgeLedgerEvent {
  return {
    id: `kcc-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'KNOWLEDGE_CONTEXT_CREATED',
    category: 'knowledge',
    actor: 'system',
    payload: {
      contextId: `ctx-${Date.now()}`,
      intent: context.intent,
      domains: context.relevantDomains,
      environment: context.environment,
    },
  }
}

// ============================================
// LEDGER EVENT TYPE
// ============================================

export interface KnowledgeLedgerEvent {
  id: string
  timestamp: string
  eventType: KnowledgeEventType
  category: 'knowledge'
  actor: string
  payload: Record<string, unknown>
}

// ============================================
// EVENT LOG (in-memory for now)
// ============================================

const knowledgeEvents: KnowledgeLedgerEvent[] = []

/**
 * Log a knowledge event
 */
export function logKnowledgeEvent(event: KnowledgeLedgerEvent): void {
  knowledgeEvents.push(event)
}

/**
 * Get all knowledge events
 */
export function getKnowledgeEvents(): KnowledgeLedgerEvent[] {
  return [...knowledgeEvents]
}

/**
 * Get events by type
 */
export function getKnowledgeEventsByType(
  eventType: KnowledgeEventType
): KnowledgeLedgerEvent[] {
  return knowledgeEvents.filter(e => e.eventType === eventType)
}

/**
 * Get events for a suggestion
 */
export function getEventsForSuggestion(
  suggestionId: string
): KnowledgeLedgerEvent[] {
  return knowledgeEvents.filter(e => 
    (e.payload as any).suggestionId === suggestionId
  )
}

/**
 * Export knowledge events for compliance
 */
export function exportKnowledgeEvents(): string {
  return JSON.stringify(knowledgeEvents, null, 2)
}
