import Link from 'next/link'

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs tracking-[0.18em] uppercase text-white/30 mb-4">TORBIT</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-4">Security</h1>
        <p className="text-white/60 mb-8">
          Baseline security posture and controls for Torbit environments.
        </p>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Core controls</h2>
            <ul className="text-white/70 text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>Server-side secret handling for privileged operations.</li>
              <li>Authenticated route protections and role-scoped data access.</li>
              <li>Signed governance bundles for verifiable audit artifacts.</li>
              <li>Background worker token authorization for internal dispatch routes.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Operational monitoring</h2>
            <ul className="text-white/70 text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>Structured product and background-run telemetry for incident analysis.</li>
              <li>Centralized error tracking integration support.</li>
              <li>Build verification and policy evaluations captured in governance records.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Reporting</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              To report a security issue, use your existing Torbit support channel and include “Security Report” in the subject along with reproduction details and impact.
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
