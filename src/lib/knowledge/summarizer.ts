/**
 * TORBIT - Trend Summarizer
 * 
 * Extracts facts from fetched content.
 * Produces facts, NOT decisions.
 * 
 * Output format:
 * - timestamp
 * - source
 * - confidence score
 */

import type { TrendFact } from './types'

// ============================================
// FACT EXTRACTION
// ============================================

/**
 * Extract trend facts from raw content
 */
export function extractFacts(
  sourceId: string,
  domain: string,
  content: string,
  publishedAt?: string
): TrendFact[] {
  const facts: TrendFact[] = []
  const now = new Date().toISOString()
  
  // Extract version announcements
  const versionFacts = extractVersionFacts(sourceId, domain, content, now, publishedAt)
  facts.push(...versionFacts)
  
  // Extract deprecation notices
  const deprecationFacts = extractDeprecationFacts(sourceId, domain, content, now, publishedAt)
  facts.push(...deprecationFacts)
  
  // Extract breaking changes
  const breakingFacts = extractBreakingChangeFacts(sourceId, domain, content, now, publishedAt)
  facts.push(...breakingFacts)
  
  // Extract best practice updates
  const practiceFacts = extractBestPracticeFacts(sourceId, domain, content, now, publishedAt)
  facts.push(...practiceFacts)
  
  // Extract security advisories
  const securityFacts = extractSecurityFacts(sourceId, domain, content, now, publishedAt)
  facts.push(...securityFacts)
  
  return facts
}

// ============================================
// VERSION EXTRACTION
// ============================================

function extractVersionFacts(
  sourceId: string,
  domain: string,
  content: string,
  detectedAt: string,
  publishedAt?: string
): TrendFact[] {
  const facts: TrendFact[] = []
  
  // Common version patterns
  const versionPatterns = [
    /(?:version|v)\s*(\d+\.\d+(?:\.\d+)?)\s+(?:is\s+)?(?:now\s+)?(?:available|released|stable)/gi,
    /released?\s+(?:version\s+)?v?(\d+\.\d+(?:\.\d+)?)/gi,
    /(\d+\.\d+(?:\.\d+)?)\s+release/gi,
  ]
  
  for (const pattern of versionPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const version = match[1]
      
      facts.push({
        id: `${sourceId}-version-${version}-${Date.now()}`,
        sourceId,
        domain,
        topic: `Version ${version} released`,
        description: `${domain} version ${version} has been released.`,
        confidence: 0.9,
        relevance: 'high',
        productionReady: !version.includes('alpha') && !version.includes('beta') && !version.includes('rc'),
        detectedAt,
        publishedAt,
        tags: ['version', 'release', domain],
        implications: [`Consider updating to ${domain} ${version}`],
      })
    }
  }
  
  return facts
}

// ============================================
// DEPRECATION EXTRACTION
// ============================================

function extractDeprecationFacts(
  sourceId: string,
  domain: string,
  content: string,
  detectedAt: string,
  publishedAt?: string
): TrendFact[] {
  const facts: TrendFact[] = []
  
  const deprecationPatterns = [
    /deprecated?\s*:?\s*([^.]+)/gi,
    /(\w+)\s+(?:is|has been)\s+deprecated/gi,
    /will\s+be\s+removed\s+in\s+([^.]+)/gi,
  ]
  
  for (const pattern of deprecationPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const item = match[1].trim()
      if (item.length < 100) { // Sanity check
        facts.push({
          id: `${sourceId}-deprecation-${item.slice(0, 20)}-${Date.now()}`,
          sourceId,
          domain,
          topic: `Deprecation: ${item}`,
          description: `${item} has been deprecated in ${domain}.`,
          confidence: 0.8,
          relevance: 'high',
          productionReady: true,
          detectedAt,
          publishedAt,
          tags: ['deprecation', 'migration', domain],
          implications: ['Review usage and plan migration', 'Check for alternatives'],
        })
      }
    }
  }
  
  return facts
}

// ============================================
// BREAKING CHANGE EXTRACTION
// ============================================

