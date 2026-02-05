/**
 * TORBIT - Suggestion Advisor
 * 
 * PRODUCTION DOCTRINE - LOCKED
 * 
 * Torbit never nags.
 * Torbit never auto-adds.
 * Torbit never surprises.
 * 
 * MAX 3 SUGGESTIONS - each with:
 * - Why (1 line)
 * - Impact (Low / Medium / High)
 * - Default state: collapsed
 */

import type { 
  TrendFact, 
  Suggestion, 
  KnowledgeContext,
  SuggestionCategory,
  ImpactLevel,
  ProjectType,
} from './types'
import { isAllowedKnowledge } from './charter'
import { getSource } from './sources'

// ============================================
// CONFIGURATION
// ============================================

/**
 * Maximum suggestions to show (HARD LIMIT)
 */
export const MAX_SUGGESTIONS = 3

/**
 * Minimum confidence to show suggestion
 */
export const MIN_CONFIDENCE = 0.8

// ============================================
// SUGGESTION GENERATION
// ============================================

/**
 * Generate suggestions from trend facts
 * Returns MAX 3 suggestions, confidence >= 0.8
 */
export function generateSuggestions(
  facts: TrendFact[],
  context: KnowledgeContext
): Suggestion[] {
  // Filter facts by confidence
  const qualifiedFacts = facts.filter(f => f.confidence >= MIN_CONFIDENCE)
  
  // Generate candidate suggestions
  const candidates: Suggestion[] = []
  
  for (const fact of qualifiedFacts) {
    const suggestion = factToSuggestion(fact, context)
    if (suggestion && suggestion.confidence >= MIN_CONFIDENCE) {
      candidates.push(suggestion)
    }
  }
  
  // Prioritize and limit to MAX_SUGGESTIONS
  const prioritized = prioritizeSuggestions(candidates, context)
  
  return prioritized.slice(0, MAX_SUGGESTIONS)
}

/**
 * Convert a fact into a suggestion
 */
function factToSuggestion(
  fact: TrendFact,
  context: KnowledgeContext
): Suggestion | null {
  // Validate knowledge is allowed
  if (!isAllowedKnowledge(fact.topic, fact.sourceId)) {
    return null
  }
  
  const category = detectCategory(fact)
  const impact = detectImpact(fact)
  const why = generateWhy(fact, context)
  
  return {
    id: `sug-${fact.id.slice(0, 8)}-${Date.now()}`,
    title: generateTitle(fact, category),
    why,
    impact,
    category,
    confidence: fact.confidence,
    sourceFactIds: [fact.id],
    // CRITICAL: Always optional, never auto-apply
    optional: true,
    accepted: false,
    dismissed: false,
    strategistApproved: false,
  }
}

/**
 * Detect suggestion category from fact
 */
function detectCategory(fact: TrendFact): SuggestionCategory {
  const tags = fact.tags.map(t => t.toLowerCase())
  
  if (tags.includes('security') || tags.includes('vulnerability')) {
    return 'security'
  }
  
  if (tags.includes('version') || tags.includes('release')) {
    return 'framework'
  }
  
  if (tags.includes('deprecation') || tags.includes('breaking-change')) {
    return 'architecture'
  }
  
  if (tags.includes('performance')) {
    return 'performance'
  }
  
  if (fact.domain.includes('payment') || 
      fact.domain.includes('auth') || 
      fact.domain.includes('database') ||
      fact.domain.includes('email') ||
      fact.domain.includes('analytics')) {
    return 'integration'
  }
  
  return 'best-practice'
}

/**
 * Detect impact level
 */
function detectImpact(fact: TrendFact): ImpactLevel {
  // Security = always high
  if (fact.tags.includes('security')) {
    return 'high'
  }
  
  // Breaking changes = high
  if (fact.tags.includes('breaking-change')) {
    return 'high'
  }
  
  // Version updates based on relevance
  if (fact.relevance === 'high') {
    return 'medium'
  }
  
  return 'low'
}

/**
 * Generate "Why" line (1 sentence max)
 */
function generateWhy(fact: TrendFact, context: KnowledgeContext): string {
  const source = getSource(fact.sourceId)
  const sourceName = source?.name || 'Official source'
  
  // Security
  if (fact.tags.includes('security')) {
    return `Security advisory from ${sourceName}.`
  }
  
  // Deprecation
  if (fact.tags.includes('deprecation')) {
    return `Deprecated per ${sourceName}.`
  }
  
  // Project-type specific
  if (context.projectType) {
    return `Common for ${formatProjectType(context.projectType)} apps.`
  }
  
  // Default
  return `Recommended by ${sourceName}.`
}

