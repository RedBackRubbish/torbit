import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-md text-center space-y-4">
        <p className="text-xs tracking-[0.2em] uppercase text-white/40">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-white/65">The route you requested does not exist in this workspace.</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/85 hover:bg-white/[0.08] transition-colors"
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}
