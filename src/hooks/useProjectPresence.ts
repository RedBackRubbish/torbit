'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import type { Json, ProjectPresence } from '@/lib/supabase/types'

export interface PresenceMember extends ProjectPresence {
  isCurrentUser: boolean
}

// Cache table support for the current runtime session so repeated mounts
// do not keep hitting a missing endpoint and spamming 404s.
let presenceFeatureSupportedCache: boolean | null = null

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
  const [presenceSupported, setPresenceSupported] = useState(presenceFeatureSupportedCache !== false)

  const disablePresenceSupport = useCallback(() => {
    presenceFeatureSupportedCache = false
    setPresenceSupported(false)
    setPresence([])
    setError(null)
  }, [])

  const fetchPresence = useCallback(async () => {
    if (!projectId || !presenceSupported) {
      setPresence([])
      return false
    }

    const supabase = getSupabase()
    if (!supabase) {
      setPresence([])
      return false
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
      return true
    } catch (err) {
      if (isMissingPresenceTableError(err)) {
        disablePresenceSupport()
        return false
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch project presence.'))
      return false
    } finally {
      setLoading(false)
    }
  }, [disablePresenceSupport, presenceSupported, projectId])

  useEffect(() => {
    if (!projectId || !presenceSupported) {
      setPresence([])
      return
    }

    let active = true
    let channelCleanup: (() => void) | null = null

    const bootstrapPresence = async () => {
      const canSubscribe = await fetchPresence()
      if (!active || !canSubscribe) return

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

      channelCleanup = () => {
        supabase.removeChannel(channel)
      }
    }

    void bootstrapPresence()

    return () => {
      active = false
      channelCleanup?.()
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
        disablePresenceSupport()
        return
      }
      throw upsertError
    }
  }, [currentUserId, disablePresenceSupport, presenceSupported, projectId])

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
