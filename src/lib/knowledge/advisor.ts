/**
 * TORBIT - Suggestion Advisor
 * 
 * Produces CONTEXTUAL, OPTIONAL suggestions.
 * 
 * Critical constraints:
 * - Suggestions NEVER auto-apply
 * - All suggestions are optional: true
 * - Strategist must approve before application
 * - Respects environment & policy
 * - All suggestions logged to ledger
 */

import type { 
  TrendFact, 
  Suggestion, 
  KnowledgeContext,
  SuggestionCategory 
} from './types'
import { validateSuggestion } from './validator'

// ============================================
// SUGGESTION GENERATION
// ============================================

/**
 * Generate suggestions from trend facts
 */
export function generateSuggestions(
  facts: TrendFact[],
  context: KnowledgeContext
): Suggestion[] {
  const suggestions: Suggestion[] = []
  
  // Generate from high-relevance facts first
  const sortedFacts = [...facts].sort((a, b) => {
    const relevanceOrder = { high: 0, medium: 1, low: 2 }
    return relevanceOrder[a.relevance] - relevanceOrder[b.relevance]
  })
  
  for (const fact of sortedFacts) {
    const suggestion = factToSuggestion(fact, context)
    if (suggestion) {
      const validation = validateSuggestion(suggestion, context)
      if (validation.valid) {
        suggestions.push(suggestion)
      }
    }
  }
  
  // Limit suggestions to prevent overwhelm
  return suggestions.slice(0, 5)
}

/**
 * Convert a fact into a suggestion
 */
function factToSuggestion(
  fact: TrendFact,
  context: KnowledgeContext
): Suggestion | null {
  const category = detectCategory(fact)
  if (!category) return null
  
  const suggestion: Suggestion = {
    id: `suggestion-${fact.id}-${Date.now()}`,
    title: generateTitle(fact, category),
    description: fact.description,
    rationale: generateRationale(fact, context),
    category,
    relevance: fact.relevance,
    confidence: fact.confidence,
    sourceFactIds: [fact.id],
    // CRITICAL: Always optional, never pre-accepted
    optional: true,
    accepted: false,
    strategistApproved: false,
  }
  
  return suggestion
}

/**
 * Detect suggestion category from fact
 */
function detectCategory(fact: TrendFact): SuggestionCategory | null {
  const tags = fact.tags.map(t => t.toLowerCase())
  const topic = fact.topic.toLowerCase()
  
  if (tags.includes('security') || tags.includes('vulnerability')) {
    return 'security'
  }
  
  if (tags.includes('version') || tags.includes('release')) {
    return 'framework'
  }
  
  if (tags.includes('deprecation') || tags.includes('breaking-change')) {
    return 'architecture'
  }
  
  if (tags.includes('performance') || topic.includes('performance')) {
    return 'performance'
  }
  
  if (tags.includes('best-practice') || tags.includes('recommendation')) {
    return 'best-practice'
  }
  
  if (fact.domain.includes('payment') || 
      fact.domain.includes('auth') || 
      fact.domain.includes('database')) {
    return 'integration'
  }
  
  return 'best-practice' // Default
}

/**
 * Generate a user-friendly title
 */
function generateTitle(fact: TrendFact, category: SuggestionCategory): string {
  const prefix = {
    security: '🔐 Security:',
    framework: '📦 Update:',
    architecture: '🏗️ Architecture:',
    performance: '⚡ Performance:',
    'best-practice': '✨ Best Practice:',
    integration: '🔌 Integration:',
  }
  
  return `${prefix[category]} ${fact.topic}`
}

/**
 * Generate rationale explaining why this is suggested
 */
function generateRationale(fact: TrendFact, context: KnowledgeContext): string {
  const lines = []
  
  // Explain source
  lines.push(`Detected from ${fact.sourceId}.`)
  
  // Explain relevance
  if (fact.relevance === 'high') {
    lines.push(`This has high relevance to your current work.`)
  }
  
  // Explain confidence
  lines.push(`Confidence: ${Math.round(fact.confidence * 100)}%.`)
  
  // Add implications
  if (fact.implications && fact.implications.length > 0) {
    lines.push(`Consider: ${fact.implications[0]}`)
  }
  
  // Add production-readiness note
  if (!fact.productionReady) {
    lines.push(`⚠️ Not yet production-ready.`)
  }
  
  return lines.join(' ')
}

// ============================================
// SUGGESTION PRIORITIZATION
// ============================================

/**
 * Prioritize suggestions based on context
 */
export function prioritizeSuggestions(
  suggestions: Suggestion[],
  context: KnowledgeContext
): Suggestion[] {
  return [...suggestions].sort((a, b) => {
    // Security always first
    if (a.category === 'security' && b.category !== 'security') return -1
    if (b.category === 'security' && a.category !== 'security') return 1
    
    // Then by relevance
    const relevanceOrder = { high: 0, medium: 1, low: 2 }
    const relevanceDiff = relevanceOrder[a.relevance] - relevanceOrder[b.relevance]
    if (relevanceDiff !== 0) return relevanceDiff
    
    // Then by confidence
    return b.confidence - a.confidence
  })
}

// ============================================
// SUGGESTION FILTERING
// ============================================

/**
 * Filter suggestions for current environment
 */
export function filterForEnvironment(
  suggestions: Suggestion[],
  environment: 'local' | 'staging' | 'production'
): Suggestion[] {
  if (environment === 'production') {
    // Production: only security and high-confidence
    return suggestions.filter(s => 
      s.category === 'security' || 
      (s.confidence >= 0.85 && s.relevance === 'high')
    )
  }
  
  if (environment === 'staging') {
    // Staging: security + high relevance
    return suggestions.filter(s => 
      s.category === 'security' || s.relevance !== 'low'
    )
  }
  
  // Local: all suggestions
  return suggestions
}

// ============================================
// SUGGESTION FORMATTING
// ============================================

/**
 * Format suggestions for display
 */
export function formatSuggestions(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) {
    return 'No suggestions available.'
  }
  
  const lines = ['───────────────────────────────────']
  lines.push('📋 CONTEXTUAL SUGGESTIONS')
  lines.push('   (All suggestions are optional)')
  lines.push('───────────────────────────────────')
  
  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i]
    lines.push('')
    lines.push(`[${i + 1}] ${s.title}`)
    lines.push(`    ${s.description}`)
    lines.push(`    → ${s.rationale}`)
    
    if (!s.strategistApproved) {
      lines.push(`    ⏳ Pending strategist review`)
    }
  }
  
  lines.push('')
  lines.push('───────────────────────────────────')
  lines.push('💡 To apply: Request strategist approval')
  lines.push('───────────────────────────────────')
  
  return lines.join('\n')
}

// ============================================
// SUGGESTION STATE
// ============================================

/**
 * Mark suggestion as approved by strategist
 */
export function approveSuggestion(suggestion: Suggestion): Suggestion {
  return {
    ...suggestion,
    strategistApproved: true,
    // Still not accepted - user must explicitly accept
    accepted: false,
  }
}

/**
 * Accept suggestion (after strategist approval)
 */
export function acceptSuggestion(suggestion: Suggestion): Suggestion {
  if (!suggestion.strategistApproved) {
    throw new Error('Cannot accept suggestion without strategist approval')
  }
  
  return {
    ...suggestion,
    accepted: true,
  }
}

/**
 * Reject suggestion
 */
export function rejectSuggestion(
  suggestion: Suggestion,
  reason: string
): Suggestion & { rejectionReason: string } {
  return {
    ...suggestion,
    accepted: false,
    rejectionReason: reason,
  }
}