function extractBreakingChangeFacts(
  sourceId: string,
  domain: string,
  content: string,
  detectedAt: string,
  publishedAt?: string
): TrendFact[] {
  const facts: TrendFact[] = []
  
  const breakingPatterns = [
    /breaking\s+change\s*:?\s*([^.]+)/gi,
    /\*\*breaking\*\*\s*:?\s*([^.]+)/gi,
    /⚠️\s*([^.]+)/gi,
  ]
  
  for (const pattern of breakingPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const change = match[1].trim()
      if (change.length < 200) {
        facts.push({
          id: `${sourceId}-breaking-${Date.now()}`,
          sourceId,
          domain,
          topic: 'Breaking Change',
          description: change,
          confidence: 0.85,
          relevance: 'high',
          productionReady: true,
          detectedAt,
          publishedAt,
          tags: ['breaking-change', 'migration', domain],
          implications: ['Review before upgrading', 'May require code changes'],
        })
      }
    }
  }
  
  return facts
}

// ============================================
// BEST PRACTICE EXTRACTION
// ============================================

function extractBestPracticeFacts(
  sourceId: string,
  domain: string,
  content: string,
  detectedAt: string,
  publishedAt?: string
): TrendFact[] {
  const facts: TrendFact[] = []
  
  // Look for recommendation patterns
  const recommendPatterns = [
    /(?:we\s+)?recommend\s+(?:using\s+)?([^.]+)/gi,
    /best\s+practice\s*:?\s*([^.]+)/gi,
    /(?:is\s+)?(?:now\s+)?(?:the\s+)?default\s*:?\s*([^.]+)/gi,
    /prefer\s+([^.]+)\s+over\s+([^.]+)/gi,
  ]
  
  for (const pattern of recommendPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const practice = match[1].trim()
      if (practice.length < 150) {
        facts.push({
          id: `${sourceId}-practice-${Date.now()}`,
          sourceId,
          domain,
          topic: 'Best Practice Update',
          description: practice,
          confidence: 0.75,
          relevance: 'medium',
          productionReady: true,
          detectedAt,
          publishedAt,
          tags: ['best-practice', 'recommendation', domain],
          implications: ['Consider adopting for new projects'],
        })
      }
    }
  }
  
  return facts
}

// ============================================
// SECURITY EXTRACTION
// ============================================

function extractSecurityFacts(
  sourceId: string,
  domain: string,
  content: string,
  detectedAt: string,
  publishedAt?: string
): TrendFact[] {
  const facts: TrendFact[] = []
  
  const securityPatterns = [
    /CVE-\d{4}-\d+/gi,
    /security\s+(?:vulnerability|issue|fix)\s*:?\s*([^.]+)/gi,
    /critical\s+(?:security\s+)?(?:update|patch)/gi,
  ]
  
  for (const pattern of securityPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const issue = match[0].trim()
      facts.push({
        id: `${sourceId}-security-${Date.now()}`,
        sourceId,
        domain,
        topic: 'Security Advisory',
        description: `Security issue detected: ${issue}`,
        confidence: 0.95,
        relevance: 'high',
        productionReady: true,
        detectedAt,
        publishedAt,
        tags: ['security', 'vulnerability', 'urgent', domain],
        implications: ['Immediate review recommended', 'Consider updating affected packages'],
      })
    }
  }
  
  return facts
}

// ============================================
// SUMMARY GENERATION
// ============================================

/**
 * Generate a summary from trend facts
 */
export function generateSummary(facts: TrendFact[]): string {
  if (facts.length === 0) {
    return 'No relevant trends detected.'
  }
  
  const lines = ['Detected Context:']
  
  // Group by domain
  const byDomain = new Map<string, TrendFact[]>()
  for (const fact of facts) {
    if (!byDomain.has(fact.domain)) {
      byDomain.set(fact.domain, [])
    }
    byDomain.get(fact.domain)!.push(fact)
  }
  
  // Format each domain's facts
  for (const [domain, domainFacts] of byDomain) {
    lines.push(`\n${domain.toUpperCase()}:`)
    for (const fact of domainFacts.slice(0, 5)) { // Limit per domain
      lines.push(`- ${fact.topic}`)
    }
  }
  
  // Add confidence summary
  const highConfidence = facts.filter(f => f.confidence >= 0.85)
  const highRelevance = facts.filter(f => f.relevance === 'high')
  
  lines.push('')
  lines.push(`Relevance: ${highRelevance.length > 0 ? 'HIGH' : 'MEDIUM'}`)
  lines.push(`Confidence: ${highConfidence.length > facts.length / 2 ? 'HIGH' : 'MEDIUM'}`)
  
  return lines.join('\n')
}
