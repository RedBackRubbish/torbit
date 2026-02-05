<p align="center">
  <img src="public/torbit-logo.svg" alt="TORBIT" width="120" />
</p>

<h1 align="center">TORBIT</h1>

<p align="center">
  <strong>AI That Ships Production Code</strong><br/>
  Web apps. Mobile apps. One prompt. Export to Xcode or deploy to Vercel.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#governance">Governance</a> •
  <a href="#testing">Testing</a>
</p>

---

## Overview

TORBIT is a governed AI coding platform where **you talk to Torbit, not a swarm of agents**. Under the hood, specialized AI agents collaborate - but the UX is a single, accountable voice.

**Core philosophy:**
- 🎯 **Single voice** - Torbit is responsible. Agents are invisible infrastructure.
- 🛡️ **Visible governance** - Escalations surface only when needed.
- ⚡ **Invisible machinery** - No agent theater, no model names, no streaming reasoning.

### What Torbit can do:

- 📱 **Build iOS apps** - Expo/React Native, export for Xcode
- 🌐 **Build web apps** - Next.js 15, deploy to Vercel/Netlify  
- 📁 **Create files** - Full filesystem in the browser via WebContainers
- 🖥️ **Run commands** - npm, git, node, shell
- 👁️ **Live preview** - See the app as it's built
- 🔴 **Auto-fix errors** - Deterministic fixes with validation and audit rollback

---

## Features

### 🧠 Agent Hierarchy (Invisible to Users)

> This agent hierarchy is internal and never exposed in the user interface.

Behind the scenes, Torbit orchestrates specialized agents:

| Agent | Model | Role |
|-------|-------|------|
| **Strategist** | GPT-5.2 | Reviews plans. Never first mover. <10% of tokens. |
| **Planner** | Gemini Pro | Creates execution plans, delegates work. |
| **Architect** | Gemini Pro | System design, component hierarchy. |
| **Frontend** | Claude Sonnet 4.5 | Pixel-perfect UI implementation. |
| **Backend** | Kimi K2.5 | APIs, business logic, data layer. |
| **DevOps** | Gemini Flash | Infrastructure, builds, fast iteration. |
| **QA** | Gemini Flash | Testing, validation, fix loops. |
| **Auditor** | Claude Opus 4.5 | Quality gate. Judges only - never fixes. <10% of tokens. |

**Governance rule:** Premium models (GPT-5.2 + Opus) combined should be <10% of total tokens.

### 📱 Mobile App Export

Build iOS apps and export for Xcode:

- **Expo + React Native** - Cross-platform foundation
- **Native capabilities** - Camera, auth, push notifications
- **Preflight checks** - Bundle ID, signing, entitlements validation
- **One-click export** - Download Xcode-ready project

### 🛡️ Governance UI

Escalation is visible. Agents are not.

| Event | UX |
|-------|-----|
| **Normal build** | Subtle status: `Building… • UI • Backend` |
| **Strategist review** | Side panel slides in with structured verdict |
| **Auditor pass** | Single line: `Checks passed. Ready to export.` |
| **Auditor fail** | Inline card: Issues + `Correcting and re-running.` |

### ⛽ Fuel Economy

Token-based resource management:

- **Pre-flight estimation** - See costs before execution
- **Auditor Guarantee** - If code fails audit, fuel is refunded
- **Tier system** - Free (100/day) / Pro (5,000/mo) / Team (25,000/mo) / Enterprise (custom)

### 💳 Pricing & Billing

Transparent, fuel-based pricing with no hidden fees:

| Plan | Price | Fuel | Features |
|------|-------|------|----------|
| **Free** | $0 | 100/day | All AI models, unlimited projects, GitHub export |
| **Pro** | $29/mo | 5,000/mo | + Fuel packs, priority support |
| **Team** | $99/mo | 25,000/mo | + 5 members, shared pool, usage analytics |
| **Enterprise** | Custom | Custom | + SSO/SAML, SLA, dedicated support |

**Fuel Packs** (one-time purchases for Pro/Team):
- Emergency Rod: 500 fuel / $9
- Jerry Can: 2,500 fuel / $29
- Reactor Core: 10,000 fuel / $99

