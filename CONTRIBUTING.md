# Contributing to Torbit

Thank you for your interest in contributing to Torbit! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Assume good intentions
- Respect differing viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Git

### Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/torbit.git
   cd torbit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Verify setup**
   ```bash
   npm run test:run   # Run unit tests
   npm run build      # Verify build works
   npm run lint       # Check for lint errors
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feat/` - New features (e.g., `feat/multi-agent-chat`)
- `fix/` - Bug fixes (e.g., `fix/preview-reload`)
- `docs/` - Documentation updates (e.g., `docs/api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/chat-panel`)
- `test/` - Test additions/updates (e.g., `test/agent-orchestrator`)
- `chore/` - Maintenance tasks (e.g., `chore/update-deps`)

### Commit Messages

Follow [Conventional Commits](https://conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Code restructuring
- `test` - Test additions
- `chore` - Maintenance

**Examples:**
```
feat(chat): add multi-agent message threading

fix(preview): resolve hot reload race condition

docs: update API documentation for rate limiting
```

### Development Commands

```bash
# Development
npm run dev           # Start development server
npm run build         # Production build
npm run start         # Start production server

# Testing
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run with coverage
npm run test:e2e      # Run Playwright E2E tests
npm run test:e2e:ui   # Run E2E with interactive UI

# Quality
npm run lint          # Run ESLint
npm run analyze       # Analyze bundle size

# Documentation
npm run storybook     # Start Storybook
npm run build-storybook # Build Storybook
```

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**
   ```bash
   npm run test:run
   npm run build
   ```

2. **Check for lint errors**
   ```bash
   npm run lint
   ```

3. **Update documentation** if needed

4. **Add tests** for new functionality

### PR Requirements

- [ ] Clear, descriptive title following commit conventions
- [ ] Description explaining what and why
- [ ] All tests passing
- [ ] No lint errors
- [ ] Documentation updated (if applicable)
- [ ] Screenshots for UI changes

### Review Process

1. Submit PR to `main` branch
2. Automated checks run (tests, lint, build)
3. Code review by maintainers
4. Address feedback
5. Merge when approved

## Coding Standards

### TypeScript

- Enable strict mode
- Use proper typing (avoid `any`)
- Prefer interfaces over types for objects
- Use branded types for IDs (see `src/lib/branded-types.ts`)

```typescript
// ✅ Good
interface User {
  id: UserId
  name: string
}

// ❌ Avoid
const user: any = { id: '123', name: 'test' }
```

### React

- Use functional components with hooks
- Memoize expensive computations
- Extract reusable logic into custom hooks
- Keep components focused and small (<300 lines)

```typescript
// ✅ Good
const MessageBubble = memo(function MessageBubble({ message }: Props) {
  const formattedTime = useMemo(() => formatTime(message.timestamp), [message.timestamp])
  return <div>{message.text} - {formattedTime}</div>
})

// ❌ Avoid
function MessageBubble({ message }) {
  return <div>{message.text} - {formatTime(message.timestamp)}</div>
}
```

### File Organization

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── builder/      # Builder-specific components
│   ├── landing/      # Landing page components
│   ├── ui/           # Reusable UI components
│   └── effects/      # Visual effects
├── hooks/            # Custom React hooks
├── lib/              # Utilities and business logic
├── providers/        # React context providers
├── services/         # External service integrations
├── store/            # Zustand state stores
└── test/             # Test utilities and setup
```

### Naming Conventions

- **Components:** PascalCase (`ChatPanel.tsx`)
- **Hooks:** camelCase with `use` prefix (`useWebContainer.ts`)
- **Utilities:** camelCase (`formatTime.ts`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_TOKENS`)
- **Types/Interfaces:** PascalCase (`MessageProps`)

## Testing Guidelines

### Unit Tests

- Co-locate with source files (`Component.tsx` + `Component.test.tsx`)
- Test behavior, not implementation
- Use descriptive test names

```typescript
describe('ChatPanel', () => {
  it('should display user message after sending', async () => {
    // ...
  })

  it('should show error state when API fails', async () => {
    // ...
  })
})
```

### E2E Tests

Located in `e2e/` directory:

```typescript
test('should navigate from landing to builder', async ({ page }) => {
  await page.goto('/')
  await page.fill('input', 'Build a todo app')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/builder')
})
```

### Test Coverage

Aim for meaningful coverage, not 100%:

- Critical paths: 90%+
- UI components: 70%+
- Utilities: 80%+

## Documentation

### Code Comments

- Document "why", not "what"
- Use JSDoc for public APIs
- Keep comments updated

```typescript
/**
 * Executes a tool call and returns the result
 * 
 * @param tool - The tool definition to execute
 * @param args - Arguments passed to the tool
 * @returns The execution result or error
 * 
 * @example
 * const result = await executeTool(createFileTool, { path: '/src/app.tsx', content: '...' })
 */
export async function executeTool(tool: ToolDefinition, args: unknown): Promise<ToolResult> {
  // ...
}
```

### Storybook

Add stories for UI components:

```typescript
// MatrixButton.stories.tsx
export const Primary: Story = {
  args: {
    children: 'Click me',
    variant: 'primary',
  },
}
```

## Architecture Decisions

When making significant changes, consider:

1. **Performance:** Will this affect bundle size or runtime?
2. **Accessibility:** Is the UI accessible?
3. **Security:** Are there security implications?
4. **Maintainability:** Is this easy to understand and modify?

For major changes, open an issue first to discuss the approach.

## Getting Help

- **Issues:** Search existing issues or create a new one
- **Discussions:** Use GitHub Discussions for questions
- **Discord:** Join our community (link in README)

## Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Special thanks in documentation

---

Thank you for contributing to Torbit! Your efforts help make AI-powered development accessible to everyone. 🚀
