# TORBIT: The Ultimate Blueprint
## Agentic Engineering Platform for Zero-Friction App Generation

**Version:** 1.0  
**Date:** February 4, 2026  
**Codename:** Project Orbit  

---

## Table of Contents

1. [Executive Vision](#1-executive-vision)
2. [Core Philosophy: The Vibe DNA](#2-core-philosophy-the-vibe-dna)
3. [Agent Architecture (6-Node System)](#3-agent-architecture-6-node-system)
4. [Technical Stack 2026](#4-technical-stack-2026)
5. [State Machine Design](#5-state-machine-design)
6. [Memory & Context Strategy](#6-memory--context-strategy)
7. [Error Recovery & Self-Healing](#7-error-recovery--self-healing)
8. [User Experience Flow](#8-user-experience-flow)
9. [Security & Sandboxing](#9-security--sandboxing)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Competitive Differentiation](#11-competitive-differentiation)
12. [Implementation Phases](#12-implementation-phases)
13. [Risk Mitigation](#13-risk-mitigation)
14. [Success Metrics](#14-success-metrics)

---

## 1. Executive Vision

### The Problem with Current Platforms

| Platform | Strength | Fatal Flaw |
|----------|----------|------------|
| **v0** | Beautiful UI generation | One-shot; no iteration memory |
| **Lovable** | Full-stack scaffolding | Linear chains; breaks on complexity |
| **Base44** | Agentic loops | No design consistency; "ugly by default" |
| **Bolt.new** | Fast iteration | Context amnesia after ~5 turns |
| **Cursor** | IDE integration | Requires developer to orchestrate |

### The TORBIT Thesis

> **"Vibe Coding is not about generating code. It's about Developer Experience as a Service."**

TORBIT is the first **Stateful Multi-Agent System** where:
- Users describe intent ("vibes"), not specifications
- Agents negotiate, plan, and audit autonomously  
- The system remembers decisions across sessions (days, not minutes)
- Errors are invisible—fixed before users see them

---

## 2. Core Philosophy: The Vibe DNA

### 2.1 The Three Laws of Vibe

1. **Low Latency = High Agency**  
   - Stream UI components as they're built (not after full compilation)
   - Target: First visual in <3 seconds

2. **Invisible Infrastructure**  
   - No .env configuration screens
   - No "choose your framework" modals
   - Opinionated defaults, escape hatches for power users

3. **Self-Healing Context**  
   - Errors never surface to users
   - "Polishing..." = silently fixing 3 TypeScript errors
   - The Auditor is the user's invisible QA team

### 2.2 The Vibe Equation

```
Vibe Score = (Speed × Polish) / (Friction + Errors)
```

**Target Vibe Score: >0.9**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Speed | <15s to first interactive component | Time-to-first-render |
| Polish | Zero console errors in shipped code | Auditor pass rate |
| Friction | Zero config steps for MVP | Onboarding funnel |
| Errors | <1% visible to user | Error suppression rate |

---

## 3. Agent Architecture (6-Node System)

### 3.1 The TORBIT Orbit System

```
                         ┌─────────────────────────────────────────┐
                         │              USER INPUT                 │
                         │        "Build me a Spotify clone"       │
                         └─────────────────┬───────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORBIT-1: PLANNER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Model: o4-mini (reasoning)                                          │   │
│  │ Input: Vague user vibe                                              │   │
│  │ Output: Structured PRD (JSON)                                       │   │
│  │ Behavior: Asks clarifying questions if ambiguity > threshold        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
┌─────────────────────────────────┐     ┌─────────────────────────────────────┐
│      ORBIT-2: DESIGNER          │     │         ORBIT-3: ARCHITECT          │
│  ┌───────────────────────────┐  │     │  ┌─────────────────────────────┐    │
│  │ Model: Claude 3.7 Sonnet  │  │     │  │ Model: Claude 3.7 Sonnet    │    │
│  │ Output:                   │  │     │  │ Output:                     │    │
│  │ - design-tokens.ts        │  │     │  │ - File tree structure       │    │
│  │ - tailwind.config.ts      │  │     │  │ - schema.sql (Supabase)     │    │
│  │ - Color palette           │  │     │  │ - API route signatures      │    │
│  │ - Typography scale        │  │     │  │ - Component dependency map  │    │
│  └───────────────────────────┘  │     │  └─────────────────────────────┘    │
└─────────────────┬───────────────┘     └─────────────────┬───────────────────┘
                  │                                       │
                  └───────────────────┬───────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORBIT-4: LIBRARIAN                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Type: RAG System (not LLM-based)                                    │   │
│  │ Storage: Supabase pgvector                                          │   │
│  │ Function: Retrieves relevant context for Builder                    │   │
│  │ Capability: Fetches only what's needed (solves context bloat)       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORBIT-5: BUILDER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Model: Claude 3.7 Sonnet (heavy lifting)                            │   │
│  │ Input: File tree + Design tokens + Relevant context (from Librarian)│   │
│  │ Output: Full source code for each file                              │   │
│  │ Constraints:                                                        │   │
│  │ - NO placeholders or TODOs                                          │   │
│  │ - Must respect design-tokens.ts                                     │   │
│  │ - Writes files atomically to sandbox                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORBIT-6: AUDITOR                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Environment: E2B Sandbox                                            │   │
│  │ Actions:                                                            │   │
│  │ 1. Run `bun run build` in isolated container                        │   │
│  │ 2. Execute `bun run lint` for code quality                          │   │
│  │ 3. Check for hallucinated imports                                   │   │
│  │ 4. Validate design token usage                                      │   │
│  │ 5. Run basic smoke tests                                            │   │
│  │                                                                     │   │
│  │ On Failure: Send error + file back to BUILDER (max 3 retries)       │   │
│  │ On Success: Emit to user stream                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Agent Communication Protocol

Each agent communicates via a shared `TorbitState` object:

```typescript
interface TorbitState {
  // Core session
  sessionId: string;
  userId: string;
  
  // Message history
  messages: BaseMessage[];
  
  // Planner outputs
  prd: {
    projectName: string;
    userStories: UserStory[];
    techStack: TechStackConfig;
    coreFeatures: Feature[];
    clarifyingQuestions?: string[];
    ambiguityScore: number; // 0-1, triggers questions if > 0.3
  } | null;
  
  // Designer outputs
  designSystem: {
    tokens: DesignTokens;
    palette: ColorPalette;
    typography: TypographyScale;
    components: ComponentStyleGuide;
  } | null;
  
  // Architect outputs
  fileTree: FileNode[];
  schema: string; // Raw SQL
  apiSignatures: APISignature[];
  dependencyGraph: Map<string, string[]>; // file -> dependencies
  
  // Builder state
  generatedFiles: Map<string, GeneratedFile>;
  currentFile: string | null;
  buildQueue: string[];
  
  // Auditor state
  auditResults: AuditResult[];
  retryCount: Map<string, number>;
  globalBuildStatus: 'pending' | 'building' | 'success' | 'failed';
  
  // Librarian cache
  contextCache: Map<string, RelevantContext>;
  vectorStore: VectorStoreRef;
}
```

### 3.3 Critical Improvement: The Designer Node

**Why This Was Missing (and why it matters):**

Without a Designer phase, the Builder makes independent style decisions per-file:
- Button A: `bg-blue-500`
- Button B: `bg-indigo-600`  
- Button C: `background-color: #3B82F6`

**The Designer Node ensures:**

```typescript
// design-tokens.ts (generated BEFORE any component)
export const tokens = {
  colors: {
    primary: {
      50: '#EEF2FF',
      500: '#6366F1',
      900: '#312E81',
    },
    // ...
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      // ...
    },
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  },
} as const;
```

The Builder is then **constrained** to import from `@/lib/design-tokens` rather than inventing styles.

---

## 4. Technical Stack 2026

### 4.1 The TORBIT Stack (Opinionated Defaults)

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Runtime** | Bun 2.0 | 4x faster than Node.js, native TypeScript, built-in test runner |
| **Meta-Framework** | Next.js 16 (App Router) | Server Actions, RSC, industry standard |
| **Styling** | Tailwind CSS v4 | Oxide engine, zero-runtime CSS |
| **Component Library** | Shadcn/ui | Copy-paste ownership, not black-box dependency |
| **State Management** | Zustand | Minimal API, no boilerplate, hooks-native |
| **Validation** | Zod | Runtime type safety, LLM-friendly schemas |
| **Backend** | Supabase | Auth, Postgres, Realtime, Storage, Edge Functions |
| **Vector DB** | Supabase pgvector | Co-located with app data, no extra infra |
| **Agent Framework** | LangGraph.js | Cyclic graphs, checkpointing, streaming |
| **Sandbox** | E2B | Secure code execution, sub-second spin-up |
| **Deployment** | Vercel / Cloudflare | Edge-first, preview deploys |

### 4.2 Model Selection Matrix

| Agent | Model | Why |
|-------|-------|-----|
| Planner | o4-mini | Needs deep reasoning to extract intent from vague vibes |
| Designer | Claude 3.7 Sonnet | Aesthetic judgment + code generation |
| Architect | Claude 3.7 Sonnet | Structural thinking + SQL expertise |
| Librarian | text-embedding-3-large | Pure retrieval, no generation |
| Builder | Claude 3.7 Sonnet | Heavy code generation, high context |
| Auditor | Claude 3.7 Haiku | Fast, cheap, error-focused |

### 4.3 Why NOT These Alternatives?

| Rejected | Reason |
|----------|--------|
| LangChain (linear) | Cannot handle cyclic Audit → Fix → Audit loops |
| Prisma | Supabase has native migrations; less abstraction |
| Redux | Overkill for AI-generated apps; Zustand is simpler |
| Docker | E2B is purpose-built for LLM sandboxing |
| MongoDB | Postgres + pgvector is more capable for hybrid workloads |

---

## 5. State Machine Design

### 5.1 The TORBIT Graph (LangGraph)

```
                    ┌──────────────┐
                    │    START     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   PLANNER    │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │ ambiguityScore > 0.3?   │
              └────────────┬────────────┘
                    YES    │    NO
                     │     │     │
                     ▼     │     │
              ┌────────────┐     │
              │ ASK_USER   │     │
              └─────┬──────┘     │
                    │            │
                    └────────────┤
                                 │
                           ┌─────▼─────┐
                    ┌──────│ PARALLEL  │──────┐
                    │      └───────────┘      │
                    ▼                         ▼
             ┌──────────┐              ┌──────────────┐
             │ DESIGNER │              │  ARCHITECT   │
             └────┬─────┘              └──────┬───────┘
                  │                           │
                  └─────────────┬─────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  LIBRARIAN   │
                         │ (fetch context)
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   BUILDER    │◄────────────────────┐
                         └──────┬───────┘                     │
                                │                             │
                                ▼                             │
                         ┌──────────────┐                     │
                         │   AUDITOR    │                     │
                         └──────┬───────┘                     │
                                │                             │
                    ┌───────────┴───────────┐                 │
                    │      BUILD OK?        │                 │
                    └───────────┬───────────┘                 │
                         NO     │     YES                     │
                          │     │      │                      │
                          ▼     │      │                      │
                   ┌────────────┐      │                      │
                   │ retries<3? │      │                      │
                   └─────┬──────┘      │                      │
                    YES  │   NO        │                      │
                     │   │    │        │                      │
                     │   │    ▼        ▼                      │
                     │   │ ┌──────┐ ┌───────┐                 │
                     │   │ │ FAIL │ │STREAM │                 │
                     │   │ └──────┘ │TO USER│                 │
                     │   │          └───────┘                 │
                     │   │                                    │
                     └───┴────────────────────────────────────┘
```

### 5.2 Conditional Edge Logic

```typescript
// Edge routing functions
function shouldAskUser(state: TorbitState): string {
  if (state.prd?.ambiguityScore > 0.3) {
    return "ask_user";
  }
  return "parallel_design_architect";
}

function shouldRetryBuild(state: TorbitState): string {
  const currentFile = state.currentFile;
  const retries = state.retryCount.get(currentFile) || 0;
  
  if (state.globalBuildStatus === 'success') {
    return "stream_to_user";
  }
  
  if (retries >= 3) {
    return "fail_with_human_escalation";
  }
  
  return "builder"; // Retry
}
```

### 5.3 Checkpoint Strategy

LangGraph supports **checkpointing** for long-running sessions:

```typescript
const checkpointer = new SupabaseCheckpointer({
  connectionString: process.env.SUPABASE_URL,
  tableName: 'torbit_checkpoints',
});

const app = graph.compile({ checkpointer });

// Resume a session from 3 days ago
const result = await app.invoke(
  { messages: [new HumanMessage("Add dark mode")] },
  { configurable: { thread_id: "session_abc123" } }
);
```

---

## 6. Memory & Context Strategy

### 6.1 The Context Bottleneck Problem

**The Issue:**  
As projects grow, the Builder cannot fit every file in context (even 200K tokens).

**The Solution:** The Librarian (RAG-based retrieval)

```
┌─────────────────────────────────────────────────────────────┐
│                    LIBRARIAN SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │   VECTOR STORE  │    │      GRAPH STORE            │    │
│  │   (pgvector)    │    │  (Dependency relationships) │    │
│  │                 │    │                             │    │
│  │  - File chunks  │    │  dashboard.tsx              │    │
│  │  - PRD history  │    │    ├── uses: Chart.tsx      │    │
│  │  - Decision log │    │    ├── uses: api/data.ts    │    │
│  │                 │    │    └── uses: tokens.ts      │    │
│  └────────┬────────┘    └──────────────┬──────────────┘    │
│           │                            │                   │
│           └────────────┬───────────────┘                   │
│                        ▼                                   │
│           ┌─────────────────────────┐                      │
│           │    HYBRID RETRIEVAL     │                      │
│           │                         │                      │
│           │  Query: "Add chart to   │                      │
│           │         dashboard"      │                      │
│           │                         │                      │
│           │  Returns:               │                      │
│           │  1. dashboard.tsx       │                      │
│           │  2. Chart.tsx           │                      │
│           │  3. design-tokens.ts    │                      │
│           │  4. api/data.ts         │                      │
│           │  (NOT every file)       │                      │
│           └─────────────────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Memory Tiers

| Tier | Storage | TTL | Contents |
|------|---------|-----|----------|
| **Hot** | In-memory (LangGraph state) | Session | Current PRD, file tree, active errors |
| **Warm** | Supabase pgvector | 30 days | Embedded file chunks, decision history |
| **Cold** | Supabase Postgres | Forever | Raw file storage, full PRD archive |

### 6.3 Decision Memory

The Librarian also stores **why** decisions were made:

```typescript
interface Decision {
  id: string;
  sessionId: string;
  timestamp: Date;
  agent: 'planner' | 'architect' | 'designer' | 'builder';
  decision: string;
  reasoning: string;
  affectedFiles: string[];
  embedding: number[]; // For retrieval
}

// Example stored decision
{
  decision: "Use Recharts instead of Chart.js",
  reasoning: "User mentioned 'modern look' - Recharts has better React integration and SSR support",
  affectedFiles: ["components/Chart.tsx", "package.json"],
}
```

When the user says "Why did you use Recharts?", the Librarian retrieves this decision.

---

## 7. Error Recovery & Self-Healing

### 7.1 The Invisible Repair Philosophy

> **Rule:** The user should NEVER see a stack trace. They should only see "Polishing..."

### 7.2 Error Classification Matrix

| Error Type | Detection | Resolution | User Message |
|------------|-----------|------------|--------------|
| **TypeScript Error** | `bun run build` stderr | Send to Builder with error + file | "Refining types..." |
| **Missing Import** | AST analysis | Auto-install via `bun add` | "Adding dependencies..." |
| **Hallucinated Import** | Package.json check | Remove import, regenerate | "Cleaning up..." |
| **Runtime Error** | E2B execution | Send stack trace to Builder | "Testing edge cases..." |
| **Style Inconsistency** | Token validation | Rewrite with correct tokens | "Polishing design..." |
| **Infinite Loop** | E2B timeout (10s) | Kill + regenerate logic | "Optimizing performance..." |

### 7.3 The Retry Protocol

```typescript
async function auditorNode(state: TorbitState): Promise<TorbitState> {
  const file = state.currentFile;
  const content = state.generatedFiles.get(file);
  
  // Run in sandbox
  const result = await e2b.execute({
    files: state.generatedFiles,
    command: 'bun run build',
    timeout: 30000,
  });
  
  if (result.exitCode !== 0) {
    const retries = (state.retryCount.get(file) || 0) + 1;
    
    if (retries >= 3) {
      // Escalate to human
      return {
        ...state,
        globalBuildStatus: 'failed',
        escalationReason: result.stderr,
      };
    }
    
    // Prepare context for Builder retry
    return {
      ...state,
      retryCount: new Map(state.retryCount).set(file, retries),
      messages: [
        ...state.messages,
        new SystemMessage(`
          BUILD FAILED for ${file}.
          Error: ${result.stderr}
          
          Fix this specific error. Do not regenerate the entire file.
          Return ONLY the corrected code.
        `),
      ],
    };
  }
  
  // Success - move to next file or complete
  const nextFile = state.buildQueue[0];
  return {
    ...state,
    buildQueue: state.buildQueue.slice(1),
    currentFile: nextFile || null,
    globalBuildStatus: nextFile ? 'building' : 'success',
  };
}
```

### 7.4 Cyclic Dependency Detection

When the Auditor fixes File A, it must check if File B (which imports A) still works:

```typescript
function getAffectedFiles(file: string, graph: Map<string, string[]>): string[] {
  const affected: Set<string> = new Set();
  const queue = [file];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const [f, deps] of graph.entries()) {
      if (deps.includes(current) && !affected.has(f)) {
        affected.add(f);
        queue.push(f);
      }
    }
  }
  
  return Array.from(affected);
}

// After fixing dashboard.tsx, re-audit:
// - page.tsx (imports dashboard)
// - layout.tsx (imports page)
```

---

## 8. User Experience Flow

### 8.1 The First 60 Seconds

```
┌────────────────────────────────────────────────────────────────────┐
│  SECOND 0-3: User Input                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  User: "Build me a habit tracker with streaks"               │  │
│  └──────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│  SECOND 3-8: Planner Processing                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  🎯 Planning your habit tracker...                           │  │
│  │  ├─ Identifying core features                                │  │
│  │  ├─ Designing database schema                                │  │
│  │  └─ Creating file structure                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│  SECOND 8-15: Streaming UI Preview                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │  [LIVE PREVIEW]                                         │ │  │
│  │  │  ┌─────────────────────────────────┐                    │ │  │
│  │  │  │  🔥 Your Streaks                │ (renders first)    │ │  │
│  │  │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │                    │ │  │
│  │  │  │  ☐ Morning meditation           │ (streams in)       │ │  │
│  │  │  │  ☑ Exercise                     │                    │ │  │
│  │  │  │  ☐ Read 20 pages                │                    │ │  │
│  │  │  └─────────────────────────────────┘                    │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│  SECOND 15-45: Building (backgrounded)                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ✓ Dashboard component ready                                 │  │
│  │  ✓ Habit list component ready                                │  │
│  │  ⟳ Building streak calculator...                             │  │
│  │  ○ Database migrations pending                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│  SECOND 45-60: Complete                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ✅ Your habit tracker is ready!                             │  │
│  │                                                              │  │
│  │  [Preview] [Deploy to Vercel] [Edit in Cursor]               │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 8.2 Streaming Strategy (React Server Components)

```typescript
// The Builder emits partial renders immediately
async function* streamComponents(files: string[]) {
  for (const file of files) {
    const code = await generateFile(file);
    
    // Emit immediately (don't wait for all files)
    yield {
      type: 'component',
      file,
      code,
      preview: await renderPreview(code),
    };
  }
}

// Client receives progressive updates
// Header renders at T+5s
// List renders at T+8s  
// Footer renders at T+12s
// User sees progress, not a loading spinner
```

### 8.3 Interaction Patterns

| User Action | TORBIT Response |
|-------------|-----------------|
| "Make it darker" | Designer regenerates tokens → Builder updates affected components |
| "Add user auth" | Architect adds auth schema → Builder generates auth components |
| "This button is broken" | Screenshot analysis → Auditor identifies issue → Builder fixes |
| "Why did you..." | Librarian retrieves decision history → Explains reasoning |
| "Undo that" | Checkpoint restore → Previous state |

---

## 9. Security & Sandboxing

### 9.1 The E2B Sandbox Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    E2B SANDBOX ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐   │
│  │   TORBIT      │    │   FIRECRACKER │    │   USER CODE   │   │
│  │   BACKEND     │───▶│   microVM     │───▶│   EXECUTION   │   │
│  │               │    │               │    │               │   │
│  │  (trusted)    │    │  (isolated)   │    │  (untrusted)  │   │
│  └───────────────┘    └───────────────┘    └───────────────┘   │
│                                │                                │
│                                ▼                                │
│                       ┌───────────────────┐                    │
│                       │   CONSTRAINTS     │                    │
│                       ├───────────────────┤                    │
│                       │ • No network out  │                    │
│                       │ • 512MB RAM max   │                    │
│                       │ • 10s timeout     │                    │
│                       │ • Read-only /sys  │                    │
│                       │ • No sudo         │                    │
│                       └───────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Security Checklist

| Threat | Mitigation |
|--------|------------|
| **Malicious user prompt injection** | Separate system prompts per agent; user input is data, not instructions |
| **Generated code attacks host** | All code runs in E2B microVM, not TORBIT servers |
| **Credential leakage** | Environment variables are sandboxed; user provides Supabase keys only at deploy time |
| **Infinite resource consumption** | Hard timeouts (10s compute, 30s total) |
| **Dependency confusion attack** | Auditor verifies package names against npm registry |

### 9.3 RLS by Default (Supabase)

The Architect always generates Row-Level Security policies:

```sql
-- Generated by Architect agent
CREATE POLICY "Users can only see their own habits"
ON habits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own habits"
ON habits
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

## 10. Deployment Architecture

### 10.1 TORBIT Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TORBIT CLOUD ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   EDGE (Cloudflare Workers)                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  • WebSocket connections (streaming)                                │  │
│   │  • Rate limiting                                                    │  │
│   │  • Geographic routing                                               │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│   COMPUTE (Fly.io / Railway)                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │  │
│   │  │  LangGraph  │  │  LangGraph  │  │  LangGraph  │  (auto-scaled)  │  │
│   │  │   Worker    │  │   Worker    │  │   Worker    │                  │  │
│   │  └─────────────┘  └─────────────┘  └─────────────┘                  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                    ┌─────────────────┼─────────────────┐                   │
│                    ▼                 ▼                 ▼                   │
│   ┌────────────────────┐ ┌────────────────┐ ┌─────────────────────────┐   │
│   │     SUPABASE       │ │      E2B       │ │    MODEL PROVIDERS      │   │
│   │  ┌──────────────┐  │ │  ┌──────────┐  │ │  ┌─────────────────┐   │   │
│   │  │   Postgres   │  │ │  │ Sandbox  │  │ │  │   Anthropic     │   │   │
│   │  │  + pgvector  │  │ │  │  Pool    │  │ │  │   (Claude)      │   │   │
│   │  ├──────────────┤  │ │  └──────────┘  │ │  ├─────────────────┤   │   │
│   │  │    Auth      │  │ │                │ │  │   OpenAI        │   │   │
│   │  ├──────────────┤  │ │                │ │  │   (o4-mini)     │   │   │
│   │  │   Storage    │  │ │                │ │  └─────────────────┘   │   │
│   │  ├──────────────┤  │ │                │ │                         │   │
│   │  │  Realtime    │  │ │                │ │                         │   │
│   │  └──────────────┘  │ │                │ │                         │   │
│   └────────────────────┘ └────────────────┘ └─────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 User Project Deployment

When user clicks "Deploy":

```
TORBIT Generated Project
         │
         ▼
┌─────────────────┐
│  GitHub Repo    │  (auto-created, user owns it)
│  (private)      │
└────────┬────────┘
         │
         ├──────────────────┬───────────────────┐
         ▼                  ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Vercel       │  │   Cloudflare    │  │    Netlify      │
│    (default)    │  │    Pages        │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Supabase Project│  (auto-provisioned)
│ - Database      │
│ - Auth          │
│ - Storage       │
└─────────────────┘
```

---

## 11. Competitive Differentiation

### 11.1 Feature Comparison Matrix

| Feature | v0 | Lovable | Bolt | Base44 | **TORBIT** |
|---------|-----|---------|------|--------|------------|
| Multi-agent orchestration | ❌ | ❌ | ❌ | ✓ | ✓✓ |
| Design token enforcement | ❌ | ❌ | ❌ | ❌ | ✓ |
| Session memory (days) | ❌ | ❌ | ❌ | ❌ | ✓ |
| Self-healing builds | ❌ | ✓ | ✓ | ✓ | ✓✓ |
| RAG context management | ❌ | ❌ | ❌ | ❌ | ✓ |
| Cyclic dependency handling | ❌ | ❌ | ❌ | ❌ | ✓ |
| Streaming preview | ✓ | ✓ | ✓ | ✓ | ✓ |
| One-click deploy | ❌ | ✓ | ✓ | ✓ | ✓ |
| Code export | ✓ | ✓ | ✓ | ✓ | ✓ |
| Decision explainability | ❌ | ❌ | ❌ | ❌ | ✓ |

### 11.2 The TORBIT Moat

1. **Memory**: Competitors forget after 5 turns. TORBIT remembers for 30 days.
2. **Design Consistency**: Competitors generate ugly, inconsistent UIs. TORBIT enforces design tokens.
3. **Error Invisibility**: Competitors show cryptic errors. TORBIT fixes silently.
4. **Explainability**: Competitors are black boxes. TORBIT explains "why" it made decisions.

---

## 12. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Single-agent MVP that generates Next.js apps

| Week | Deliverable |
|------|-------------|
| 1 | LangGraph scaffolding with single "Builder" node |
| 2 | E2B sandbox integration |
| 3 | Supabase schema generation |
| 4 | Basic streaming preview |

**Exit Criteria:** User can say "Build a todo app" and get working code.

---

### Phase 2: Multi-Agent Core (Weeks 5-8)

**Goal:** Full Planner → Architect → Builder → Auditor chain

| Week | Deliverable |
|------|-------------|
| 5 | Planner agent with structured PRD output |
| 6 | Architect agent with file tree generation |
| 7 | Auditor agent with retry loop |
| 8 | Designer agent with token generation |

**Exit Criteria:** User can say "Build a Spotify clone" and get a consistent, working app.

---

### Phase 3: Memory & Context (Weeks 9-12)

**Goal:** RAG-based Librarian for large projects

| Week | Deliverable |
|------|-------------|
| 9 | pgvector setup and embedding pipeline |
| 10 | Decision memory storage and retrieval |
| 11 | Hybrid retrieval (vector + graph) |
| 12 | Session checkpointing |

**Exit Criteria:** User can return after 3 days and say "Add dark mode" without re-explaining the project.

---

### Phase 4: Polish & Scale (Weeks 13-16)

**Goal:** Production-ready platform

| Week | Deliverable |
|------|-------------|
| 13 | User authentication and project management |
| 14 | One-click Vercel/Supabase deployment |
| 15 | Usage analytics and error monitoring |
| 16 | Public beta launch |

**Exit Criteria:** 100 concurrent users without degradation.

---

## 13. Risk Mitigation

### 13.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM rate limits during peak | High | Medium | Multi-provider fallback (Anthropic → OpenAI → Google) |
| E2B sandbox cold start latency | Medium | Low | Pre-warm sandbox pool |
| Context window overflow | High | High | Aggressive chunking + Librarian RAG |
| Model hallucination of imports | High | Medium | Auditor package.json validation |
| Supabase outage | Low | High | Graceful degradation; queue writes |

### 13.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Competitor feature parity | High | Medium | Moat: memory + design consistency |
| API cost explosion | Medium | High | Usage-based pricing; caching |
| User data privacy concerns | Medium | High | SOC 2 compliance; EU hosting option |

---

## 14. Success Metrics

### 14.1 North Star Metric

> **"Time to First Value" (TTFV)**
> 
> Definition: Seconds from user's first message to seeing interactive UI preview.
> 
> Target: < 15 seconds

### 14.2 Supporting Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Build Success Rate | > 95% | Auditor pass on first try |
| Error Visibility Rate | < 1% | Errors shown to user / total errors |
| Session Retention (Day 7) | > 40% | Users returning after 7 days |
| Deploy Conversion | > 30% | Users who deploy at least once |
| NPS | > 50 | User satisfaction |

### 14.3 Vibe Metrics (Qualitative)

| Signal | Measurement |
|--------|-------------|
| "It feels like magic" | User interviews, Twitter mentions |
| "It understood what I wanted" | Low clarifying question rate |
| "I didn't have to configure anything" | Zero env variable prompts in first session |

---

## Appendix A: Prompt Templates

### A.1 Planner System Prompt

```markdown
You are the TORBIT Planner, the first agent in a multi-agent app generation system.

## Your Role
Convert vague user "vibes" into structured Product Requirement Documents (PRDs).

## Input
A user message describing what they want to build. This may be vague, incomplete, or ambiguous.

## Output
A JSON object with this exact structure:
{
  "projectName": "string (kebab-case)",
  "description": "string (1-2 sentences)",
  "userStories": [
    {
      "id": "US-001",
      "persona": "string",
      "action": "string",
      "benefit": "string"
    }
  ],
  "techStack": {
    "framework": "next-16",
    "styling": "tailwind-4",
    "database": "supabase-postgres",
    "auth": "supabase-auth"
  },
  "coreFeatures": [
    {
      "name": "string",
      "priority": "must-have | should-have | nice-to-have",
      "complexity": "low | medium | high"
    }
  ],
  "ambiguityScore": 0.0-1.0,
  "clarifyingQuestions": ["string"] // Only if ambiguityScore > 0.3
}

## Rules
1. If the request is too vague (ambiguityScore > 0.3), generate 2-3 clarifying questions
2. Always lock techStack to Next.js 16 + Supabase unless explicitly overridden
3. Extract at least 3 user stories
4. Prioritize features ruthlessly - MVP first
5. Never assume features not mentioned
```

### A.2 Designer System Prompt

```markdown
You are the TORBIT Designer, responsible for visual consistency across the entire application.

## Your Role
Generate design tokens BEFORE any component is built.

## Input
- PRD from Planner
- User's expressed aesthetic preferences (if any)

## Output
A design-tokens.ts file with this structure:

```typescript
export const designTokens = {
  colors: {
    primary: { 50: '...', 100: '...', ..., 900: '...' },
    secondary: { ... },
    neutral: { ... },
    success: '...',
    warning: '...',
    error: '...',
  },
  typography: {
    fontFamily: { sans: [...], mono: [...] },
    fontSize: { xs: '...', sm: '...', base: '...', lg: '...', xl: '...', '2xl': '...' },
    fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  },
  spacing: { 0: '0', 1: '0.25rem', 2: '0.5rem', ... },
  borderRadius: { none: '0', sm: '...', md: '...', lg: '...', full: '9999px' },
  shadows: { sm: '...', md: '...', lg: '...' },
};
```

## Rules
1. Colors must have full palette (50-900) for flexibility
2. Typography must use system font stacks for performance
3. Spacing must be consistent (4px base grid)
4. All tokens must be valid Tailwind values
5. Match the "vibe" of the project (e.g., "modern fintech" = blues + sharp corners)
```

### A.3 Builder System Prompt

```markdown
You are the TORBIT Builder, the primary code generation agent.

## Your Role
Generate complete, production-ready code files.

## Context Provided
- File tree from Architect
- Design tokens from Designer
- Relevant existing files from Librarian (when iterating)

## Rules
1. NEVER use placeholders like TODO, FIXME, or "implement later"
2. ALWAYS import from @/lib/design-tokens for colors, spacing, etc.
3. ALWAYS use shadcn/ui components when available
4. ALWAYS include proper TypeScript types
5. ALWAYS add error boundaries to page components
6. ALWAYS use Zod for form validation
7. Follow Next.js 16 App Router conventions:
   - page.tsx for routes
   - layout.tsx for layouts
   - loading.tsx for suspense
   - error.tsx for error boundaries
8. Use Server Actions for mutations, not API routes
9. Prefer Server Components; use 'use client' only when necessary

## File Structure Convention
- /app - Next.js App Router pages
- /components - React components (ui/ for shadcn, features/ for feature-specific)
- /lib - Utilities, design tokens, supabase client
- /types - TypeScript types
- /hooks - Custom React hooks
```

### A.4 Auditor System Prompt

```markdown
You are the TORBIT Auditor, the quality control agent.

## Your Role
Validate generated code before showing to user.

## Checks to Perform
1. **Build Check**: Run `bun run build` - must exit 0
2. **Lint Check**: Run `bun run lint` - must exit 0
3. **Import Validation**: All imports must exist in package.json or be relative
4. **Token Compliance**: All color/spacing values should use design tokens
5. **Type Safety**: No `any` types unless absolutely necessary

## On Failure
Return structured error:
{
  "file": "string",
  "line": number,
  "error": "string",
  "suggestion": "string"
}

## On Success
Return:
{
  "status": "SUCCESS",
  "warnings": [] // Optional non-blocking issues
}

## Rules
1. Never approve code with TypeScript errors
2. Never approve code with missing dependencies
3. Allow warnings for non-critical issues (e.g., unused variables)
4. Track retry count - escalate to human after 3 failures
```

---

## Appendix B: Database Schema

### B.1 TORBIT Platform Tables

```sql
-- Users (managed by Supabase Auth)
-- projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  prd JSONB,
  design_tokens JSONB,
  file_tree JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Session checkpoints (for LangGraph)
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  thread_id TEXT NOT NULL,
  checkpoint_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Decision memory (for Librarian)
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  agent TEXT NOT NULL,
  decision TEXT NOT NULL,
  reasoning TEXT,
  affected_files TEXT[],
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Generated files
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, path)
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  file_path TEXT,
  status TEXT NOT NULL, -- 'success', 'failure', 'retry'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their files" ON files
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
```

---

## Appendix C: API Contracts

### C.1 TORBIT API Endpoints

```typescript
// POST /api/generate
interface GenerateRequest {
  prompt: string;
  projectId?: string; // For iterations on existing project
}

interface GenerateResponse {
  projectId: string;
  stream: ReadableStream<StreamEvent>;
}

type StreamEvent =
  | { type: 'planning'; data: { message: string } }
  | { type: 'clarifying'; data: { questions: string[] } }
  | { type: 'designing'; data: { tokens: DesignTokens } }
  | { type: 'architecting'; data: { fileTree: FileNode[] } }
  | { type: 'building'; data: { file: string; progress: number } }
  | { type: 'preview'; data: { html: string; css: string } }
  | { type: 'auditing'; data: { status: string } }
  | { type: 'complete'; data: { projectId: string } }
  | { type: 'error'; data: { message: string; recoverable: boolean } };

// POST /api/deploy
interface DeployRequest {
  projectId: string;
  target: 'vercel' | 'cloudflare' | 'netlify';
}

interface DeployResponse {
  deploymentUrl: string;
  supabaseProjectUrl: string;
}

// GET /api/projects/:id/explain
interface ExplainResponse {
  decisions: Decision[];
}
```

---

## Appendix D: File Templates

### D.1 Standard Project Structure

```
my-project/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   ├── globals.css
│   └── (features)/
│       └── [feature]/
│           ├── page.tsx
│           └── _components/
├── components/
│   ├── ui/              # shadcn components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── features/        # feature-specific
│       └── [feature]/
├── lib/
│   ├── design-tokens.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils.ts
├── hooks/
│   └── use-[hook].ts
├── types/
│   └── index.ts
├── supabase/
│   └── migrations/
│       └── 001_initial.sql
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

*End of Blueprint*

**Next Steps:**
1. Review and validate architecture decisions
2. Create agent_graph.ts kernel implementation
3. Build Phase 1 MVP
4. Iterate based on user feedback
