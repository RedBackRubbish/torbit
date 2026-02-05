/**
 * TORBIT COMPONENT PATTERNS
 * 
 * These are REFERENCE patterns for the AI to emulate.
 * Every generated component should match this level of quality.
 * 
 * The AI should study these patterns and apply the same:
 * - Spacing
 * - Typography
 * - Color usage
 * - Interaction states
 */

// ============================================================================
// BUTTON PATTERNS
// ============================================================================

export const BUTTON_PATTERNS = {
  // Primary - White on dark, Black on light
  primary: `
    h-10 px-4
    bg-white text-black text-[13px] font-medium
    rounded-lg
    hover:bg-white/90
    transition-colors
    inline-flex items-center justify-center gap-2
  `,
  
  // Secondary - Ghost style
  secondary: `
    h-10 px-4
    bg-white/[0.06] text-white text-[13px] font-medium
    border border-white/[0.08]
    rounded-lg
    hover:bg-white/[0.1] hover:border-white/[0.12]
    transition-all
    inline-flex items-center justify-center gap-2
  `,
  
  // Ghost - No background until hover
  ghost: `
    h-10 px-4
    text-white/70 text-[13px] font-medium
    rounded-lg
    hover:bg-white/[0.06] hover:text-white
    transition-colors
    inline-flex items-center justify-center gap-2
  `,
  
  // Icon button
  icon: `
    w-9 h-9
    rounded-lg
    text-white/50
    hover:text-white/80 hover:bg-white/[0.06]
    transition-colors
    inline-flex items-center justify-center
  `,
}

// ============================================================================
// CARD PATTERNS
// ============================================================================

export const CARD_PATTERNS = {
  // Default card
  default: `
    p-6
    bg-white/[0.02]
    border border-white/[0.06]
    rounded-xl
    hover:border-white/[0.12]
    transition-colors
  `,
  
  // Interactive card (clickable)
  interactive: `
    p-6
    bg-white/[0.02]
    border border-white/[0.06]
    rounded-xl
    cursor-pointer
    hover:bg-white/[0.04] hover:border-white/[0.12]
    transition-all
    group
  `,
  
  // Elevated card
  elevated: `
    p-6
    bg-[#0a0a0a]
    border border-white/[0.08]
    rounded-xl
  `,
}

// ============================================================================
// INPUT PATTERNS
// ============================================================================

export const INPUT_PATTERNS = {
  // Text input
  text: `
    h-10 px-3 w-full
    bg-white/[0.04]
    border border-white/[0.08]
    rounded-lg
    text-[14px] text-white placeholder:text-white/30
    focus:outline-none focus:border-white/[0.2] focus:ring-0
    transition-colors
  `,
  
  // Search input
  search: `
    h-9 pl-9 pr-3 w-full
    bg-white/[0.04]
    border border-white/[0.06]
    rounded-lg
    text-[13px] text-white placeholder:text-white/30
    focus:outline-none focus:bg-white/[0.06] focus:border-white/[0.12]
    transition-all
  `,
  
  // Textarea
  textarea: `
    p-3 w-full min-h-[100px]
    bg-white/[0.04]
    border border-white/[0.08]
    rounded-lg
    text-[14px] text-white placeholder:text-white/30
    focus:outline-none focus:border-white/[0.2]
    resize-none
    transition-colors
  `,
}

// ============================================================================
// NAVIGATION PATTERNS
// ============================================================================

export const NAV_PATTERNS = {
  // Top navbar
  topNav: `
    h-14
    border-b border-white/[0.06]
    bg-black/80 backdrop-blur-xl
    sticky top-0 z-50
  `,
  
  // Nav link
  navLink: `
    px-3 py-2
    text-[13px] text-white/60
    rounded-lg
    hover:text-white hover:bg-white/[0.06]
    transition-colors
  `,
  
  // Nav link active
  navLinkActive: `
    px-3 py-2
    text-[13px] text-white font-medium
    bg-white/[0.08]
    rounded-lg
  `,
  
  // Sidebar
  sidebar: `
    w-60
    h-screen
    border-r border-white/[0.06]
    bg-[#0a0a0a]
    flex flex-col
  `,
  
  // Sidebar item
  sidebarItem: `
    h-9 px-3
    text-[13px] text-white/60
    rounded-lg
    hover:bg-white/[0.06] hover:text-white/90
    transition-colors
    flex items-center gap-2
  `,
}

// ============================================================================
// LAYOUT PATTERNS
// ============================================================================

