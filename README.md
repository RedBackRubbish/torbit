<p align="center">
  <img src="public/torbit-logo.svg" alt="TORBIT" width="120" />
</p>

<h1 align="center">TORBIT</h1>

<p align="center">
  <strong>The Autonomous AI Coding Platform</strong><br/>
  Build full-stack applications with AI agents that write, test, and deploy code in real-time.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#testing">Testing</a>
</p>

---

## Overview

TORBIT is an autonomous AI coding platform that gives AI agents a **living body** to build software. Unlike traditional coding assistants that only suggest code, TORBIT's agents can:

- 📁 **Create, edit, and delete files** directly in a real filesystem
- 🖥️ **Run terminal commands** (npm, git, node, etc.)
- 👁️ **See live preview** of the application being built
- 🔴 **Feel errors** through a nervous system that detects and auto-fixes issues
- ⛽ **Manage resources** through a fuel-based token economy

All of this runs **entirely in the browser** using WebContainers - no server-side code execution required.

---

## Features

### 🧠 Multi-Agent System

TORBIT uses specialized AI agents that work together:

| Agent | Role | Description |
|-------|------|-------------|
| **Planner** | 🎯 Strategy | Analyzes tasks, breaks them into steps, estimates fuel costs |
| **Architect** | 📐 Design | Designs system architecture, file structure, component hierarchy |
| **Builder** | 🔨 Execution | Writes code, runs commands, creates files |
| **Auditor** | ✅ Quality | Reviews code for errors, security issues, best practices |
| **DevOps** | 🚀 Deployment | Handles builds, tests, and deployment preparation |

### ⚡ WebContainer Runtime

Full Node.js environment running in your browser:

- **Real filesystem** - Files are created and persisted
- **npm support** - Install any package from the registry
- **Hot reload** - See changes instantly in the preview
- **Terminal output** - Full command output visibility

### 🔴 Nervous System

Self-healing error detection with 15+ patterns:

```
┌─────────────────┬──────────────────────────────────────────┐
│ Error Type      │ Auto-Response                            │
├─────────────────┼──────────────────────────────────────────┤
│ DEPENDENCY_ERROR│ npm install the missing package          │
│ SYNTAX_ERROR    │ Read file, locate typo, fix it           │
│ TYPE_ERROR      │ Add proper TypeScript annotations        │
│ HYDRATION_ERROR │ Wrap in useEffect or use dynamic()       │
│ BUILD_ERROR     │ Analyze error, fix the root cause        │
│ RUNTIME_ERROR   │ Debug and patch the issue                │
└─────────────────┴──────────────────────────────────────────┘
```

### ⛽ Fuel Economy

Token-based resource management with the **Auditor Guarantee**:

- **Pre-flight estimation** - See costs before execution
- **Hold pattern** - Fuel is held, not charged, during builds
- **Quality guarantee** - If code fails audit, user gets refunded
- **Tier system** - Standard (1,000) / Pro (5,000) / Enterprise (25,000)

### 🎯 Neural Timeline

Real-time visibility into AI reasoning:

- Step-by-step execution tracking
- Agent attribution for each action
- Expandable "thinking" output
- Success/failure status indicators

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         TORBIT PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   ChatPanel │───▶│ SSE Stream  │───▶│  Agent Middleware   │ │
│  │  (React UI) │    │ /api/chat   │    │  (Anthropic/Google) │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    EXECUTOR SERVICE                         ││
│  │              "The Spinal Cord"                              ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ ││
│  │  │ createFile│ │ editFile │ │runTerminal│ │ installPackage │ ││
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    WEBCONTAINER                             ││
│  │              "The Body"                                     ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ ││
│  │  │ Filesystem│ │ Terminal │ │ npm/node │ │  Dev Server    │ ││
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   NERVOUS SYSTEM                            ││
│  │              "Pain Receptors"                               ││
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
│   │   ├── ChatPanel.tsx      # AI chat interface
│   │   ├── FileExplorer.tsx   # File tree browser
│   │   ├── PreviewPanel.tsx   # Live preview iframe
│   │   ├── FuelGauge.tsx      # Fuel meter display
│   │   ├── NeuralTimeline.tsx # Step tracking sidebar
│   │   └── BuilderLayout.tsx  # Main layout
│   ├── effects/           # Visual effects
│   └── ui/               # Reusable UI components
├── hooks/
│   └── useToolExecutor.ts # React hook for tool execution
├── lib/
│   ├── agents/           # AI agent configurations
│   │   ├── orchestrator.ts    # Agent routing logic
│   │   └── prompts/           # System prompts
│   │       └── god-prompt.ts  # Master instruction
│   ├── tools/            # Tool definitions
│   │   ├── definitions.ts     # Tool schemas
│   │   └── executor.ts        # Tool execution logic
│   ├── nervous-system.ts # Error detection & dispatch
│   └── webcontainer.ts   # WebContainer singleton
├── services/
│   └── executor.ts       # ExecutorService (Spinal Cord)
├── store/                # Zustand state management
│   ├── fuel.ts          # Fuel economy state
│   ├── timeline.ts      # Neural timeline state
│   └── terminal.ts      # Terminal output state
└── providers/
    └── WebContainerProvider.tsx
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

