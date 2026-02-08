import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs tracking-[0.18em] uppercase text-white/30 mb-4">TORBIT</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-4">Terms</h1>
        <p className="text-white/60 mb-2">
          Effective date: February 8, 2026.
        </p>
        <p className="text-white/60 mb-8">
          These terms govern access to and use of Torbit services.
        </p>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Account responsibility</h2>
            <ul className="text-white/70 text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>You are responsible for activity under your account and connected workspaces.</li>
              <li>You must maintain credential confidentiality and notify us of unauthorized use.</li>
              <li>You must provide accurate billing and organization details for paid plans.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Acceptable use</h2>
            <ul className="text-white/70 text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>No malicious code generation, exploitation, abuse, or unlawful activity.</li>
              <li>No attempts to bypass service controls, quotas, or authentication layers.</li>
              <li>No misuse of generated outputs in ways that violate third-party rights or law.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Billing and renewals</h2>
            <ul className="text-white/70 text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>Paid plans renew automatically unless canceled before the next billing cycle.</li>
              <li>Usage credits and plan allowances are governed by your selected tier.</li>
              <li>Taxes and payment processor fees may apply where required.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Generated output and warranties</h2>
            <ul className="text-white/70 text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>You retain responsibility for validation, security review, and production readiness of exported code.</li>
              <li>Torbit is provided on an “as available” basis unless otherwise agreed in an enterprise contract.</li>
              <li>Liability is limited to the maximum extent permitted by applicable law.</li>
            </ul>
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
