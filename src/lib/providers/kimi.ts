/**
 * KIMI K2.5 PROVIDER
 *
 * OpenAI-compatible client for Moonshot AI's Kimi models.
 * API Docs: https://platform.moonshot.cn/docs/api/chat
 *
 * Models:
 * - kimi-k2.5: Most intelligent, multimodal, 256K context, thinking mode
 * - kimi-k2-turbo-preview: Fast version (60-100 tokens/sec), 256K context
 * - kimi-k2-0905-preview: Enhanced agentic coding, 256K context
 * - kimi-k2-thinking: Long reasoning, multi-step tool calls
 */

import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// ============================================
// TYPES
// ============================================

export type KimiModel =
  | 'kimi-k2.5'
  | 'kimi-k2-turbo-preview'
  | 'kimi-k2-0905-preview'
  | 'kimi-k2-thinking'
  | 'kimi-k2-thinking-turbo'
  | 'moonshot-v1-8k'
  | 'moonshot-v1-32k'
  | 'moonshot-v1-128k'

export interface KimiClientConfig {
  /** API key (falls back to KIMI_API_KEY or MOONSHOT_API_KEY env vars) */
  apiKey?: string
  /** Base URL (defaults to https://api.moonshot.cn/v1) */
  baseUrl?: string
  /** Request timeout in ms */
  timeout?: number
  /** Max retries on failure */
  maxRetries?: number
}

export interface KimiChatOptions {
  /** Model to use */
  model?: KimiModel
  /** Enable/disable thinking mode (default: enabled for k2.5) */
  thinking?: { type: 'enabled' | 'disabled' }
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Request JSON response format */
  responseFormat?: { type: 'json_object' | 'text' }
  /** Tool definitions for function calling */
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[]
  /** Tool choice strategy */
  toolChoice?: 'auto' | 'none' | OpenAI.Chat.Completions.ChatCompletionNamedToolChoice
}

// ============================================
// MODEL CAPABILITIES
// ============================================

export const KIMI_MODEL_CAPABILITIES = {
  'kimi-k2.5': {
    contextWindow: 262144, // 256K
    supportsVision: true,
    supportsThinking: true,
    supportsToolUse: true,
    tokensPerSecond: '30-60',
    inputPricePerMillion: 0.7, // CNY
    outputPricePerMillion: 4.0, // CNY
  },
  'kimi-k2-turbo-preview': {
    contextWindow: 262144,
    supportsVision: false,
    supportsThinking: false,
    supportsToolUse: true,
    tokensPerSecond: '60-100',
    inputPricePerMillion: 0.35,
    outputPricePerMillion: 2.0,
  },
  'kimi-k2-0905-preview': {
    contextWindow: 262144,
    supportsVision: false,
    supportsThinking: true,
    supportsToolUse: true,
    tokensPerSecond: '30-60',
    inputPricePerMillion: 0.7,
    outputPricePerMillion: 4.0,
  },
  'kimi-k2-thinking': {
    contextWindow: 262144,
    supportsVision: false,
    supportsThinking: true,
    supportsToolUse: true,
    tokensPerSecond: '20-40',
    inputPricePerMillion: 0.7,
    outputPricePerMillion: 4.0,
  },
  'kimi-k2-thinking-turbo': {
    contextWindow: 262144,
    supportsVision: false,
    supportsThinking: true,
    supportsToolUse: true,
    tokensPerSecond: '40-60',
    inputPricePerMillion: 0.35,
    outputPricePerMillion: 2.0,
  },
} as const

// ============================================
// CLIENT CREATION
// ============================================

/**
 * Create a Kimi (Moonshot AI) client
 * Uses OpenAI SDK since Kimi is OpenAI-compatible
 */
export function createKimiClient(config: KimiClientConfig = {}): OpenAI {
  const apiKey = config.apiKey || process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY

  if (!apiKey) {
    throw new Error(
      'Kimi API key not configured. Set KIMI_API_KEY or MOONSHOT_API_KEY environment variable.'
    )
  }

  return new OpenAI({
    apiKey,
    baseURL: config.baseUrl || 'https://api.moonshot.cn/v1',
    timeout: config.timeout || 60000,
    maxRetries: config.maxRetries ?? 3,
  })
}