export const LAYOUT_PATTERNS = {
  // Page container
  page: `
    min-h-screen
    bg-black
  `,
  
  // Content max-width
  content: `
    max-w-6xl mx-auto
    px-6 md:px-12
  `,
  
  // Hero section
  hero: `
    py-24 md:py-32
    text-center
  `,
  
  // Section
  section: `
    py-16 md:py-24
  `,
  
  // Two-column layout
  twoColumn: `
    grid grid-cols-1 lg:grid-cols-2
    gap-8 lg:gap-16
    items-center
  `,
  
  // Grid
  grid: `
    grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
    gap-6
  `,
}

// ============================================================================
// TYPOGRAPHY PATTERNS
// ============================================================================

export const TYPOGRAPHY_PATTERNS = {
  hero: `
    text-4xl md:text-5xl lg:text-6xl
    font-semibold
    tracking-tight
    text-white
  `,
  
  h1: `
    text-3xl md:text-4xl
    font-semibold
    tracking-tight
    text-white
  `,
  
  h2: `
    text-2xl md:text-3xl
    font-medium
    tracking-tight
    text-white
  `,
  
  h3: `
    text-xl
    font-medium
    text-white
  `,
  
  body: `
    text-[15px]
    leading-relaxed
    text-white/65
  `,
  
  bodyLarge: `
    text-lg
    leading-relaxed
    text-white/65
  `,
  
  small: `
    text-[13px]
    text-white/50
  `,
  
  micro: `
    text-[11px]
    text-white/40
  `,
  
  label: `
    text-[11px]
    font-medium
    uppercase
    tracking-wider
    text-white/40
  `,
}

// ============================================================================
// EXAMPLE: PREMIUM LANDING PAGE
// ============================================================================

export const LANDING_PAGE_EXAMPLE = `
// app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      {/* Navbar */}
      <nav className="h-14 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <span className="text-[15px] font-semibold text-white">Brand</span>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[13px] text-white/60 hover:text-white transition-colors">Features</a>
            <a href="#" className="text-[13px] text-white/60 hover:text-white transition-colors">Pricing</a>
            <button className="h-9 px-4 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-white/90 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-6">
            Build something
            <span className="text-white/40"> people want</span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
            A brief, compelling description that explains the value proposition
            in one or two sentences. Keep it simple.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button className="h-11 px-6 bg-white text-black text-[14px] font-medium rounded-lg hover:bg-white/90 transition-colors">
              Start for free
            </button>
            <button className="h-11 px-6 text-white/70 text-[14px] font-medium rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors">
              Learn more →
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white text-center mb-12">
            Everything you need
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center mb-4">
                  <span className="text-white/40">✦</span>
                </div>
                <h3 className="text-[15px] font-medium text-white mb-2">Feature title</h3>
                <p className="text-[13px] text-white/50">
                  A short description of this feature and why it matters to the user.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
`

// ============================================================================
// EXAMPLE: DASHBOARD
// ============================================================================

export const DASHBOARD_EXAMPLE = `
// app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-white/[0.06] bg-[#0a0a0a] flex flex-col">
        <div className="h-14 px-4 flex items-center border-b border-white/[0.06]">
          <span className="text-[14px] font-semibold text-white">Dashboard</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <a href="#" className="h-9 px-3 flex items-center gap-2 text-[13px] text-white bg-white/[0.08] rounded-lg">
            <HomeIcon className="w-4 h-4" />
            Overview
          </a>
          <a href="#" className="h-9 px-3 flex items-center gap-2 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors">
            <UsersIcon className="w-4 h-4" />
            Customers
          </a>
          <a href="#" className="h-9 px-3 flex items-center gap-2 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors">
            <SettingsIcon className="w-4 h-4" />
            Settings
          </a>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1">
        <header className="h-14 px-6 flex items-center justify-between border-b border-white/[0.06]">
          <h1 className="text-[14px] font-medium text-white">Overview</h1>
          <button className="h-8 px-3 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-white/90 transition-colors">
            Add new
          </button>
        </header>
        
        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {['Revenue', 'Users', 'Orders'].map((stat) => (
              <div key={stat} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">{stat}</p>
                <p className="text-2xl font-semibold text-white">$12,345</p>
              </div>
            ))}
          </div>
          
          {/* Table placeholder */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[13px] font-medium text-white">Recent Activity</p>
            </div>
            <div className="p-4">
              <p className="text-[13px] text-white/40">Data will appear here</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
`
