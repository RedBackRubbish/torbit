// ============================================================================
// Chat Panel Types & Constants
// ============================================================================

import type { AgentId } from '@/lib/tools/definitions'

export const AGENT_ICONS: Record<string, string> = {
  architect: '◆',
  frontend: '◇',
  backend: '⬡',
  database: '⬢',
  devops: '△',
  qa: '○',
  planner: '▣',
  auditor: '⚠',
}

export const AGENT_COLORS: Record<string, string> = {
  architect: '#00ff41',
  frontend: '#00d4ff',
  backend: '#ff6b00',
  database: '#a855f7',
  devops: '#f43f5e',
  qa: '#eab308',
  planner: '#22c55e',
  auditor: '#ef4444',
}

// Tool call for real-time display
export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'running' | 'complete' | 'error'
  result?: {
    success: boolean
    output: string
    duration: number
  }
}

// Usage metrics
export interface UsageMetrics {
  inputTokens: number
  outputTokens: number
  estimatedCost: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentId?: string
  toolCalls?: ToolCall[]
  usage?: UsageMetrics
  error?: {
    type: string
    message: string
    retryable: boolean
  }
  retrying?: boolean
}

// Stream chunk types from API
export interface StreamChunk {
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'usage' | 'retry'
  content?: string
  toolCall?: {
    id: string
    name: string
    args: Record<string, unknown>
  }
  toolResult?: {
    id: string
    success: boolean
    output: string
    duration: number
  }
  usage?: UsageMetrics
  error?: {
    type: string
    message: string
    retryable: boolean
  }
  retry?: {
    attempt: number
    maxAttempts: number
    retryAfterMs: number
  }
}

export type { AgentId }
