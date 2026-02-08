/**
 * TORBIT - Supabase Database Types
 * 
 * Run `npx supabase gen types typescript` to regenerate from your schema.
 * For now, this is a manual type definition.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // ============================================
      // USERS & PROFILES
      // ============================================
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          tier: 'free' | 'pro' | 'enterprise'
          fuel_balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          tier?: 'free' | 'pro' | 'enterprise'
          fuel_balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          tier?: 'free' | 'pro' | 'enterprise'
          fuel_balance?: number
          updated_at?: string
        }
        Relationships: []
      }

      // ============================================
      // PROJECTS
      // ============================================
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          project_type: 'web' | 'mobile'
          files: Json // Virtual filesystem snapshot
          settings: Json // Project-specific settings
          knowledge_snapshot: Json | null // Frozen knowledge state
          created_at: string
          updated_at: string
          last_opened_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          project_type?: 'web' | 'mobile'
          files?: Json
          settings?: Json
          knowledge_snapshot?: Json | null
          created_at?: string
          updated_at?: string
          last_opened_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          project_type?: 'web' | 'mobile'
          files?: Json
          settings?: Json
          knowledge_snapshot?: Json | null
          updated_at?: string
          last_opened_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================
      // CHAT HISTORY
      // ============================================
      conversations: {
        Row: {
          id: string
          project_id: string
          user_id: string
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          tool_calls: Json | null // Tool invocations
          fuel_used: number
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          tool_calls?: Json | null
          fuel_used?: number
          created_at?: string
        }
        Update: {
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          tool_calls?: Json | null
          fuel_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================
      // FUEL TRANSACTIONS
      // ============================================
      fuel_transactions: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          amount: number // Positive = credit, negative = debit
          type: 'purchase' | 'usage' | 'refund' | 'bonus'
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          amount: number
          type: 'purchase' | 'usage' | 'refund' | 'bonus'
          description?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          project_id?: string | null
          amount?: number
          type?: 'purchase' | 'usage' | 'refund' | 'bonus'
          description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================
      // AUDIT LEDGER
      // ============================================
      audit_events: {
        Row: {
          id: string
          project_id: string
          user_id: string
          event_type: string
          event_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          event_type: string
          event_data?: Json
          created_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          event_type?: string
          event_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================
      // PROJECT COLLABORATORS
      // ============================================
      project_collaborators: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer'
          invited_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: 'owner' | 'editor' | 'viewer'
          invited_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'owner' | 'editor' | 'viewer'
          invited_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================
      // PROJECT PRESENCE (REAL-TIME)
      // ============================================
      project_presence: {
        Row: {
          id: string
          project_id: string
          user_id: string
          status: 'online' | 'idle' | 'offline'
          cursor: Json | null
          heartbeat_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          status?: 'online' | 'idle' | 'offline'
          cursor?: Json | null
          heartbeat_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          status?: 'online' | 'idle' | 'offline'
          cursor?: Json | null
          heartbeat_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_presence_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================
      // BACKGROUND RUNS (ASYNC PIPELINE TASKS)
      // ============================================
      background_runs: {
        Row: {
          id: string
          project_id: string
          user_id: string
          run_type: string
          status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
          input: Json
          metadata: Json
          output: Json | null
          idempotency_key: string | null
          retryable: boolean
          attempt_count: number
          max_attempts: number
          cancel_requested: boolean
          last_heartbeat_at: string | null
          next_retry_at: string | null
          error_message: string | null
          progress: number
          started_at: string | null
          finished_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          run_type: string
          status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
          input?: Json
          metadata?: Json
          output?: Json | null
          idempotency_key?: string | null
          retryable?: boolean
          attempt_count?: number
          max_attempts?: number
          cancel_requested?: boolean
          last_heartbeat_at?: string | null
          next_retry_at?: string | null
          error_message?: string | null
          progress?: number
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          run_type?: string
          status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
          input?: Json
          metadata?: Json
          output?: Json | null
          idempotency_key?: string | null
          retryable?: boolean
          attempt_count?: number
          max_attempts?: number
          cancel_requested?: boolean
          last_heartbeat_at?: string | null
          next_retry_at?: string | null
          error_message?: string | null
          progress?: number
          started_at?: string | null
          finished_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================
      // PRODUCT EVENTS (FUNNEL TELEMETRY)
      // ============================================
      product_events: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          event_name: string
          session_id: string
          event_data: Json
          occurred_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          event_name: string
          session_id: string
          event_data?: Json
          occurred_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          event_name?: string
          session_id?: string
          event_data?: Json
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================
      // STRIPE CUSTOMERS
      // ============================================
      stripe_customers: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          stripe_customer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================
      // FUEL BALANCES (Extended fuel tracking)
      // ============================================
      fuel_balances: {
        Row: {
          id: string
          user_id: string
          current_fuel: number
          lifetime_fuel_purchased: number
          lifetime_fuel_used: number
          last_daily_refill_at: string | null
          last_monthly_refill_at: string | null
          user_timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          current_fuel?: number
          lifetime_fuel_purchased?: number
          lifetime_fuel_used?: number
          last_daily_refill_at?: string | null
          last_monthly_refill_at?: string | null
          user_timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          current_fuel?: number
          lifetime_fuel_purchased?: number
          lifetime_fuel_used?: number
          last_daily_refill_at?: string | null
          last_monthly_refill_at?: string | null
          user_timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================
      // SUBSCRIPTIONS
      // ============================================
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          tier: 'free' | 'pro' | 'enterprise'
          status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
          monthly_fuel_allowance: number
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          tier?: 'free' | 'pro' | 'enterprise'
          status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
          monthly_fuel_allowance?: number
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          stripe_subscription_id?: string
          stripe_price_id?: string
          tier?: 'free' | 'pro' | 'enterprise'
          status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
          monthly_fuel_allowance?: number
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================
      // BILLING TRANSACTIONS (Detailed ledger)
      // ============================================
      billing_transactions: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'subscription_refill'
          amount: number
          balance_after: number
          description: string | null
          stripe_payment_intent_id: string | null
          stripe_invoice_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'subscription_refill'
          amount: number
          balance_after: number
          description?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          user_id?: string
          project_id?: string | null
          type?: 'purchase' | 'usage' | 'refund' | 'bonus' | 'subscription_refill'
          amount?: number
          balance_after?: number
          description?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // RPC function to deduct fuel atomically
      deduct_fuel: {
        Args: {
          p_user_id: string
          p_project_id: string
          p_amount: number
          p_description: string
        }
        Returns: boolean
      }
      // RPC function to refund fuel
      refund_fuel: {
        Args: {
          p_user_id: string
          p_project_id: string
          p_amount: number
          p_description: string
        }
        Returns: boolean
      }
      // RPC function to use fuel - returns array of result objects
      use_fuel: {
        Args: {
          p_user_id: string
          p_project_id: string | null
          p_amount: number
          p_description: string
          p_metadata?: Json
        }
        Returns: Array<{ success: boolean; new_balance: number; error_message: string | null }>
      }
      // RPC function to add fuel - returns new balance
      add_fuel: {
        Args: {
          p_user_id: string
          p_amount: number
          p_type: string
          p_description: string
          p_stripe_payment_intent_id?: string
          p_stripe_invoice_id?: string
          p_metadata?: Json
        }
        Returns: number
      }
      // RPC function to check daily refill eligibility - returns array
      check_daily_refill: {
        Args: {
          p_user_id: string
        }
        Returns: Array<{ eligible: boolean; hours_until_refill: number }>
      }
      // RPC function to process daily refill atomically
      process_daily_refill: {
        Args: {
          p_user_id: string
          p_refill_amount: number
        }
        Returns: Array<{
          refilled: boolean
          amount: number | null
          hours_until_refill: number | null
        }>
      }
    }
    Enums: {
      tier: 'free' | 'pro' | 'enterprise'
      project_type: 'web' | 'mobile'
      message_role: 'user' | 'assistant' | 'system'
      transaction_type: 'purchase' | 'usage' | 'refund' | 'bonus'
    }
  }
}

// ============================================
// HELPER TYPES
// ============================================

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type FuelTransaction = Database['public']['Tables']['fuel_transactions']['Row']
export type AuditEvent = Database['public']['Tables']['audit_events']['Row']
export type ProjectCollaborator = Database['public']['Tables']['project_collaborators']['Row']
export type ProjectPresence = Database['public']['Tables']['project_presence']['Row']
export type BackgroundRun = Database['public']['Tables']['background_runs']['Row']
export type ProductEvent = Database['public']['Tables']['product_events']['Row']
export type StripeCustomer = Database['public']['Tables']['stripe_customers']['Row']
export type FuelBalance = Database['public']['Tables']['fuel_balances']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type BillingTransaction = Database['public']['Tables']['billing_transactions']['Row']

export type NewProject = Database['public']['Tables']['projects']['Insert']
export type UpdateProject = Database['public']['Tables']['projects']['Update']
export type NewMessage = Database['public']['Tables']['messages']['Insert']
export type NewBackgroundRun = Database['public']['Tables']['background_runs']['Insert']
export type UpdateBackgroundRun = Database['public']['Tables']['background_runs']['Update']
