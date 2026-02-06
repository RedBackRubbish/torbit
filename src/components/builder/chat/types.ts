// ============================================================================
// Chat Panel Types & Constants
// ============================================================================

import type { AgentId } from '@/lib/tools/definitions'

// Clean, minimal agent display
export const AGENT_COLORS: Record<string, string> = {
  architect: '#3b82f6', // blue
  frontend: '#06b6d4',  // cyan
  backend: '#f59e0b',   // amber
  database: '#8b5cf6',  // purple
  devops: '#f43f5e',    // rose
  qa: '#22c55e',        // green
  planner: '#6366f1',   // indigo
  strategist: '#facc15', // yellow (GPT-5.2 plan validator)
  auditor: '#ef4444',   // red
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
  isSupervisor?: boolean // Supervisor verification message
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
