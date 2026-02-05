/**
 * TORBIT - Supabase Module
 * 
 * Re-exports for convenient imports
 */

export { createClient, getSupabase } from './client'
export { createClient as createServerClient } from './server'
export type {
  Database,
  Profile,
  Project,
  Conversation,
  Message,
  FuelTransaction,
  AuditEvent,
  NewProject,
  UpdateProject,
  NewMessage,
} from './types'