# Default Model (optional)
DEFAULT_MODEL=claude-sonnet-4-20250514

# System Configuration (optional)
TORBIT_SYSTEM_MODE=development
TORBIT_MAX_ITERATIONS=50
TORBIT_ENABLE_AUDITOR=true
TORBIT_ENABLE_PLANNER=true
```

---

## Documentation

### The God Prompt

Every AI agent receives the "God Prompt" - a comprehensive system instruction that teaches them:

1. **Identity** - They are TORBIT, an autonomous coding agent with a living body
2. **Tools** - How to use file operations, terminal commands, and package management
3. **Nervous System** - How to respond to pain signals (errors)
4. **Fuel Economics** - How to be efficient with token usage
5. **Workflow Protocol** - Reconnaissance → Execution → Verification
6. **Tech Stack** - Next.js 15, React 19, TypeScript, Tailwind, App Router

### Tool Reference

| Tool | Fuel Cost | Description |
|------|-----------|-------------|
| `readFile` | 2 | Read file contents |
| `createFile` | 5 | Create a new file |
| `editFile` | 8 | Modify existing file |
| `deleteFile` | 3 | Remove file or directory |
| `listFiles` | 2 | List directory contents |
| `runTerminal` | 15 | Execute shell command |
| `installPackage` | 25 | npm install a package |
| `runTests` | 30 | Run test suite |
| `think` | 10 | Record reasoning step |

### Auditor Guarantee

The fuel system implements a "hold and finalize" pattern:

1. **Hold** - When Builder starts, fuel is reserved (not charged)
2. **Build** - Builder creates files, runs commands
3. **Audit** - Auditor checks for errors, TypeScript issues, security
4. **Finalize or Refund**:
   - ✅ Audit passes → Fuel is charged
   - ❌ Audit fails → Fuel is refunded

This ensures users only pay for working code.

---

## Testing

TORBIT has comprehensive test coverage with **312 tests** across all systems.

### Running Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

### Test Suites

| Suite | Tests | Coverage |
|-------|-------|----------|
| `nervous-system.test.ts` | 28 | Error detection, debouncing, pain dispatch |
| `executor.test.ts` | 22 | Tool routing, WebContainer ops, error handling |
| `fuel.test.ts` | 23 | Fuel economy, Auditor Guarantee, tiers |
| `timeline.test.ts` | 34 | Step tracking, status transitions, agents |
| `terminal.test.ts` | 23 | Command logging, output types, limits |
| `webcontainer.test.ts` | 20 | FS operations, process spawning |
| `god-prompt.test.ts` | 35 | Prompt structure, content validation |
| `useToolExecutor.test.ts` | 8 | React hook, batch execution |
| UI Components | 50+ | MatrixButton, MatrixCard, GlitchText, etc. |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.1.6 (App Router, Turbopack) |
| **Runtime** | React 19.2.3 |
| **Language** | TypeScript 5 (strict mode) |
| **Styling** | Tailwind CSS 4 |
| **Animation** | Framer Motion 12 |
| **State** | Zustand 5 (with immer & persist) |
| **AI SDK** | Vercel AI SDK 6 (Anthropic, Google) |
| **Editor** | Monaco Editor |
| **Container** | WebContainer API |
| **Testing** | Vitest 4, Testing Library |
| **Validation** | Zod 4 |

---

## Browser Requirements

TORBIT requires browsers that support:

- **SharedArrayBuffer** - For WebContainer multi-threading
- **Cross-Origin Isolation** - COOP/COEP headers are configured

Supported browsers:
- ✅ Chrome 92+
- ✅ Edge 92+
- ✅ Firefox 79+
- ⚠️ Safari (limited support)

---

## Roadmap

- [ ] **Persistent Projects** - Save/load projects to cloud storage
- [ ] **Git Integration** - Commit, push, pull from the IDE
- [ ] **Deployment** - One-click deploy to Vercel/Netlify
- [ ] **Collaboration** - Real-time multi-user editing
- [ ] **Custom Agents** - User-defined agent personalities
- [ ] **Plugin System** - Extend with custom tools
- [ ] **Mobile Support** - Responsive IDE for tablets

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
