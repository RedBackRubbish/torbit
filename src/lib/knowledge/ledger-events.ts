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

import type { LedgerEntry, LedgerEventType } from '../integrations/ledger'
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
  | 'SUGGESTION_GENERATED'
  | 'SUGGESTION_OFFERED'
  | 'SUGGESTION_APPROVED'
  | 'SUGGESTION_ACCEPTED'
  | 'SUGGESTION_REJECTED'
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

export interface SuggestionGeneratedPayload {
  suggestionId: string
  category: string
  sourceFactIds: string[]
}

export interface SuggestionOfferedPayload {
  suggestionId: string
  title: string
  category: string
  confidence: number
  relevance: string
}

export interface SuggestionApprovedPayload {
  suggestionId: string
  approvedBy: 'strategist'
  rationale: string
}

export interface SuggestionAcceptedPayload {
  suggestionId: string
  acceptedBy: string
  willApply: boolean
}

export interface SuggestionRejectedPayload {
  suggestionId: string
  rejectedBy: string
  reason: string
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
      category: suggestion.category,
      confidence: suggestion.confidence,
      relevance: suggestion.relevance,
    },
  }
}

/**
 * Create suggestion approved event
 */
export function createSuggestionApprovedEvent(
  suggestionId: string,
  rationale: string
): KnowledgeLedgerEvent {
  return {
    id: `sa-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'SUGGESTION_APPROVED',
    category: 'knowledge',
    actor: 'strategist',
    payload: {
      suggestionId,
      approvedBy: 'strategist',
      rationale,
    },
  }
}

/**
 * Create suggestion accepted event
 */
export function createSuggestionAcceptedEvent(
  suggestionId: string,
  acceptedBy: string,
  willApply: boolean
): KnowledgeLedgerEvent {
  return {
    id: `sac-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'SUGGESTION_ACCEPTED',
    category: 'knowledge',
    actor: acceptedBy,
    payload: { suggestionId, acceptedBy, willApply },
  }
}

/**
 * Create suggestion rejected event
 */
export function createSuggestionRejectedEvent(
  suggestionId: string,
  rejectedBy: string,
  reason: string
): KnowledgeLedgerEvent {
  return {
    id: `sr-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'SUGGESTION_REJECTED',
    category: 'knowledge',
    actor: rejectedBy,
    payload: { suggestionId, rejectedBy, reason },
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
