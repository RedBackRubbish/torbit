/**
 * INTEGRATION CAPABILITIES
 * 
 * These are discoverable capabilities, NOT configuration.
 * Chips express intent → AI interprets → mocked by default.
 * 
 * Philosophy:
 * - Capabilities, not credentials
 * - Intent flags, not setup
 * - Mocked by default, always
 */

export interface IntegrationCapability {
  id: string
  label: string
  description: string
  icon: string // Lucide icon name
  keywords: string[] // For AI context
  mocked: {
    provider: string
    behavior: string
  }
}

export const INTEGRATION_CAPABILITIES: IntegrationCapability[] = [
  {
    id: 'payments',
    label: 'Payments',
    description: 'Accept payments, subscriptions, invoices',
    icon: 'CreditCard',
    keywords: ['stripe', 'payments', 'checkout', 'subscriptions', 'billing', 'invoices'],
    mocked: {
      provider: 'Stripe-compatible',
      behavior: 'Simulated checkout flows, test card responses',
    },
  },
  {
    id: 'auth',
    label: 'Auth',
    description: 'User authentication, sessions, roles',
    icon: 'Shield',
    keywords: ['authentication', 'login', 'signup', 'users', 'sessions', 'oauth', 'roles'],
    mocked: {
      provider: 'Supabase-compatible',
      behavior: 'Fake users, session management, role checks',
    },
  },
  {
    id: 'database',
    label: 'Database',
    description: 'Persistent data, queries, real-time',
    icon: 'Database',
    keywords: ['database', 'postgres', 'sql', 'data', 'storage', 'queries', 'real-time'],
    mocked: {
      provider: 'Postgres-compatible',
      behavior: 'In-memory data store, seeded test data',
    },
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Transactional emails, notifications',
    icon: 'Mail',
    keywords: ['email', 'notifications', 'transactional', 'resend', 'sendgrid'],
    mocked: {
      provider: 'Resend-compatible',
      behavior: 'Console logs, "sent" confirmations',
    },
  },
  {
    id: 'ai',
    label: 'AI / LLM',
    description: 'Chat, embeddings, completions',
    icon: 'Sparkles',
    keywords: ['ai', 'llm', 'openai', 'claude', 'chat', 'embeddings', 'completions'],
    mocked: {
      provider: 'OpenAI-compatible',
      behavior: 'Canned responses, simulated streaming',
    },
  },
  {
    id: 'storage',
    label: 'File Storage',
    description: 'Upload, store, serve files',
    icon: 'HardDrive',
    keywords: ['storage', 'files', 'uploads', 's3', 'cdn', 'images'],
    mocked: {
      provider: 'S3-compatible',
      behavior: 'Local blob storage, placeholder URLs',
    },
  },
  {
    id: 'maps',
    label: 'Maps',
    description: 'Location, geocoding, directions',
    icon: 'MapPin',
    keywords: ['maps', 'location', 'geocoding', 'google maps', 'directions'],
    mocked: {
      provider: 'Google Maps-compatible',
      behavior: 'Static tiles, placeholder markers',
    },
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Track events, pageviews, funnels',
    icon: 'BarChart3',
    keywords: ['analytics', 'tracking', 'events', 'pageviews', 'metrics'],
    mocked: {
      provider: 'Mixpanel-compatible',
      behavior: 'Console logs, no-op tracking',
    },
  },
]

// Get capabilities by IDs
export function getCapabilitiesById(ids: string[]): IntegrationCapability[] {
  return INTEGRATION_CAPABILITIES.filter(cap => ids.includes(cap.id))
}

// Generate AI context from selected capabilities
export function getCapabilityContext(ids: string[]): string {
  if (ids.length === 0) return ''
  
  const capabilities = getCapabilitiesById(ids)
  
  return `
USER SELECTED CAPABILITIES (integrate these, mocked by default):
${capabilities.map(cap => `- ${cap.label}: ${cap.description} (${cap.mocked.provider})`).join('\n')}

For each capability:
- Generate appropriate UI components and flows
- Use mocked implementations that work without real API keys
- Structure code to allow easy swap to real providers later
`
}

// Primary capabilities shown by default (max 6)
export const PRIMARY_CAPABILITIES = ['payments', 'auth', 'database', 'email', 'ai', 'storage']

// Secondary capabilities in "More" dropdown
export const SECONDARY_CAPABILITIES = ['maps', 'analytics']
