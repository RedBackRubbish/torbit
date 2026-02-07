import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs tracking-[0.18em] uppercase text-white/30 mb-4">TORBIT</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-4">Terms</h1>
        <p className="text-white/60 mb-8">
          These usage terms define baseline expectations for responsible use of the product.
        </p>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Acceptable use</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Do not use the service to create malware, abuse third-party systems, or violate applicable law.
            </p>
          </section>
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Billing</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Paid plans and add-ons are billed according to your selected plan. Fuel usage is reflected in product metrics.
            </p>
          </section>
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Exported output</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              You are responsible for reviewing and validating generated code before production deployment.
            </p>
          </section>
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
