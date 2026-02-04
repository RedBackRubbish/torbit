# Kimi K2.5 Intelligent Router Architecture

## Overview

TORBIT now uses **Kimi K2.5** (Moonshot AI) as the intelligent router/orchestrator layer. Kimi K2.5 is a state-of-the-art model with:

- **1T total parameters** (32B active MoE)
- **256K context window** for full codebase understanding
- **Native multimodal** (vision) for UI/design tasks
- **Thinking mode** for complex reasoning
- **SoTA on Agent/Coding benchmarks** (76.8% SWE-Bench Verified)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    KIMI K2.5 ROUTER                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │   Quick       │  │   Complexity  │  │   Multimodal  │           │
│  │   Heuristics  │──│   Assessment  │──│   Detection   │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              ROUTING DECISION                                │   │
│  │  • Target Agent (architect/frontend/backend/qa/...)         │   │
│  │  • Model Tier (opus/sonnet/flash)                           │   │
│  │  • Complexity Level (trivial → architectural)               │   │
│  │  • Vision Required? Thinking Mode?                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TORBIT ORCHESTRATOR                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │Architect│  │Frontend │  │ Backend │  │Database │  │   QA    │  │
│  │(Claude) │  │(Claude) │  │(Gemini) │  │(Gemini) │  │(Claude) │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Kimi Models Available

| Model | Context | Speed | Vision | Thinking | Best For |
|-------|---------|-------|--------|----------|----------|
| `kimi-k2.5` | 256K | 30-60 tok/s | ✅ | ✅ | Complex routing, vision tasks |
| `kimi-k2-turbo-preview` | 256K | 60-100 tok/s | ❌ | ❌ | Fast routing |
| `kimi-k2-thinking` | 256K | 20-40 tok/s | ❌ | ✅ | Deep reasoning |
| `kimi-k2-thinking-turbo` | 256K | 40-60 tok/s | ❌ | ✅ | Balanced thinking |

## Router Features

### 1. Quick Heuristics (Zero Latency)

For obvious task patterns, routing happens instantly without an API call:

```typescript
// Vision tasks → Frontend + Opus
"implement this Figma design" → { agent: 'frontend', tier: 'opus', vision: true }

// Simple queries → Flash tier
"what is useState?" → { agent: 'architect', tier: 'flash' }

// Testing → QA agent
"write unit tests" → { agent: 'qa', tier: 'sonnet' }

// Architecture → Opus + Thinking
"redesign the auth system" → { agent: 'architect', tier: 'opus', thinking: true }
```

### 2. Intelligent Routing (API-Powered)

For ambiguous requests, Kimi K2.5 analyzes and decides:

- Task complexity assessment
- Best agent selection
- Optimal model tier
- Whether thinking mode is needed
- Task decomposition for complex requests

### 3. Graceful Fallback

If Kimi API is unavailable, the router falls back to keyword-based heuristics:

```typescript
// No API key? No problem - uses legacy routing
if (!isKimiConfigured()) {
  return legacyHeuristicRouting(prompt)
}
```

## Configuration

### Environment Variables

```bash
# Required for intelligent routing
KIMI_API_KEY=your_kimi_api_key_here

# Optional: Alternative env var name
MOONSHOT_API_KEY=your_kimi_api_key_here

# Enable/disable Kimi router (default: auto-detect)
TORBIT_KIMI_ROUTER=true

# Use fast routing mode (kimi-k2-turbo)
TORBIT_FAST_ROUTING=false
```

### Get Your API Key

1. Visit [Moonshot Platform](https://platform.moonshot.cn/console/api-keys)
2. Create an account and verify
3. Generate an API key
4. Add to your `.env.local` file

## Usage

### Basic Routing

```typescript
import { routeRequest } from '@/lib/agents/router'

const decision = await routeRequest("Create a login component with validation")

console.log(decision)
// {
//   targetAgent: 'frontend',
//   modelTier: 'sonnet',
//   complexity: 'moderate',
//   category: 'code-generation',
//   requiresVision: false,
//   useThinking: false,
//   reasoning: 'UI component implementation task',
//   confidence: 0.9
// }
```

### With Context

```typescript
const decision = await routeRequest("Match this design exactly", {
  hasImages: true,
  codebaseSize: 'large',
  previousAgents: ['architect']
})

// Will route to frontend with opus tier and vision enabled
```

### Smart Execution

```typescript
import { createOrchestrator } from '@/lib/agents/orchestrator'

const orchestrator = createOrchestrator({
  projectId: 'my-project',
  userId: 'user-123',
  enableKimiRouter: true, // Enabled by default if API key exists
})

// Let Kimi decide which agent to use
const result = await orchestrator.smartExecute("Build a REST API for users")
console.log(result.routing) // Shows Kimi's decision
```

### Task Decomposition

```typescript
import { getRouter } from '@/lib/agents/router'

const router = getRouter()
const { subtasks, reasoning } = await router.decompose(
  "Build a full authentication system with login, signup, password reset, and 2FA"
)

// Returns structured subtasks with dependencies
```

## Complexity Levels

| Level | Description | Model Tier |
|-------|-------------|------------|
| `trivial` | Single-line changes, simple lookups | Flash |
| `simple` | Single-file edits, straightforward | Flash/Sonnet |
| `moderate` | Multi-file, some design decisions | Sonnet |
| `complex` | Architectural, debugging, security | Opus |
| `architectural` | System-wide redesigns | Opus + Thinking |

## Task Categories

- `code-generation` - Writing new code
- `code-review` - Reviewing existing code
- `refactoring` - Improving code structure
- `debugging` - Finding and fixing bugs
- `testing` - Writing tests
- `documentation` - Writing docs
- `architecture` - System design
- `ui-design` - UI/UX implementation
- `api-design` - API design
- `database` - Schema/queries
- `devops` - CI/CD, deployment
- `general-query` - Questions, explanations

## Performance

The router adds minimal latency:

- **Quick heuristics**: 0ms (no API call)
- **Kimi routing**: 100-300ms (kimi-k2-turbo)
- **Deep routing**: 300-600ms (kimi-k2.5 with thinking)

## Testing

```bash
# Run router tests
npm test -- --run src/lib/agents/__tests__/router.test.ts

# Run provider tests
npm test -- --run src/lib/providers/__tests__/kimi.test.ts
```

## API Reference

See:
- [Moonshot Platform Docs](https://platform.moonshot.cn/docs/overview)
- [Kimi K2.5 Quickstart](https://platform.moonshot.cn/docs/guide/kimi-k2-5-quickstart)
- [Tool Use Guide](https://platform.moonshot.cn/docs/api/tool-use)
