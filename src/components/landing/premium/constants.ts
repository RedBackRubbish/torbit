'use client'

import type { ComponentType } from 'react'
import {
  BarChart3,
  CreditCard,
  Database,
  HardDrive,
  Mail,
  MapPin,
  Shield,
  Sparkles,
} from 'lucide-react'

export const CAPABILITY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  CreditCard,
  Shield,
  Database,
  Mail,
  Sparkles,
  HardDrive,
  MapPin,
  BarChart3,
}

export const PLACEHOLDER_EXAMPLES = [
  'A SaaS dashboard with user analytics...',
  'An enterprise CRM with role-based access...',
  'A marketplace with payments and search...',
  'A project management tool like Linear...',
  'An iOS app for fitness tracking...',
  'A mobile banking app with biometric auth...',
]

export const INTEGRATION_MARQUEE = [
  { name: 'React', color: '#61DAFB' },
  { name: 'Next.js', color: '#ffffff' },
  { name: 'TypeScript', color: '#3178C6' },
  { name: 'Tailwind', color: '#06B6D4' },
  { name: 'OpenAI', color: '#ffffff' },
  { name: 'Claude', color: '#D97757' },
  { name: 'Gemini', color: '#8E75B2' },
  { name: 'Supabase', color: '#3FCF8E' },
  { name: 'Stripe', color: '#635BFF' },
  { name: 'Vercel', color: '#ffffff' },
  { name: 'AWS', color: '#FF9900' },
  { name: 'Firebase', color: '#FFCA28' },
  { name: 'MongoDB', color: '#47A248' },
  { name: 'PostgreSQL', color: '#4169E1' },
  { name: 'Mapbox', color: '#4264FB' },
  { name: 'Prisma', color: '#2D3748' },
  { name: 'Node.js', color: '#339933' },
  { name: 'Redis', color: '#DC382D' },
  { name: 'Swift', color: '#F05138' },
]
