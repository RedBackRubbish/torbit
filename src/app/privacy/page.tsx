import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs tracking-[0.18em] uppercase text-white/30 mb-4">TORBIT</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-4">Privacy</h1>
        <p className="text-white/60 mb-8">
          This page summarizes current privacy commitments for the product experience.
        </p>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">What we store</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Account profile data, project metadata, and generated source files required to provide workspace features.
            </p>
          </section>
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">How it is used</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Data is used to run builds, improve reliability, and provide audit artifacts for your generated projects.
            </p>
          </section>
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="text-white font-medium mb-2">Your control</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              You can delete projects from the dashboard and manage account-related settings from the settings area.
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
