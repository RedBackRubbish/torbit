/**
 * TORBIT - Knowledge Validator
 * 
 * Checks relevance, safety, policy compliance BEFORE use.
 * Gateway between sensing and suggesting.
 * 
 * A fact MUST pass validation before it can be:
 * - Stored in cache
 * - Used to generate suggestions
 * - Shown to user
 */

import type { TrendFact, Suggestion, KnowledgeContext } from './types'
import { getSource, isApprovedSource } from './sources'

// ============================================
// VALIDATION RESULTS
// ============================================

export interface ValidationResult {
  valid: boolean
  reasons: string[]
  warnings: string[]
  score: number // 0-1
}

// ============================================
// FACT VALIDATION
// ============================================

/**
 * Validate a trend fact before caching
 */
export function validateFact(fact: TrendFact): ValidationResult {
  const reasons: string[] = []
  const warnings: string[] = []
  let score = 1.0
  
  // Check source is approved
  if (!isApprovedSource(fact.sourceId)) {
    reasons.push(`Source ${fact.sourceId} is not in approved list`)
    score = 0
  }
  
  // Check confidence threshold
  if (fact.confidence < 0.5) {
    reasons.push(`Confidence ${fact.confidence} below minimum threshold 0.5`)
    score *= 0.5
  }
  
  // Check fact freshness (warn if older than 30 days)
  const factAge = Date.now() - new Date(fact.detectedAt).getTime()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  if (factAge > thirtyDays) {
    warnings.push('Fact is older than 30 days')
    score *= 0.8
  }
  
  // Check for required fields
  if (!fact.topic || fact.topic.length < 5) {
    reasons.push('Topic is missing or too short')
    score = 0
  }
  
  if (!fact.domain) {
    reasons.push('Domain is required')
    score = 0
  }
  
  // Check for spam patterns
  if (hasSpamPatterns(fact.description)) {
    reasons.push('Content contains spam patterns')
    score = 0
  }
  
  return {
    valid: reasons.length === 0 && score >= 0.5,
    reasons,
    warnings,
    score,
  }
}

/**
 * Validate multiple facts
 */
export function validateFacts(facts: TrendFact[]): {
  valid: TrendFact[]
  invalid: TrendFact[]
  results: Map<string, ValidationResult>
} {
  const valid: TrendFact[] = []
  const invalid: TrendFact[] = []
  const results = new Map<string, ValidationResult>()
  
  for (const fact of facts) {
    const result = validateFact(fact)
    results.set(fact.id, result)
    
    if (result.valid) {
      valid.push(fact)
    } else {
      invalid.push(fact)
    }
  }
  
  return { valid, invalid, results }
}

// ============================================
// SUGGESTION VALIDATION
// ============================================

/**
 * Validate a suggestion before offering
 */
export function validateSuggestion(
  suggestion: Suggestion,
  context: KnowledgeContext
): ValidationResult {
  const reasons: string[] = []
  const warnings: string[] = []
  let score = 1.0
  
  // CRITICAL: Suggestions must NEVER be auto-accepted
  if (suggestion.accepted) {
    reasons.push('Suggestions cannot be pre-accepted')
    score = 0
  }
  
  // Check confidence threshold
  if (suggestion.confidence < 0.6) {
    reasons.push(`Confidence ${suggestion.confidence} below suggestion threshold 0.6`)
    score *= 0.5
  }
  
  // Check relevance for current context
  const contextValid = validateContextRelevance(suggestion, context)
  if (!contextValid.valid) {
    reasons.push(...contextValid.reasons)
    score *= 0.3
  }
  
  // Check source facts exist
  if (suggestion.sourceFactIds.length === 0) {
    reasons.push('Suggestion must reference source facts')
    score = 0
  }
  
  // Warn if optional flag not set
  if (!suggestion.optional) {
    warnings.push('All suggestions should be optional')
    suggestion.optional = true // Force optional
  }
  
  // Check rationale quality (using 'why' field)
  if (!suggestion.why || suggestion.why.length < 20) {
    reasons.push('Suggestion must have meaningful rationale')
    score *= 0.5
  }
  
  return {
    valid: reasons.length === 0 && score >= 0.5,
    reasons,
    warnings,
    score,
  }
}

