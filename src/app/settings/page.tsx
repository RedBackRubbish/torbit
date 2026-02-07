'use client'

/**
 * TORBIT - Settings Page
 * 
 * User account, billing, and preferences management.
 */

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useBilling } from '@/hooks/useBilling'
import { 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  Palette,
  Key,
  Mail,
  ChevronRight,
  Check,
  Zap
} from 'lucide-react'
import { UserMenu } from '@/components/builder/UserMenu'
import { TorbitLogo, TorbitSpinner } from '@/components/ui/TorbitLogo'

type SettingsTab = 'account' | 'billing' | 'preferences' | 'security'

// Wrapper component to handle Suspense for useSearchParams
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageLoading />}>
      <SettingsPageContent />
    </Suspense>
  )
}

function SettingsPageLoading() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <TorbitSpinner size="lg" />
    </div>
  )
}

function SettingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading } = useAuth()
  const { status: billingStatus, loading: billingLoading, openPortal } = useBilling()
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [saving, setSaving] = useState(false)
  
  // Handle URL query param for tab
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['account', 'billing', 'preferences', 'security'].includes(tab)) {
      setActiveTab(tab as SettingsTab)
    }
  }, [searchParams])
  
  // Preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    buildAlerts: true,
    marketingEmails: false,
    theme: 'dark' as 'dark' | 'light' | 'system',
    editorFontSize: 14,
    autoSave: true,
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const handleSavePreferences = async () => {
    setSaving(true)
    // Simulate save - in production, call API
    await new Promise(resolve => setTimeout(resolve, 800))
    setSaving(false)
  }

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <TorbitSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="h-14 border-b border-neutral-800 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="h-full max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="inline-flex items-center gap-2 group">
              <TorbitLogo size="sm" animated />
              <span className="text-xl font-bold tracking-tight text-white">TORBIT</span>
            </Link>
            <div className="w-px h-5 bg-neutral-800" />
            <span className="text-neutral-400 text-sm">Settings</span>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-48 flex-shrink-0">
            <ul className="space-y-1">
              {tabs.map(tab => (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Account Tab */}
            {activeTab === 'account' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold text-white">Account</h1>
                  <p className="text-neutral-400 mt-1">Manage your account details</p>
                </div>

                {/* Profile Card */}
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <h2 className="text-lg font-medium text-white mb-4">Profile</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
                        {profile?.avatar_url ? (
                          <img 
                            src={profile.avatar_url} 
                            alt="" 
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-neutral-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {profile?.full_name || 'No name set'}
                        </p>
                        <p className="text-neutral-400 text-sm">{user?.email}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 pt-4 border-t border-neutral-800">
                      <div>
                        <label className="block text-sm text-neutral-400 mb-1">Full Name</label>
                        <input
                          type="text"
                          defaultValue={profile?.full_name || ''}
                          placeholder="Enter your name"
                          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-400 mb-1">Email</label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-neutral-500 mt-1">Contact support to change your email</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Stats */}
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <h2 className="text-lg font-medium text-white mb-4">Account Stats</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-neutral-800 rounded-lg">
                      <p className="text-2xl font-bold text-white">
                        {billingStatus?.lifetimePurchased?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-neutral-400">Total Fuel Used</p>
                    </div>
                    <div className="p-4 bg-neutral-800 rounded-lg">
                      <p className="text-2xl font-bold text-white capitalize">
                        {billingStatus?.tier || 'free'}
                      </p>
                      <p className="text-sm text-neutral-400">Current Plan</p>
                    </div>
                    <div className="p-4 bg-neutral-800 rounded-lg">
                      <p className="text-2xl font-bold text-white">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}
                      </p>
                      <p className="text-sm text-neutral-400">Member Since</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold text-white">Billing</h1>
                  <p className="text-neutral-400 mt-1">Manage your subscription and fuel</p>
                </div>

                {/* Current Plan */}
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-white">Current Plan</h2>
                    {billingStatus?.tier !== 'free' && (
                      <span className="px-2 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  
                  {billingLoading ? (
                    <div className="py-8 flex justify-center">
                      <TorbitSpinner size="md" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
                          <Zap className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-white capitalize">
                            {billingStatus?.tierName || 'Free Plan'}
                          </p>
                          <p className="text-neutral-400 text-sm">
                            {billingStatus?.fuelAllowance?.toLocaleString() || '50'} fuel / {billingStatus?.refillPeriod || 'day'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-neutral-800 flex gap-3">
                        <button
                          onClick={() => openPortal()}
                          className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-sm font-medium rounded-lg transition-colors"
                        >
                          Manage Subscription
                        </button>
                        <Link
                          href="/dashboard"
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Buy Fuel Packs
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fuel Balance */}
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <h2 className="text-lg font-medium text-white mb-4">Fuel Balance</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-3xl font-bold text-white">
                        {billingStatus?.currentFuel?.toLocaleString() || '0'}
                      </p>
                      <p className="text-neutral-400 text-sm">Available fuel units</p>
                    </div>
                    {billingStatus?.nextRefillAt && (
                      <div className="text-right">
                        <p className="text-sm text-neutral-400">Next refill</p>
                        <p className="text-white font-medium">
                          {new Date(billingStatus.nextRefillAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Usage History Link */}
                <button className="w-full p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between hover:bg-neutral-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-neutral-400" />
                    <span className="text-white">View Billing History</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-500" />
                </button>
              </motion.div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold text-white">Preferences</h1>
                  <p className="text-neutral-400 mt-1">Customize your experience</p>
                </div>

                {/* Notifications */}
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Bell className="w-5 h-5 text-neutral-400" />
                    <h2 className="text-lg font-medium text-white">Notifications</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <ToggleOption
                      label="Email Notifications"
                      description="Receive updates about your projects"
                      checked={preferences.emailNotifications}
                      onChange={(v) => setPreferences(p => ({ ...p, emailNotifications: v }))}
                    />
                    <ToggleOption
                      label="Build Alerts"
                      description="Get notified when builds complete or fail"
                      checked={preferences.buildAlerts}
                      onChange={(v) => setPreferences(p => ({ ...p, buildAlerts: v }))}
                    />
                    <ToggleOption
                      label="Marketing Emails"
                      description="Receive product updates and tips"
                      checked={preferences.marketingEmails}
                      onChange={(v) => setPreferences(p => ({ ...p, marketingEmails: v }))}
                    />
                  </div>
                </div>

                {/* Editor Settings */}
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Palette className="w-5 h-5 text-neutral-400" />
                    <h2 className="text-lg font-medium text-white">Editor</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">Theme</label>
                      <div className="flex gap-2">
                        {(['dark', 'light', 'system'] as const).map(theme => (
                          <button
                            key={theme}
                            onClick={() => setPreferences(p => ({ ...p, theme }))}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                              preferences.theme === theme
                                ? 'bg-white text-black'
                                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                            }`}
                          >
                            {theme}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">
                        Font Size: {preferences.editorFontSize}px
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="20"
                        value={preferences.editorFontSize}
                        onChange={(e) => setPreferences(p => ({ ...p, editorFontSize: parseInt(e.target.value) }))}
                        className="w-full accent-white"
                      />
                    </div>

                    <ToggleOption
                      label="Auto-save"
                      description="Automatically save changes as you work"
                      checked={preferences.autoSave}
                      onChange={(v) => setPreferences(p => ({ ...p, autoSave: v }))}
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-white hover:bg-neutral-200 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <TorbitSpinner size="xs" speed="fast" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Preferences
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold text-white">Security</h1>
                  <p className="text-neutral-400 mt-1">Manage your account security</p>
                </div>

                {/* Password */}
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Key className="w-5 h-5 text-neutral-400" />
                    <h2 className="text-lg font-medium text-white">Password</h2>
                  </div>
                  
                  <p className="text-neutral-400 text-sm mb-4">
                    Change your password to keep your account secure
                  </p>
                  
                  <button className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors">
                    Change Password
                  </button>
                </div>

                {/* Connected Accounts */}
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-5 h-5 text-neutral-400" />
                    <h2 className="text-lg font-medium text-white">Connected Accounts</h2>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <div>
                          <p className="text-white font-medium">GitHub</p>
                          <p className="text-neutral-400 text-xs">Sign in with GitHub</p>
                        </div>
                      </div>
                      <span className="text-xs text-emerald-400">Connected</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <div>
                          <p className="text-white font-medium">Google</p>
                          <p className="text-neutral-400 text-xs">Sign in with Google</p>
                        </div>
                      </div>
                      <button className="text-xs text-neutral-400 hover:text-white transition-colors">
                        Connect
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sessions */}
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Mail className="w-5 h-5 text-neutral-400" />
                    <h2 className="text-lg font-medium text-white">Active Sessions</h2>
                  </div>
                  
                  <div className="p-3 bg-neutral-800 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">Current Session</p>
                      <p className="text-neutral-400 text-xs">This device • Active now</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <h2 className="text-lg font-medium text-red-400 mb-2">Danger Zone</h2>
                  <p className="text-neutral-400 text-sm mb-4">
                    Permanently delete your account and all associated data
                  </p>
                  <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-lg border border-red-500/20 transition-colors">
                    Delete Account
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// Toggle Option Component
function ToggleOption({ 
  label, 
  description, 
  checked, 
  onChange 
}: { 
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-neutral-500 text-xs">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative ${
          checked ? 'bg-white' : 'bg-neutral-700'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
