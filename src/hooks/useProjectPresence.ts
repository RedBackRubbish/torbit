'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import type { Json, ProjectPresence } from '@/lib/supabase/types'

export interface PresenceMember extends ProjectPresence {
  isCurrentUser: boolean
}

function isMissingPresenceTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false

  const error = err as {
    code?: string
    message?: string
    details?: string
    hint?: string
  }

  if (error.code === '42P01' || error.code === 'PGRST205') {
    return true
  }

  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  return (
    text.includes('project_presence') &&
    (text.includes('does not exist') || text.includes('schema cache') || text.includes('not found'))
  )
}

export function useProjectPresence(projectId: string | null) {
  const [presence, setPresence] = useState<ProjectPresence[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [presenceSupported, setPresenceSupported] = useState(true)

  const fetchPresence = useCallback(async () => {
    if (!projectId || !presenceSupported) {
      setPresence([])
      return
    }

    const supabase = getSupabase()
    if (!supabase) {
      setPresence([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData.user?.id || null
      setCurrentUserId(uid)

      const { data, error: queryError } = await supabase
        .from('project_presence')
        .select('*')
        .eq('project_id', projectId)
        .order('heartbeat_at', { ascending: false })

      if (queryError) {
        throw queryError
      }

      setPresence(data || [])
    } catch (err) {
      if (isMissingPresenceTableError(err)) {
        setPresence([])
        setError(null)
        setPresenceSupported(false)
        return
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch project presence.'))
    } finally {
      setLoading(false)
    }
  }, [presenceSupported, projectId])

  useEffect(() => {
    if (!projectId || !presenceSupported) {
      setPresence([])
      return
    }

    fetchPresence()

    const supabase = getSupabase()
    if (!supabase) return

    const channel = supabase
      .channel(`project-presence:${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_presence',
        filter: `project_id=eq.${projectId}`,
      }, (payload) => {
        const eventType = payload.eventType
        const nextPresence = payload.new as ProjectPresence
        const previousPresence = payload.old as ProjectPresence

        setPresence((current) => {
          if (eventType === 'INSERT') {
            if (current.some((item) => item.id === nextPresence.id)) {
              return current
            }
            return [nextPresence, ...current]
          }

          if (eventType === 'UPDATE') {
            return current.map((item) => item.id === nextPresence.id ? nextPresence : item)
          }

          if (eventType === 'DELETE') {
            return current.filter((item) => item.id !== previousPresence.id)
          }

          return current
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPresence, presenceSupported, projectId])

  const upsertPresence = useCallback(async (
    status: ProjectPresence['status'] = 'online',
    cursor?: Json | null
  ) => {
    if (!projectId || !presenceSupported) return

    const supabase = getSupabase()
    if (!supabase) return

    let uid = currentUserId
    if (!uid) {
      const { data: authData } = await supabase.auth.getUser()
      uid = authData.user?.id || null
      setCurrentUserId(uid)
    }

    if (!uid) return

    const now = new Date().toISOString()
    const { error: upsertError } = await supabase
      .from('project_presence')
      .upsert({
        project_id: projectId,
        user_id: uid,
        status,
        cursor: cursor ?? null,
        heartbeat_at: now,
        updated_at: now,
      }, {
        onConflict: 'project_id,user_id',
      })

    if (upsertError) {
      if (isMissingPresenceTableError(upsertError)) {
        setPresenceSupported(false)
        return
      }
      throw upsertError
    }
  }, [currentUserId, presenceSupported, projectId])

  const members = useMemo<PresenceMember[]>(() => (
    presence.map((member) => ({
      ...member,
      isCurrentUser: member.user_id === currentUserId,
    }))
  ), [currentUserId, presence])

  return {
    members,
    loading,
    error,
    fetchPresence,
    upsertPresence,
  }
}
