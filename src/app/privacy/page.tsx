import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs tracking-[0.18em] uppercase text-white/30 mb-4">TORBIT</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-4">Privacy</h1>
        <p className="text-white/60 mb-2">
          Effective date: February 8, 2026.
        </p>
        <p className="text-white/60 mb-8">
          This policy explains what data we process to provide the Torbit workspace, how we use it, and the controls available to account owners.
        </p>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Data we collect</h2>
            <ul className="text-white/70 text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>Account identity data (email, display name, auth identifiers).</li>
              <li>Workspace data (projects, files, prompts, generated outputs, settings).</li>
              <li>Operational telemetry (audit events, background run events, performance metrics).</li>
              <li>Billing metadata (subscription tier, transaction records, payment references).</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">How we use data</h2>
            <ul className="text-white/70 text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>Provide core functionality (project generation, preview, export, deployment actions).</li>
              <li>Operate trust and governance features (audit logs, verification artifacts, signed bundles).</li>
              <li>Protect service integrity (abuse prevention, rate limiting, security monitoring).</li>
              <li>Support billing operations and fraud prevention for paid plans.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Retention and deletion</h2>
            <ul className="text-white/70 text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>Project data is retained until deleted by workspace owners or administrators.</li>
              <li>Audit and billing records may be retained longer for legal, compliance, or fraud obligations.</li>
              <li>You can request account deletion through support; residual backup copies age out per backup policy.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Security safeguards</h2>
            <ul className="text-white/70 text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>Transport encryption in transit and platform-level access controls.</li>
              <li>Authenticated access for protected routes and server-side secret handling.</li>
              <li>Operational logging for security and incident response.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Your rights</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Depending on your jurisdiction, you may have rights to access, correct, export, or delete personal data. To submit a request, use your Torbit support channel and include your workspace identifier.
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
