/**
 * Feature Flags System for Gradual Rollouts
 * 
 * Provides a flexible feature flag system with:
 * - Local storage persistence
 * - User/session targeting
 * - Percentage-based rollouts
 * - Override support for testing
 * 
 * @example
 * if (featureFlags.isEnabled('new-chat-ui')) {
 *   return <NewChatUI />
 * }
 */

// ============================================================================
// Types
// ============================================================================

export interface FeatureFlag {
  /** Unique identifier for the flag */
  id: string
  /** Human-readable name */
  name: string
  /** Description of what this flag controls */
  description: string
  /** Whether the flag is enabled by default */
  defaultValue: boolean
  /** Percentage of users to enable (0-100) */
  rolloutPercentage?: number
  /** Specific user IDs to enable for */
  enabledForUsers?: string[]
  /** Environment restrictions */
  environments?: ('development' | 'staging' | 'production')[]
  /** Expiration date after which flag should be removed */
  expiresAt?: Date
}

export interface FeatureFlagOverride {
  flagId: string
  value: boolean
  expiresAt?: Date
}

export interface FeatureFlagState {
  flags: Record<string, FeatureFlag>
  overrides: Record<string, FeatureFlagOverride>
  userId?: string
}

// ============================================================================
// Default Feature Flags
// ============================================================================

export const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  'new-chat-ui': {
    id: 'new-chat-ui',
    name: 'New Chat UI',
    description: 'Enable the redesigned chat interface',
    defaultValue: false,
    rolloutPercentage: 0,
  },
  'multi-agent': {
    id: 'multi-agent',
    name: 'Multi-Agent System',
    description: 'Enable multiple AI agents working together',
    defaultValue: true,
    rolloutPercentage: 100,
  },
  'code-streaming': {
    id: 'code-streaming',
    name: 'Code Streaming',
    description: 'Stream code changes in real-time',
    defaultValue: true,
    rolloutPercentage: 100,
  },
  'preview-hot-reload': {
    id: 'preview-hot-reload',
    name: 'Preview Hot Reload',
    description: 'Automatically refresh preview on file changes',
    defaultValue: true,
    rolloutPercentage: 100,
  },
  'ai-suggestions': {
    id: 'ai-suggestions',
    name: 'AI Suggestions',
    description: 'Show AI-powered code suggestions',
    defaultValue: false,
    rolloutPercentage: 25,
  },
  'dark-mode-v2': {
    id: 'dark-mode-v2',
    name: 'Dark Mode V2',
    description: 'New dark mode theme with improved contrast',
    defaultValue: false,
    rolloutPercentage: 50,
  },
  'export-to-github': {
    id: 'export-to-github',
    name: 'Export to GitHub',
    description: 'Export projects directly to GitHub',
    defaultValue: false,
    rolloutPercentage: 0,
    environments: ['development', 'staging'],
  },
  'performance-metrics': {
    id: 'performance-metrics',
    name: 'Performance Metrics',
    description: 'Show performance metrics in the UI',
    defaultValue: false,
    environments: ['development'],
  },
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY = 'torbit_feature_flags'
const USER_ID_KEY = 'torbit_user_id'

// ============================================================================
// Feature Flags Class
// ============================================================================

class FeatureFlagManager {
  private state: FeatureFlagState
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.state = {
      flags: { ...DEFAULT_FLAGS },
      overrides: {},
      userId: undefined,
    }
    
    // Load persisted state in browser
    if (typeof window !== 'undefined') {
      this.loadFromStorage()
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagId: string): boolean {
    // Check for override first
    const override = this.state.overrides[flagId]
    if (override) {
      // Check if override is expired
      if (override.expiresAt && new Date() > override.expiresAt) {
        this.removeOverride(flagId)
      } else {
        return override.value
      }
    }

    const flag = this.state.flags[flagId]
    if (!flag) {
      console.warn(`[FeatureFlags] Unknown flag: ${flagId}`)
      return false
    }

    // Check environment restrictions
    if (flag.environments) {
      const currentEnv = this.getCurrentEnvironment()
      if (!flag.environments.includes(currentEnv)) {
        return false
      }
    }

    // Check expiration
    if (flag.expiresAt && new Date() > flag.expiresAt) {
      return flag.defaultValue
    }

    // Check user targeting
    if (flag.enabledForUsers && this.state.userId) {
      if (flag.enabledForUsers.includes(this.state.userId)) {
        return true
      }
    }

    // Check percentage rollout
    if (flag.rolloutPercentage !== undefined) {
      return this.isInRolloutPercentage(flagId, flag.rolloutPercentage)
    }

    return flag.defaultValue
  }

