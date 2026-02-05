'use client'

/**
 * TORBIT - Organization Policy View
 * 
 * Read-only view of the active organization policy.
 * Enterprise users can see but not modify policies here.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getPolicy,
  getPolicySource,
  hasCustomPolicy,
  type OrganizationPolicy,
} from '@/lib/integrations/policies'

// ============================================
// POLICY VIEW COMPONENT
// ============================================

interface OrganizationPolicyViewProps {
  className?: string
}

export function OrganizationPolicyView({ className }: OrganizationPolicyViewProps) {
  const [policy, setPolicy] = useState<OrganizationPolicy | null>(null)
  const [source, setSource] = useState<'default' | 'file' | 'remote'>('default')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['integrations']))
  
  useEffect(() => {
    setPolicy(getPolicy() as OrganizationPolicy)
    setSource(getPolicySource())
  }, [])
  
  if (!policy) return null
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }
  
  return (
    <div className={`bg-zinc-900 rounded-lg border border-zinc-800 ${className || ''}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
            <span className="text-sm">📋</span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-100">{policy.name}</h3>
            <p className="text-xs text-zinc-500">v{policy.version}</p>
          </div>
        </div>
        <PolicySourceBadge source={source} />
      </div>
      
      {/* Policy Sections */}
      <div className="divide-y divide-zinc-800">
        <PolicySection
          title="Integrations"
          icon="🔌"
          expanded={expandedSections.has('integrations')}
          onToggle={() => toggleSection('integrations')}
        >
          <IntegrationRulesView rules={policy.integrations} />
        </PolicySection>
        
        <PolicySection
          title="Categories"
          icon="📁"
          expanded={expandedSections.has('categories')}
          onToggle={() => toggleSection('categories')}
        >
          <CategoryRulesView rules={policy.categories} />
        </PolicySection>
        
        <PolicySection
          title="Auto-Fix"
          icon="🔧"
          expanded={expandedSections.has('autoFix')}
          onToggle={() => toggleSection('autoFix')}
        >
          <AutoFixRulesView rules={policy.autoFix} />
        </PolicySection>
        
        <PolicySection
          title="Shipping"
          icon="📦"
          expanded={expandedSections.has('shipping')}
          onToggle={() => toggleSection('shipping')}
        >
          <ShippingRulesView rules={policy.shipping} />
        </PolicySection>
        
        <PolicySection
          title="Governance"
          icon="🏛️"
          expanded={expandedSections.has('governance')}
          onToggle={() => toggleSection('governance')}
        >
          <GovernanceRulesView rules={policy.governance} />
        </PolicySection>
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
        <p className="text-xs text-zinc-500">
          Last updated: {new Date(policy.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

// ============================================
// POLICY SOURCE BADGE
// ============================================

function PolicySourceBadge({ source }: { source: 'default' | 'file' | 'remote' }) {
  const config = {
    default: { label: 'Default', color: 'bg-zinc-700 text-zinc-300' },
    file: { label: 'Custom', color: 'bg-purple-500/20 text-purple-300' },
    remote: { label: 'Enterprise', color: 'bg-blue-500/20 text-blue-300' },
  }
  
  const { label, color } = config[source]
  
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${color}`}>
      {label}
    </span>
  )
}

// ============================================
// COLLAPSIBLE POLICY SECTION
// ============================================

interface PolicySectionProps {
  title: string
  icon: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function PolicySection({ title, icon, expanded, onToggle, children }: PolicySectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-sm font-medium text-zinc-200">{title}</span>
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-zinc-500"
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// RULE VIEWS
// ============================================

function IntegrationRulesView({ rules }: { rules: OrganizationPolicy['integrations'] }) {
  return (
    <div className="space-y-3">
      <RuleList
        label="Allowed"
        items={rules.allow ?? []}
        emptyText="All integrations allowed"
        variant="success"
      />
      <RuleList
        label="Denied"
        items={rules.deny ?? []}
        emptyText="None"
        variant="error"
      />
      {rules.versionConstraints && Object.keys(rules.versionConstraints).length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">Version Constraints</p>
          <div className="space-y-1">
            {Object.entries(rules.versionConstraints).map(([id, constraint]) => (
              <div key={id} className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                <span className="text-zinc-200">{id}</span>
                {constraint.minVersion && <span className="ml-2">≥{constraint.minVersion}</span>}
                {constraint.maxVersion && <span className="ml-2">≤{constraint.maxVersion}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryRulesView({ rules }: { rules: OrganizationPolicy['categories'] }) {
  return (
    <div className="space-y-3">
      <RuleList
        label="Require Human Approval"
        items={(rules.requireHumanApproval ?? []) as string[]}
        emptyText="None"
        variant="warning"
      />
      <RuleList
        label="Blocked"
        items={(rules.blocked ?? []) as string[]}
        emptyText="None"
        variant="error"
      />
      <RuleList
        label="Require Strategist"
        items={(rules.requireStrategist ?? []) as string[]}
        emptyText="None"
        variant="info"
      />
      <RuleList
        label="Require Auditor"
        items={(rules.requireAuditor ?? []) as string[]}
        emptyText="None"
        variant="info"
      />
    </div>
  )
}

function AutoFixRulesView({ rules }: { rules: OrganizationPolicy['autoFix'] }) {
  return (
    <div className="space-y-2">
      <BooleanRule label="Auto-fix enabled" value={rules.enabled ?? false} />
      <BooleanRule label="Require approval" value={rules.requireApproval ?? false} />
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">Max fixes per session</span>
        <span className="text-zinc-300">{rules.maxFixesPerSession ?? 'Unlimited'}</span>
      </div>
      <RuleList
        label="Allowed Actions"
        items={rules.allowedActions ?? []}
        emptyText="All actions"
        variant="success"
      />
    </div>
  )
}

function ShippingRulesView({ rules }: { rules: OrganizationPolicy['shipping'] }) {
  return (
    <div className="space-y-2">
      <BooleanRule label="Block on drift" value={rules.blockOnDrift ?? false} />
      <BooleanRule label="Require clean ledger" value={rules.requireCleanLedger ?? false} />
      <BooleanRule label="Require health check" value={rules.requireHealthCheck ?? false} />
      <BooleanRule label="Require Auditor pass" value={rules.requireAuditorPass ?? false} />
      {rules.allowedTargets && rules.allowedTargets.length > 0 && (
        <RuleList
          label="Allowed Targets"
          items={rules.allowedTargets}
          emptyText="All targets"
          variant="success"
        />
      )}
    </div>
  )
}

function GovernanceRulesView({ rules }: { rules: OrganizationPolicy['governance'] }) {
  return (
    <div className="space-y-2">
      <BooleanRule label="Always require Strategist" value={rules.alwaysRequireStrategist} />
      <BooleanRule label="Always require Auditor" value={rules.alwaysRequireAuditor} />
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">Premium model budget</span>
        <span className="text-zinc-300">{rules.premiumModelBudgetPercent}%</span>
      </div>
    </div>
  )
}

// ============================================
// HELPER COMPONENTS
// ============================================

interface RuleListProps {
  label: string
  items: string[]
  emptyText: string
  variant: 'success' | 'error' | 'warning' | 'info'
}

function RuleList({ label, items, emptyText, variant }: RuleListProps) {
  const variantColors = {
    success: 'bg-green-500/10 text-green-300',
    error: 'bg-red-500/10 text-red-300',
    warning: 'bg-yellow-500/10 text-yellow-300',
    info: 'bg-blue-500/10 text-blue-300',
  }
  
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-600 italic">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map(item => (
            <span
              key={item}
              className={`px-2 py-0.5 text-xs rounded ${variantColors[variant]}`}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function BooleanRule({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={value ? 'text-green-400' : 'text-zinc-600'}>
        {value ? '✓ Yes' : '✗ No'}
      </span>
    </div>
  )
}

// ============================================
// COMPACT POLICY STATUS
// ============================================

interface PolicyStatusBadgeProps {
  className?: string
}

export function PolicyStatusBadge({ className }: PolicyStatusBadgeProps) {
  const [hasCustom, setHasCustom] = useState(false)
  
  useEffect(() => {
    setHasCustom(hasCustomPolicy())
  }, [])
  
  if (!hasCustom) {
    return (
      <span className={`text-xs text-zinc-600 ${className || ''}`}>
        Default policy
      </span>
    )
  }
  
  return (
    <span className={`text-xs text-purple-400 ${className || ''}`}>
      📋 Custom policy active
    </span>
  )
}

// ============================================
// POLICY VIOLATION BANNER
// ============================================

interface PolicyViolationBannerProps {
  message: string
  onDismiss?: () => void
}

export function PolicyViolationBanner({ message, onDismiss }: PolicyViolationBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-start gap-3"
    >
      <span className="text-red-400 mt-0.5">🚫</span>
      <div className="flex-1">
        <p className="text-sm text-red-200">{message}</p>
        <p className="text-xs text-red-400/70 mt-1">
          This action is restricted by organization policy.
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400/50 hover:text-red-400 transition-colors"
        >
          ✕
        </button>
      )}
    </motion.div>
  )
}