**Billing Dashboard** (`/dashboard/billing`):
- View current plan and fuel balance
- Upgrade subscription via Stripe
- Purchase fuel packs
- Access Stripe customer portal

### 🔴 Nervous System

Self-healing error detection with 15+ patterns:

```
┌─────────────────┬──────────────────────────────────────────┐
│ Error Type      │ Auto-Response                            │
├─────────────────┼──────────────────────────────────────────┤
│ DEPENDENCY_ERROR│ Install missing package                  │
│ SYNTAX_ERROR    │ Locate and fix typo                      │
│ TYPE_ERROR      │ Add TypeScript annotations               │
│ HYDRATION_ERROR │ Wrap in useEffect or dynamic()           │
│ BUILD_ERROR     │ Analyze and fix root cause               │
│ RUNTIME_ERROR   │ Debug and patch                          │
└─────────────────┴──────────────────────────────────────────┘
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         TORBIT PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   ChatPanel │───▶│  Orchestrator│───▶│   Agent Router      │ │
│  │  "Torbit"   │    │  SSE Stream │    │  (Model Selection)  │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                                        │              │
│         │                                        ▼              │
│         │           ┌────────────────────────────────────────┐ │
│         │           │            GOVERNANCE LAYER            │ │
│         │           │  ┌──────────┐ ┌──────────┐ ┌────────┐ │ │
│         │           │  │Strategist│ │ Auditor  │ │Escalate│ │ │
│         │           │  │ (GPT-5.2)│ │ (Opus)   │ │  UI    │ │ │
│         │           │  └──────────┘ └──────────┘ └────────┘ │ │
│         │           └────────────────────────────────────────┘ │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    EXECUTOR SERVICE                         ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ ││
│  │  │ createFile│ │ editFile │ │runTerminal│ │ installPackage │ ││
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    WEBCONTAINER                             ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ ││
│  │  │ Filesystem│ │ Terminal │ │ npm/node │ │  Dev Server    │ ││
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   NERVOUS SYSTEM                            ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ ││
│  │  │ Terminal │ │ Browser  │ │ Build    │ │  Reflex Arc    │ ││
│  │  │ Monitor  │ │ Console  │ │ Errors   │ │  (Auto-fix)    │ ││
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/chat/          # SSE streaming endpoint
│   ├── builder/           # Main IDE interface
│   └── globals.css        # Global styles
├── components/
│   ├── builder/           # IDE components
│   │   ├── ChatPanel.tsx      # Single-voice chat ("Torbit")
│   │   ├── FileExplorer.tsx   # File tree browser
│   │   ├── PreviewPanel.tsx   # Live preview iframe
│   │   ├── PublishPanel.tsx   # iOS export flow
│   │   ├── governance/        # Escalation UI components
│   │   │   ├── SupervisorReviewPanel.tsx
│   │   │   ├── QualityGateResult.tsx
│   │   │   ├── InspectorView.tsx
│   │   │   └── EscalationMessage.tsx
│   │   └── chat/              # Message components
│   └── ui/               # Reusable UI components
├── lib/
│   ├── agents/           # AI agent system
│   │   ├── orchestrator.ts    # Agent routing
│   │   ├── models.ts          # Model configuration
│   │   ├── router.ts          # Kimi intelligent routing
│   │   └── prompts/           # Agent prompts
│   │       ├── strategist.ts  # GPT-5.2 plan validator
│   │       ├── planner.ts     # Gemini Pro planner
│   │       ├── architect.ts   # System design
│   │       ├── frontend.ts    # UI specialist
│   │       ├── auditor.ts     # Quality gate (read-only)
│   │       └── qa.ts          # Testing & fixes
│   ├── tools/            # Tool definitions
│   │   ├── definitions.ts     # Tool schemas per agent
│   │   └── executor.ts        # Tool execution
│   ├── mobile/           # iOS export system
│   │   ├── export.ts          # Bundle generation
│   │   └── validation.ts      # Preflight checks
│   ├── nervous-system.ts # Error detection
│   └── webcontainer.ts   # WebContainer singleton
├── services/
│   └── executor.ts       # ExecutorService
└── store/                # Zustand state
    ├── fuel.ts          # Token economy
    ├── builder.ts       # App state
    └── terminal.ts      # Terminal output
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Modern browser with SharedArrayBuffer support (Chrome, Edge, Firefox)

### Installation

```bash
# Clone the repository
git clone https://github.com/RedBackRubbish/torbit.git
cd torbit

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Add your API keys to .env.local
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_GENERATIVE_AI_API_KEY=...
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