  /**
   * Get all flags and their current status
   */
  getAllFlags(): Record<string, { flag: FeatureFlag; enabled: boolean }> {
    const result: Record<string, { flag: FeatureFlag; enabled: boolean }> = {}
    
    for (const [id, flag] of Object.entries(this.state.flags)) {
      result[id] = {
        flag,
        enabled: this.isEnabled(id),
      }
    }
    
    return result
  }

  /**
   * Set an override for a flag
   */
  setOverride(flagId: string, value: boolean, expiresInMs?: number): void {
    this.state.overrides[flagId] = {
      flagId,
      value,
      expiresAt: expiresInMs ? new Date(Date.now() + expiresInMs) : undefined,
    }
    this.saveToStorage()
    this.notifyListeners()
  }

  /**
   * Remove an override
   */
  removeOverride(flagId: string): void {
    delete this.state.overrides[flagId]
    this.saveToStorage()
    this.notifyListeners()
  }

  /**
   * Clear all overrides
   */
  clearOverrides(): void {
    this.state.overrides = {}
    this.saveToStorage()
    this.notifyListeners()
  }

  /**
   * Set the current user ID for targeting
   */
  setUserId(userId: string): void {
    this.state.userId = userId
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_ID_KEY, userId)
    }
    this.notifyListeners()
  }

  /**
   * Subscribe to flag changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Register a custom flag at runtime
   */
  registerFlag(flag: FeatureFlag): void {
    this.state.flags[flag.id] = flag
    this.notifyListeners()
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getCurrentEnvironment(): 'development' | 'staging' | 'production' {
    if (typeof window === 'undefined') {
      return process.env.NODE_ENV === 'production' ? 'production' : 'development'
    }
    
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development'
    }
    if (hostname.includes('staging') || hostname.includes('preview')) {
      return 'staging'
    }
    return 'production'
  }

  private isInRolloutPercentage(flagId: string, percentage: number): boolean {
    if (percentage >= 100) return true
    if (percentage <= 0) return false

    // Use consistent hashing based on user ID or flag ID
    const identifier = this.state.userId || flagId
    const hash = this.hashString(`${flagId}:${identifier}`)
    const normalizedHash = (hash % 100) + 1 // 1-100
    
    return normalizedHash <= percentage
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.state.overrides = parsed.overrides || {}
      }
      
      const userId = localStorage.getItem(USER_ID_KEY)
      if (userId) {
        this.state.userId = userId
      }
    } catch (e) {
      console.warn('[FeatureFlags] Failed to load from storage:', e)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        overrides: this.state.overrides,
      }))
    } catch (e) {
      console.warn('[FeatureFlags] Failed to save to storage:', e)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener())
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const featureFlags = new FeatureFlagManager()

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect } from 'react'

/**
 * React hook to check if a feature flag is enabled
 * Automatically updates when flags change
 */
export function useFeatureFlag(flagId: string): boolean {
  const [enabled, setEnabled] = useState(() => featureFlags.isEnabled(flagId))

  useEffect(() => {
    const unsubscribe = featureFlags.subscribe(() => {
      setEnabled(featureFlags.isEnabled(flagId))
    })
    return unsubscribe
  }, [flagId])

  return enabled
}

/**
 * React hook to get all feature flags
 */
export function useAllFeatureFlags(): Record<string, { flag: FeatureFlag; enabled: boolean }> {
  const [flags, setFlags] = useState(() => featureFlags.getAllFlags())

  useEffect(() => {
    const unsubscribe = featureFlags.subscribe(() => {
      setFlags(featureFlags.getAllFlags())
    })
    return unsubscribe
  }, [])

  return flags
}
