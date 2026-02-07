'use client'

/**
 * TORBIT - User Menu Component
 * 
 * Dropdown menu showing user profile and actions.
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { 
  User, 
  LogOut, 
  Settings, 
  CreditCard, 
  Fuel,
  ChevronDown,
  Sparkles
} from 'lucide-react'

export function UserMenu() {
  const router = useRouter()
  const { user, profile, signOut, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Reset avatar error when user changes
  useEffect(() => {
    setAvatarError(false)
  }, [user?.id])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Show sign in button if not authenticated (after loading completes or times out)
  if (!user) {
    // Still loading - show loading state briefly
    if (loading) {
      return (
        <div className="w-8 h-8 rounded-full bg-neutral-800 animate-pulse" />
      )
    }
    
    // Not loading, no user - show sign in
    return (
      <button
        onClick={() => router.push('/login')}
        className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-neutral-200 text-black text-sm font-medium rounded-lg transition-colors"
      >
        <User className="w-4 h-4" />
        Sign In
      </button>
    )
  }

  // User is authenticated - get display info
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const tier = profile?.tier || 'free'
  const fuelBalance = profile?.fuel_balance || 0

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open account menu"
        className="flex items-center gap-2 px-2 py-1 hover:bg-neutral-800 rounded-lg transition-colors"
      >
        {/* Avatar */}
        {avatarUrl && !avatarError ? (
          <img 
            src={avatarUrl} 
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover border border-neutral-700"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center border border-red-500/50">
            <span className="text-xs font-medium text-white">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* User Info */}
            <div className="p-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                {avatarUrl && !avatarError ? (
                  <img 
                    src={avatarUrl} 
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center border border-red-500/50">
                    <span className="text-sm font-medium text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{displayName}</p>
                  <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                </div>
              </div>
              
              {/* Tier Badge */}
              <div className="mt-3 flex items-center gap-2">
                <span className={`
                  inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full
                  ${tier === 'enterprise' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    tier === 'pro' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'bg-neutral-800 text-neutral-400 border border-neutral-700'}
                `}>
                  <Sparkles className="w-3 h-3" />
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </span>
                
                <span className="flex items-center gap-1 text-xs text-neutral-400">
                  <Fuel className="w-3 h-3" />
                  {fuelBalance.toLocaleString()} fuel
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <MenuItem icon={Settings} label="Settings" onClick={() => {
                setIsOpen(false)
                router.push('/settings')
              }} />
              <MenuItem icon={CreditCard} label="Billing" onClick={() => {
                setIsOpen(false)
                router.push('/settings?tab=billing')
              }} />
            </div>

            {/* Sign Out */}
            <div className="py-2 border-t border-neutral-800">
              <MenuItem 
                icon={LogOut} 
                label="Sign out" 
                onClick={handleSignOut}
                variant="danger"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

function MenuItem({ icon: Icon, label, onClick, variant = 'default' }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
        ${variant === 'danger' 
          ? 'text-red-400 hover:bg-red-500/10' 
          : 'text-neutral-300 hover:bg-neutral-800'}
      `}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