// ============================================
// HIGH-LEVEL CHAT FUNCTION
// ============================================

/**
 * Chat with Kimi K2.5
 */
export async function kimiChat(
  messages: ChatCompletionMessageParam[],
  options: KimiChatOptions = {}
): Promise<{
  content: string
  reasoningContent?: string
  toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
  usage?: OpenAI.Completions.CompletionUsage
}> {
  const client = createKimiClient()
  const model = options.model || 'kimi-k2.5'

  // Build extra_body for Kimi-specific options
  const extraBody: Record<string, unknown> = {}
  if (options.thinking) {
    extraBody.thinking = options.thinking
  }

  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: options.maxTokens || 32768,
    ...(options.responseFormat && { response_format: options.responseFormat }),
    ...(options.tools && { tools: options.tools }),
    ...(options.toolChoice && { tool_choice: options.toolChoice }),
    ...(Object.keys(extraBody).length > 0 && { extra_body: extraBody }),
  })

  const message = response.choices[0]?.message

  return {
    content: message?.content || '',
    // Kimi K2.5 returns reasoning in reasoning_content field
    reasoningContent: (message as unknown as { reasoning_content?: string })?.reasoning_content,
    toolCalls: message?.tool_calls,
    usage: response.usage ?? undefined,
  }
}

/**
 * Stream chat with Kimi K2.5
 */
export async function* kimiChatStream(
  messages: ChatCompletionMessageParam[],
  options: KimiChatOptions = {}
): AsyncGenerator<{
  type: 'content' | 'reasoning' | 'tool_call'
  delta: string
  toolCall?: { name: string; arguments: string }
}> {
  const client = createKimiClient()
  const model = options.model || 'kimi-k2.5'

  const extraBody: Record<string, unknown> = {}
  if (options.thinking) {
    extraBody.thinking = options.thinking
  }

  const stream = await client.chat.completions.create({
    model,
    messages,
    max_tokens: options.maxTokens || 32768,
    stream: true,
    ...(options.responseFormat && { response_format: options.responseFormat }),
    ...(options.tools && { tools: options.tools }),
    ...(options.toolChoice && { tool_choice: options.toolChoice }),
    ...(Object.keys(extraBody).length > 0 && { extra_body: extraBody }),
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta

    if (delta?.content) {
      yield { type: 'content', delta: delta.content }
    }

    // Handle reasoning content (Kimi-specific)
    const reasoningDelta = (delta as unknown as { reasoning_content?: string })?.reasoning_content
    if (reasoningDelta) {
      yield { type: 'reasoning', delta: reasoningDelta }
    }

    // Handle tool calls
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        if (tc.function?.name || tc.function?.arguments) {
          yield {
            type: 'tool_call',
            delta: tc.function?.arguments || '',
            toolCall: {
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || '',
            },
          }
        }
      }
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if the model supports a specific capability
 */
export function modelSupports(
  model: KimiModel,
  capability: 'vision' | 'thinking' | 'toolUse'
): boolean {
  const caps = KIMI_MODEL_CAPABILITIES[model as keyof typeof KIMI_MODEL_CAPABILITIES]
  if (!caps) return false

  switch (capability) {
    case 'vision':
      return caps.supportsVision
    case 'thinking':
      return caps.supportsThinking
    case 'toolUse':
      return caps.supportsToolUse
  }
}

/**
 * Get the best model for a specific use case
 */
export function selectKimiModel(requirements: {
  needsVision?: boolean
  needsThinking?: boolean
  prioritizeSpeed?: boolean
}): KimiModel {
  // Vision requires kimi-k2.5
  if (requirements.needsVision) {
    return 'kimi-k2.5'
  }

  // Speed priority
  if (requirements.prioritizeSpeed) {
    return requirements.needsThinking ? 'kimi-k2-thinking-turbo' : 'kimi-k2-turbo-preview'
  }

  // Default to most capable
  return requirements.needsThinking ? 'kimi-k2.5' : 'kimi-k2.5'
}

/**
 * Estimate token count for messages (rough estimate)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for mixed content
  return Math.ceil(text.length / 4)
}
