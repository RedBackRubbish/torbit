/**
 * TORBIT - Knowledge Freeze Badge
 * 
 * Minimal badge showing project knowledge state.
 * 
 * Displays:
 * - Freeze mode (Frozen/Advisory/Live)
 * - Confidence score
 * - One-click to review
 * 
 * No trend feeds. No adoption suggestions.
 */

'use client'

import { useState } from 'react'
import type { FreezeMode } from '@/lib/knowledge/memory/types'

interface FreezeBadgeProps {
  projectId: string
  freezeMode: FreezeMode
  confidence: number
  onReview?: () => void
}

const MODE_COLORS: Record<FreezeMode, string> = {
  frozen: 'bg-blue-100 text-blue-800 border-blue-200',
  advisory: 'bg-amber-100 text-amber-800 border-amber-200',
  live: 'bg-green-100 text-green-800 border-green-200',
}

const MODE_ICONS: Record<FreezeMode, string> = {
  frozen: '❄️',
  advisory: '💡',
  live: '🔄',
}

const MODE_LABELS: Record<FreezeMode, string> = {
  frozen: 'Frozen',
  advisory: 'Advisory',
  live: 'Live',
}

export function FreezeBadge({
  projectId,
  freezeMode,
  confidence,
  onReview,
}: FreezeBadgeProps) {
  const [isHovered, setIsHovered] = useState(false)
  void projectId
  
  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5
        rounded-full border text-sm font-medium
        cursor-pointer transition-all
        ${MODE_COLORS[freezeMode]}
        ${isHovered ? 'shadow-sm' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onReview}
      title={`Knowledge: ${MODE_LABELS[freezeMode]} | Confidence: ${Math.round(confidence * 100)}%`}
    >
      <span>{MODE_ICONS[freezeMode]}</span>
      <span>Knowledge: {MODE_LABELS[freezeMode]}</span>
      <span className="opacity-60">({Math.round(confidence * 100)}%)</span>
    </div>
  )
}

/**
 * Compact version for toolbar
 */
export function FreezeBadgeCompact({
  freezeMode,
  confidence,
}: Pick<FreezeBadgeProps, 'freezeMode' | 'confidence'>) {
  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-1
        rounded text-xs font-medium
        ${MODE_COLORS[freezeMode]}
      `}
      title={`Knowledge: ${MODE_LABELS[freezeMode]} | Confidence: ${Math.round(confidence * 100)}%`}
    >
      <span>{MODE_ICONS[freezeMode]}</span>
      <span>{Math.round(confidence * 100)}%</span>
    </div>
  )
}
