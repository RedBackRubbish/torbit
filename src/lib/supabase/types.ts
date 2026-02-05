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

export type NewProject = Database['public']['Tables']['projects']['Insert']
export type UpdateProject = Database['public']['Tables']['projects']['Update']
export type NewMessage = Database['public']['Tables']['messages']['Insert']