---

## Environment Variables

Create a `.env.local` file with the following:

```env
# AI Provider API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...

# Default Model (optional)
DEFAULT_MODEL=claude-sonnet-4-20250514

# System Configuration (optional)
TORBIT_SYSTEM_MODE=development
TORBIT_MAX_ITERATIONS=50
TORBIT_ENABLE_AUDITOR=true
TORBIT_ENABLE_STRATEGIST=true
```

---

## Documentation

### Single Voice Architecture

Torbit speaks as **one entity**, not a swarm:

- **User sees:** "Building…", "Updating layout…", "Correcting and re-running."
- **User never sees:** "Frontend Agent is thinking…", "Claude Sonnet 4.5 processing…"
- **Governance surfaces only when needed:** Escalation panels slide in for supervisor review

### Governance Contracts

| Role | Model | Contract | Token Budget |
|------|-------|----------|--------------|
| **Strategist** | GPT-5.2 | Reviews plans, never first mover | <10% |
| **Auditor** | Claude Opus 4.5 | Judges quality, never fixes | <10% |
| **Executors** | All others | Build, fix, ship | Bulk tokens |

### Tool Reference

| Tool | Cost | Description |
|------|------|-------------|
| `readFile` | 2 | Read file contents |
| `createFile` | 5 | Create a new file |
| `editFile` | 8 | Modify existing file |
| `deleteFile` | 3 | Remove file or directory |
| `listFiles` | 2 | List directory contents |
| `runTerminal` | 15 | Execute shell command |
| `installPackage` | 25 | npm install a package |
| `think` | 10 | Record reasoning step |

### Quality Gate

The Auditor implements a "hold and finalize" pattern:

1. **Hold** - When build starts, fuel is reserved
2. **Build** - Agents create files, run commands
3. **Audit** - Auditor checks for errors, TypeScript issues, security
4. **Finalize or Refund**:
   - ✅ Audit passes → Fuel charged
   - ❌ Audit fails → Fuel refunded, issues surfaced

Users only pay for working code.

### Security

Torbit never commits or echoes secrets to the filesystem or terminal output. API keys are server-side only.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.1.6 (App Router, Turbopack) |
| **Runtime** | React 19.2.3 |
| **Language** | TypeScript 5 (strict mode) |
| **Styling** | Tailwind CSS 4 |
| **Animation** | Framer Motion 12 (250ms ease-in) |
| **State** | Zustand 5 (with immer & persist) |
| **AI SDK** | Vercel AI SDK 6 (Anthropic, Google, OpenAI, OpenRouter) |
| **Editor** | Monaco Editor |
| **Container** | WebContainer API |
| **Testing** | Vitest 4, Testing Library |
| **Validation** | Zod 4 |

---

## Browser Requirements

TORBIT requires browsers that support:

- **SharedArrayBuffer** - For WebContainer multi-threading
- **Cross-Origin Isolation** - COOP/COEP headers configured

Supported browsers:
- ✅ Chrome 92+
- ✅ Edge 92+
- ✅ Firefox 79+
- ⚠️ Safari (limited support)

---

## Enterprise Governance

TORBIT includes a complete enterprise governance stack:

### Environment Profiles

Environment-aware rules: Local ≠ Staging ≠ Production.

```json
// .integrations/environments.json
{
  "local": {
    "allowAutoFix": true,
    "allowExperimentalIntegrations": true,
    "exportRequiresCleanLedger": false
  },
  "staging": {
    "allowAutoFix": false,
    "blockedOnDrift": true,
    "requireHumanApprovalFor": ["payments", "auth"]
  },
  "production": {
    "allowAutoFix": false,
    "blockedOnDrift": true,
    "exportRequiresCleanLedger": true,
    "denyIntegrations": ["experimental-*"]
  }
}
```

