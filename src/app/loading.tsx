export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3 backdrop-blur-sm">
        <div className="h-4 w-4 rounded-full border border-white/40 border-t-white animate-spin" aria-label="Loading" />
        <span className="text-sm text-white/75">Loading workspace</span>
      </div>
    </div>
  )
}