function formatProjectType(type: ProjectType): string {
  const names: Record<ProjectType, string> = {
    'saas': 'SaaS',
    'mobile-app': 'mobile',
    'api': 'API',
    'landing': 'landing page',
    'ecommerce': 'e-commerce',
    'dashboard': 'dashboard',
  }
  return names[type] || type
}

/**
 * Generate suggestion title
 */
function generateTitle(fact: TrendFact, category: SuggestionCategory): string {
  // Keep it short - no emojis in title
  switch (category) {
    case 'security':
      return fact.topic
    case 'integration':
      return `Add ${fact.domain}`
    case 'framework':
      return fact.topic
    default:
      return fact.topic.slice(0, 50)
  }
}

// ============================================
// SUGGESTION PRIORITIZATION
// ============================================

/**
 * Prioritize suggestions
 */
export function prioritizeSuggestions(
  suggestions: Suggestion[],
  context: KnowledgeContext
): Suggestion[] {
  return [...suggestions].sort((a, b) => {
    // Security always first
    if (a.category === 'security' && b.category !== 'security') return -1
    if (b.category === 'security' && a.category !== 'security') return 1
    
    // Then by impact
    const impactOrder: Record<ImpactLevel, number> = { high: 0, medium: 1, low: 2 }
    const impactDiff = impactOrder[a.impact] - impactOrder[b.impact]
    if (impactDiff !== 0) return impactDiff
    
    // Then by confidence
    return b.confidence - a.confidence
  })
}

// ============================================
// SUGGESTION TRIGGERS
// Only show if conditions met
// ============================================

/**
 * Check if suggestions should appear
 */
export function shouldShowSuggestions(context: KnowledgeContext): boolean {
  // Must have detected project type
  if (!context.projectType) {
    return false
  }
  
  // Must have relevant domains
  if (context.relevantDomains.length === 0) {
    return false
  }
  
  // Production environment = more restrictive
  if (context.environment === 'production') {
    // Only security suggestions in production
    return false
  }
  
  return true
}

/**
 * Detect project type from intent
 */
export function detectProjectType(intent: string): ProjectType | undefined {
  const lower = intent.toLowerCase()
  
  if (lower.includes('saas') || lower.includes('subscription') || lower.includes('dashboard with auth')) {
    return 'saas'
  }
  
  if (lower.includes('mobile') || lower.includes('ios') || lower.includes('android') || lower.includes('app store')) {
    return 'mobile-app'
  }
  
  if (lower.includes('api') || lower.includes('backend') || lower.includes('rest') || lower.includes('graphql')) {
    return 'api'
  }
  
  if (lower.includes('landing') || lower.includes('marketing') || lower.includes('homepage')) {
    return 'landing'
  }
  
  if (lower.includes('ecommerce') || lower.includes('e-commerce') || lower.includes('shop') || lower.includes('store')) {
    return 'ecommerce'
  }
  
  if (lower.includes('dashboard') || lower.includes('admin') || lower.includes('analytics')) {
    return 'dashboard'
  }
  
  return undefined
}

// ============================================
// SUGGESTION ACTIONS
// ============================================

/**
 * Apply suggestion (triggers integration flow)
 * Manifest → Governance → Consent
 */
export function applySuggestion(suggestion: Suggestion): {
  success: boolean
  nextStep: 'strategist-review' | 'consent' | 'apply'
} {
  // Must be approved by strategist first
  if (!suggestion.strategistApproved) {
    return {
      success: false,
      nextStep: 'strategist-review',
    }
  }
  
  // Then needs user consent (via integration manifest flow)
  return {
    success: true,
    nextStep: 'consent',
  }
}

/**
 * Dismiss suggestion (logged once, never shown again for this project)
 */
export function dismissSuggestion(suggestion: Suggestion): Suggestion {
  return {
    ...suggestion,
    dismissed: true,
  }
}

/**
 * Format suggestions for inline display
 */
export function formatSuggestionsInline(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) {
    return ''
  }
  
  const lines: string[] = []
  lines.push('Suggestions (optional):')
  
  for (const s of suggestions.slice(0, MAX_SUGGESTIONS)) {
    const impactBadge = s.impact === 'high' ? '⚠️' : s.impact === 'medium' ? '•' : '○'
    lines.push(`${impactBadge} ${s.title} (${s.why})`)
  }
  
  lines.push('[Apply] [Dismiss]')
  
  return lines.join('\n')
}