**Rule resolution order** (most restrictive wins):
1. Environment profile
2. Organization policy
3. Integration manifest
4. User intent

### Organization Policies

Define hard constraints that TORBIT must obey:

```json
// .integrations/policies.json
{
  "integrations": {
    "allow": ["stripe", "supabase", "clerk"],
    "deny": ["firebase"]
  },
  "categories": {
    "requireHumanApproval": ["payments", "auth"]
  },
  "autoFix": {
    "enabled": true,
    "requireApproval": true
  },
  "shipping": {
    "blockOnDrift": true,
    "requireCleanLedger": true,
    "requireAuditorPass": true
  }
}
```

### Integration Health

Version drift detection, deprecation tracking, and health triggers:

- **Pre-export checks** - Block exports with unresolved drift
- **Deprecation warnings** - Flag deprecated SDKs before they break
- **Auto-remediation** - Consent-gated fixes with audit trail

### Audit Ledger

Immutable, append-only record of every integration action:

- 24 event types tracked
- Compliance reports on export
- SOC2/audit-ready evidence bundles

### Knowledge Awareness

**Torbit may sense the world. Torbit may not blindly react to it.**

#### Approved Sources (Tiered)

| Tier | Sources | Rule |
|------|---------|------|
| **Tier 1** | React, Next.js, Expo, Node.js, TypeScript | Always allowed |
| **Tier 1** | Vercel, Apple, Google, AWS, Cloudflare | Platform reality |
| **Tier 1** | Stripe, Clerk, Supabase, Sentry, SendGrid | Integration truth |
| **Tier 1** | npm advisories, GitHub Security, CVEs | Security facts |
| **Tier 2** | RFCs, W3C drafts, roadmap posts | Suggestion-only |
| **Forbidden** | Reddit, Medium, Dev.to, HN, Twitter, YouTube | Hard ban |

#### Suggestion UX (Locked)

```
────────────────────────────────
Torbit:
"I'll build this using Next.js App Router."

▶ Suggestions (optional):
• Add authentication (common for SaaS apps)
• Enable Stripe test mode
• Add error tracking (Sentry)
[Apply] [Dismiss]
────────────────────────────────
```

| Rule | Enforcement |
|------|-------------|
| Max 3 suggestions | Hard limit |
| Confidence >= 0.8 | Threshold |
| Default: collapsed | UX |
| Never auto-apply | Governance |
| Strategist approval | Required |

**User actions:**
- **Apply** → Triggers integration flow (Manifest → Governance → Consent)
- **Dismiss** → Logged once, never shown again for this project
- **Ignore** → No penalty, no re-surface

#### Knowledge Boundary (Charter)

| ✅ Allowed | ❌ Forbidden |
|-----------|-------------|
| Stable defaults | Opinionated trends |
| Deprecations | Community sentiment |
| Security facts | Experimental tech* |
| Vendor best practices | Forecasts |

*Unless user explicitly opts in: "use experimental"

**Correct tone:** "I'll use the current production default."
**Forbidden tone:** "This is the hottest new framework."

### Evidence Bundles

Export compliance evidence alongside your app:

```
/compliance/
├── AUDIT_REPORT.md          # Human-readable compliance report
├── ATTESTATION.txt          # Signed attestation statement
├── INTEGRATIONS_LEDGER.json # Complete action history
├── POLICY_SNAPSHOT.json     # Policy at export time
├── ENVIRONMENT_PROFILE.json # Environment rules at export
├── HEALTH_STATUS.json       # Health status at export
├── KNOWLEDGE_EVENTS.json    # Knowledge usage audit trail
└── MANIFEST.json            # File inventory with hashes
```

**Attestation example:**
```
This build was exported on Wednesday, February 5, 2026.

Environment:        PRODUCTION
Policy:             STRICT_POLICY
Integration Health: ✓ CLEAN
Version Drift:      ✓ NONE
Auditor:            ✓ PASSED
Strategist:         ✓ PASSED

                      ✓ COMPLIANT
         This export meets all governance requirements.
```

