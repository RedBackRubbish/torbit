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

export interface CapabilityArtifact {
  path: string
  purpose: string
}

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
  // What Torbit will scaffold (read-only preview)
  artifacts: CapabilityArtifact[]
  // What the user sees in preview
  preview: {
    headline: string
    features: string[]
  }
  // Internal: for future pricing signals (not exposed)
  costWeight: 'low' | 'medium' | 'high'
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
    artifacts: [
      { path: 'lib/payments/client.ts', purpose: 'Payment provider client' },
      { path: 'lib/payments/mock.ts', purpose: 'Simulated payment responses' },
      { path: 'app/api/checkout/route.ts', purpose: 'Checkout session endpoint' },
      { path: 'app/api/webhooks/stripe/route.ts', purpose: 'Webhook handler' },
      { path: 'components/checkout/PricingTable.tsx', purpose: 'Pricing display' },
    ],
    preview: {
      headline: 'Payments capability',
      features: [
        'Checkout flow scaffolded',
        'Subscription-ready schema',
        'Webhook handlers included',
        'Mock Stripe-compatible provider',
      ],
    },
    costWeight: 'high',
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
    artifacts: [
      { path: 'lib/auth/client.ts', purpose: 'Auth provider client' },
      { path: 'lib/auth/mock.ts', purpose: 'Simulated users and sessions' },
      { path: 'app/api/auth/[...nextauth]/route.ts', purpose: 'Auth routes' },
      { path: 'components/auth/LoginForm.tsx', purpose: 'Login UI' },
      { path: 'components/auth/SignupForm.tsx', purpose: 'Signup UI' },
      { path: 'middleware.ts', purpose: 'Route protection' },
    ],
    preview: {
      headline: 'Auth capability',
      features: [
        'Login & signup flows',
        'Session management',
        'Role-based access ready',
        'Mock Supabase-compatible provider',
      ],
    },
    costWeight: 'medium',
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
    artifacts: [
      { path: 'lib/db/client.ts', purpose: 'Database client' },
      { path: 'lib/db/mock.ts', purpose: 'In-memory data store' },
      { path: 'lib/db/schema.ts', purpose: 'Type-safe schema' },
      { path: 'lib/db/seed.ts', purpose: 'Test data seeding' },
    ],
    preview: {
      headline: 'Database capability',
      features: [
        'Type-safe schema',
        'Query helpers included',
        'Seeded test data',
        'Mock Postgres-compatible provider',
      ],
    },
    costWeight: 'medium',
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
    artifacts: [
      { path: 'lib/email/client.ts', purpose: 'Email provider client' },
      { path: 'lib/email/mock.ts', purpose: 'Simulated email sending' },
      { path: 'lib/email/templates/', purpose: 'Email templates' },
      { path: 'app/api/email/send/route.ts', purpose: 'Send endpoint' },
    ],
    preview: {
      headline: 'Email capability',
      features: [
        'Transactional email ready',
        'Template system included',
        'Send confirmation logs',
        'Mock Resend-compatible provider',
      ],
    },
    costWeight: 'low',
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
    artifacts: [
      { path: 'lib/ai/client.ts', purpose: 'AI provider client' },
      { path: 'lib/ai/mock.ts', purpose: 'Simulated completions' },
      { path: 'app/api/ai/chat/route.ts', purpose: 'Chat endpoint' },
      { path: 'components/ai/ChatInterface.tsx', purpose: 'Chat UI' },
    ],
    preview: {
      headline: 'AI / LLM capability',
      features: [
        'Chat interface scaffolded',
        'Streaming responses ready',
        'Embeddings support',
        'Mock OpenAI-compatible provider',
      ],
    },
    costWeight: 'high',
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
    artifacts: [
      { path: 'lib/storage/client.ts', purpose: 'Storage provider client' },
      { path: 'lib/storage/mock.ts', purpose: 'Local blob storage' },
      { path: 'app/api/upload/route.ts', purpose: 'Upload endpoint' },
      { path: 'components/upload/FileUploader.tsx', purpose: 'Upload UI' },
    ],
    preview: {
      headline: 'File Storage capability',
      features: [
        'File upload UI included',
        'Presigned URL support',
        'Image optimization ready',
        'Mock S3-compatible provider',
      ],
    },
    costWeight: 'medium',
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
    artifacts: [
      { path: 'lib/maps/client.ts', purpose: 'Maps provider client' },
      { path: 'lib/maps/mock.ts', purpose: 'Static map tiles' },
      { path: 'components/maps/MapView.tsx', purpose: 'Map display' },
      { path: 'components/maps/LocationPicker.tsx', purpose: 'Location selection' },
    ],
    preview: {
      headline: 'Maps capability',
      features: [
        'Interactive map view',
        'Location picker included',
        'Geocoding support',
        'Mock Google Maps-compatible provider',
      ],
    },
    costWeight: 'medium',
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
    artifacts: [
      { path: 'lib/analytics/client.ts', purpose: 'Analytics provider client' },
      { path: 'lib/analytics/mock.ts', purpose: 'Console log tracking' },
      { path: 'lib/analytics/events.ts', purpose: 'Event definitions' },
      { path: 'components/analytics/AnalyticsProvider.tsx', purpose: 'Context provider' },
    ],
    preview: {
      headline: 'Analytics capability',
      features: [
        'Event tracking ready',
        'Pageview tracking',
        'User identification',
        'Mock Mixpanel-compatible provider',
      ],
    },
    costWeight: 'low',
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

// Get artifact mapping for Activity Ledger / Export Proof
export function getArtifactMapping(ids: string[]): Record<string, CapabilityArtifact[]> {
  const capabilities = getCapabilitiesById(ids)
  const mapping: Record<string, CapabilityArtifact[]> = {}
  
  for (const cap of capabilities) {
    mapping[cap.id] = cap.artifacts
  }
  
  return mapping
}

// Get all artifacts as flat list with capability attribution
export function getAllArtifacts(ids: string[]): Array<CapabilityArtifact & { capability: string }> {
  const capabilities = getCapabilitiesById(ids)
  const artifacts: Array<CapabilityArtifact & { capability: string }> = []
  
  for (const cap of capabilities) {
    for (const artifact of cap.artifacts) {
      artifacts.push({ ...artifact, capability: cap.label })
    }
  }
  
  return artifacts
}

// Get estimated cost tier for selected capabilities
export function getEstimatedCostTier(ids: string[]): 'low' | 'medium' | 'high' {
  const capabilities = getCapabilitiesById(ids)
  
  if (capabilities.some(c => c.costWeight === 'high')) return 'high'
  if (capabilities.some(c => c.costWeight === 'medium')) return 'medium'
  return 'low'
}

// Primary capabilities shown by default (max 6)
export const PRIMARY_CAPABILITIES = ['payments', 'auth', 'database', 'email', 'ai', 'storage']

// Secondary capabilities in "More" dropdown
export const SECONDARY_CAPABILITIES = ['maps', 'analytics']