// ============================================
// CONTEXT VALIDATION
// ============================================

function validateContextRelevance(
  suggestion: Suggestion,
  context: KnowledgeContext
): ValidationResult {
  const reasons: string[] = []
  const warnings: string[] = []
  let score = 1.0
  
  // Check domain match
  const suggestionDomains = new Set(
    suggestion.category === 'framework' ? ['nextjs', 'react', 'expo'] :
    suggestion.category === 'security' ? ['security'] :
    suggestion.category === 'integration' ? ['payments', 'auth', 'database'] :
    []
  )
  
  const hasOverlap = context.relevantDomains.some(d => suggestionDomains.has(d))
  if (!hasOverlap && suggestionDomains.size > 0) {
    warnings.push('Suggestion may not be relevant to current context')
    score *= 0.7
  }
  
  // Check intent alignment
  const intentKeywords = context.intent.toLowerCase()
  const suggestionKeywords = suggestion.title.toLowerCase()
  
  // Very rough alignment check
  const intentWords = intentKeywords.split(/\s+/)
  const suggestionWords = suggestionKeywords.split(/\s+/)
  const overlap = intentWords.filter(w => suggestionWords.includes(w)).length
  
  if (overlap === 0) {
    warnings.push('Suggestion may not align with current intent')
    score *= 0.8
  }
  
  return {
    valid: reasons.length === 0,
    reasons,
    warnings,
    score,
  }
}

// ============================================
// SECURITY VALIDATION
// ============================================

/**
 * Check if content has spam or malicious patterns
 */
function hasSpamPatterns(content: string): boolean {
  const spamPatterns = [
    /buy\s+now/i,
    /click\s+here/i,
    /limited\s+time/i,
    /act\s+fast/i,
    /discount\s+code/i,
    /free\s+trial/i,
    /subscribe\s+to\s+newsletter/i,
    /promotional/i,
  ]
  
  return spamPatterns.some(pattern => pattern.test(content))
}

/**
 * Validate content doesn't contain code injection
 */
export function validateContentSafety(content: string): ValidationResult {
  const reasons: string[] = []
  const warnings: string[] = []
  let score = 1.0
  
  // Check for suspicious patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /eval\s*\(/i,
    /Function\s*\(/i,
    /document\.(cookie|write)/i,
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      reasons.push('Content contains potentially dangerous code patterns')
      score = 0
      break
    }
  }
  
  // Check for excessive URLs
  const urlCount = (content.match(/https?:\/\//g) || []).length
  if (urlCount > 10) {
    warnings.push('Content contains many URLs')
    score *= 0.8
  }
  
  return {
    valid: reasons.length === 0,
    reasons,
    warnings,
    score,
  }
}

// ============================================
// POLICY COMPLIANCE
// ============================================

/**
 * Check if fact can be used given current environment/policy
 */
export function validatePolicyCompliance(
  fact: TrendFact,
  environment: 'local' | 'staging' | 'production'
): ValidationResult {
  const reasons: string[] = []
  const warnings: string[] = []
  let score = 1.0
  
  // In production, only high-confidence facts
  if (environment === 'production') {
    if (fact.confidence < 0.85) {
      reasons.push('Production environment requires confidence >= 0.85')
      score = 0
    }
    
    if (!fact.productionReady) {
      reasons.push('Fact is not marked production-ready')
      score = 0
    }
    
    if (fact.relevance === 'low') {
      warnings.push('Low relevance facts discouraged in production')
      score *= 0.5
    }
  }
  
  // In staging, warn on non-production-ready
  if (environment === 'staging') {
    if (!fact.productionReady) {
      warnings.push('Fact is not production-ready, use with caution')
      score *= 0.7
    }
  }
  
  // Local environment: more permissive
  // No additional restrictions
  
  return {
    valid: reasons.length === 0 && score >= 0.5,
    reasons,
    warnings,
    score,
  }
}