**Export options:**
- Toggle: "Include Compliance Evidence" (default ON for production)
- All files are read-only, deterministic, hashable, no secrets

### Project Memory (Directive I)

**The last stabilizer before TORBIT scales.**

Project knowledge is frozen on first execution and protected from drift:

#### Knowledge Snapshot

Created automatically on first execution:

```json
// .project/knowledge.json
{
  "createdAt": "2026-02-05T12:00:00Z",
  "frameworks": {
    "nextjs": "15.1",
    "react": "19",
    "expo": "52"
  },
  "assumptions": [
    "App Router default",
    "Server Components available",
    "Payment Intents API"
  ],
  "confidence": 0.94,
  "freezeMode": "frozen",
  "snapshotHash": "snap-a7f3c..."
}
```

#### Freeze Modes

| Mode | Behavior | Allowed Environment |
|------|----------|---------------------|
| **Frozen** | No new knowledge injected | All (default in production) |
| **Advisory** | Suggestions allowed, no auto-apply | Local, Staging |
| **Live** | Suggestions + updates allowed | Local only |

**Production environment forces Frozen mode.** No exceptions.

#### UX

Minimal badge in toolbar:

```
❄️ Knowledge: Frozen (94%)
```

One-click "Review Knowledge" opens panel showing:
- Frameworks detected
- Assumptions applied
- Sources consulted
- Freeze mode controls (if not production)

#### Ledger Events

| Event | When |
|-------|------|
| `KNOWLEDGE_SNAPSHOT_CREATED` | First execution |
| `KNOWLEDGE_FROZEN` | Mode locked |
| `KNOWLEDGE_MODE_CHANGED` | Mode switch |
| `KNOWLEDGE_OVERRIDE_REQUESTED` | User wants update |
| `KNOWLEDGE_OVERRIDE_RESOLVED` | Request approved/denied |
| `KNOWLEDGE_EXPORTED` | Snapshot exported |
| `KNOWLEDGE_INTEGRITY_VERIFIED` | Hash checked |

#### Guarantees

- **Deterministic rebuilds** - Same snapshot = same behavior
- **Audit-proof explanations** - "Here's why I assumed X"
- **Reproducibility years later** - Frozen facts never change
- **No silent drift** - Projects stay exactly as intended

---

## Testing

TORBIT maintains comprehensive test coverage across all core systems:

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

**Test Statistics:**
- **30 test files** covering stores, hooks, components, and libraries
- **468 tests passing** with full CI/CD integration
- **Key coverage areas:**
  - Fuel economy (35 tests)
  - Timeline/state management (34 tests)
  - Nervous system / error detection (28 tests)
  - Agent routing (26 tests)
  - Orchestrator (25 tests)
  - Terminal store (23 tests)
  - WebContainer integration (20 tests)

---

## Roadmap

- [x] **Mobile App Export** - Export iOS apps via Expo + Xcode
- [ ] **Android Export** - Android packaging support
- [x] **Multi-Agent Governance** - Strategist review, Auditor quality gate
- [x] **Environment Profiles** - Local/Staging/Production rule enforcement
- [x] **Organization Policies** - Enterprise policy-as-code
- [x] **Integration Health** - Drift detection, deprecation tracking
- [x] **Audit Ledger** - Immutable provenance trail
- [x] **Evidence Bundles** - SOC2-ready compliance exports
- [x] **Knowledge Awareness** - Governed trend sensing, approved sources only
- [x] **Project Memory** - Knowledge freezing, deterministic rebuilds
- [x] **Pricing & Billing** - Stripe integration, fuel packs, billing dashboard
- [x] **Success Metrics** - Internal tracking for time-to-first-success
- [ ] **Capacitor Export** - Native iOS/Android wrappers (Phase 8)
- [ ] **Persistent Projects** - Save/load to cloud storage
- [ ] **Git Integration** - Commit, push, pull from IDE
- [ ] **Deployment** - One-click deploy to Vercel/Netlify
- [ ] **Collaboration** - Real-time multi-user editing
- [ ] **Plugin System** - Extend with custom tools

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by the TORBIT team
</p>
