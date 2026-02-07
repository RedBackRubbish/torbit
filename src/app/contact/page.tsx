import Link from 'next/link'

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs tracking-[0.18em] uppercase text-white/30 mb-4">TORBIT</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-4">Contact</h1>
        <p className="text-white/60 leading-relaxed mb-10">
          For enterprise plans, security reviews, or procurement questions, share your request through your TORBIT support channel and include your workspace name.
        </p>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-sm text-white/40 mb-1">Sales Requests</p>
            <p className="text-white">Include: company name, team size, expected monthly usage.</p>
          </div>
          <div>
            <p className="text-sm text-white/40 mb-1">Security Reviews</p>
            <p className="text-white">Include: required framework, deadline, and review scope.</p>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
