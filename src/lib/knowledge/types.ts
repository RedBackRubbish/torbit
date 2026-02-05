/**
 * TORBIT - Knowledge Types
 * 
 * Governed knowledge awareness layer.
 * 
 * Core Principle (Lock This):
 * - Torbit may sense the world.
 * - Torbit may not blindly react to it.
 * 
 * Latest trends must be:
 * - Detected
 * - Evaluated
 * - Optionally applied
 * - Provable
 * - Never silently injected
 */

// ============================================
// KNOWLEDGE SOURCE
// ============================================

export type SourceType =
  | 'changelog'      // Framework release notes
  | 'documentation'  // Official docs
  | 'release-feed'   // GitHub releases, RFCs
  | 'blog'           // Curated official blogs
  | 'advisory'       // Security advisories (CVE, npm)

export type TrustLevel =
  | 'official'       // First-party source (React, Next.js, Stripe)
  | 'verified'       // Trusted third-party (Vercel blog, AWS)
  | 'community'      // Curated community (selected only)

export interface KnowledgeSource {
  /**
   * Unique source identifier
   */
  id: string
  
  /**
   * Human-readable name
   */
  name: string
  
  /**
   * Source type
   */
  type: SourceType
  
  /**
   * Source URL
   */
  url: string
  
  /**
   * How often to refresh
   */
  updateCadence: 'hourly' | 'daily' | 'weekly'
  
  /**
   * Trust level
   */
  trustLevel: TrustLevel
  
  /**
   * Technology domains this source covers
   */
  domains: string[]
  
  /**
   * Is this source active?
   */
  enabled: boolean
}

// ============================================
// TREND FACT
// ============================================

export interface TrendFact {
  /**
   * Unique fact identifier
   */
  id: string
  
  /**
   * Source this fact came from
   */
  sourceId: string
  
  /**
   * Technology domain
   */
  domain: string
  
  /**
   * Fact topic/title
   */
  topic: string
  
  /**
   * Detailed description
   */
  description: string
  
  /**
   * Confidence score (0-1)
   */
  confidence: number
  
  /**
   * Relevance to common use cases
   */
  relevance: 'high' | 'medium' | 'low'
  
  /**
   * Is this production-ready?
   */
  productionReady: boolean
  
  /**
   * When this was detected
   */
  detectedAt: string
  
  /**
   * When the underlying info was published
   */
  publishedAt?: string
  
  /**
   * Tags for filtering
   */
  tags: string[]
  
  /**
   * Actionable implications
   */
  implications: string[]
}

// ============================================
// KNOWLEDGE CACHE
// ============================================

export interface KnowledgeCache {
  /**
   * Cache version
   */
  version: string
  
  /**
   * When cache was last updated
   */
  lastUpdated: string
  
  /**
   * Cached facts by domain
   */
  facts: Record<string, TrendFact[]>
  
  /**
   * Cache TTL in milliseconds
   */
  ttl: number
  
  /**
   * Sources that were fetched
   */
  fetchedSources: string[]
}

// ============================================
// SUGGESTION
// ============================================

export type SuggestionCategory =
  | 'framework'       // Framework choice/version
  | 'integration'     // Add an integration
  | 'security'        // Security enhancement
  | 'performance'     // Performance optimization
  | 'architecture'    // Architecture pattern
  | 'best-practice'   // General best practice

export interface Suggestion {
  /**
   * Unique suggestion identifier
   */
  id: string
  
  /**
   * Short title
   */
  title: string
  
  /**
   * Detailed description
   */
  description: string
  
  /**
   * Why this is suggested
   */
  rationale: string
  
  /**
   * Category
   */
  category: SuggestionCategory
  
  /**
   * Relevance to current context
   */
  relevance: 'high' | 'medium' | 'low'
  
  /**
   * Confidence in this suggestion
   */
  confidence: number
  
  /**
   * Knowledge source that informed this
   */
  sourceFactIds: string[]
  
  /**
   * Is this optional?
   * @default true - Suggestions never auto-apply
   */
  optional: boolean
  
  /**
   * Was this accepted by user?
   */
  accepted?: boolean
  
  /**
   * Was this reviewed by Strategist?
   */
  strategistApproved?: boolean
}

// ============================================
// KNOWLEDGE QUERY
// ============================================

export interface KnowledgeQuery {
  /**
   * Technologies being used
   */
  technologies: string[]
  
  /**
   * Project type
   */
  projectType?: 'web' | 'mobile' | 'api' | 'fullstack'
  
  /**
   * Specific areas of interest
   */
  areas?: string[]
  
  /**
   * Current environment
   */
  environment?: 'local' | 'staging' | 'production'
  
  /**
   * Maximum age of facts to consider (ms)
   */
  maxAge?: number
}

// ============================================
// KNOWLEDGE CONTEXT
// ============================================

export interface KnowledgeContext {
  /**
   * Relevant facts for this context
   */
  facts: TrendFact[]
  
  /**
   * Generated suggestions
   */
  suggestions: Suggestion[]
  
  /**
   * Summary for the Planner
   */
  summary: string
  
  /**
   * When this context was generated
   */
  generatedAt: string
  
  /**
   * Sources consulted
   */
  sources: string[]
}

// ============================================
// KNOWLEDGE APPLICATION
// ============================================

export interface KnowledgeApplication {
  /**
   * Fact being applied
   */
  factId: string
  
  /**
   * How it was applied
   */
  application: string
  
  /**
   * Was it approved?
   */
  approved: boolean
  
  /**
   * Who approved (Strategist, user, auto)
   */
  approvedBy?: 'strategist' | 'user' | 'policy'
  
  /**
   * Timestamp
   */
  appliedAt: string
}

// ============================================
// DEFAULTS
// ============================================

export const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export const EMPTY_CACHE: KnowledgeCache = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  facts: {},
  ttl: DEFAULT_CACHE_TTL,
  fetchedSources: [],
}
