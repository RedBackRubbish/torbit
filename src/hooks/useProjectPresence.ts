'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import type { Json, ProjectPresence } from '@/lib/supabase/types'

export interface PresenceMember extends ProjectPresence {
  isCurrentUser: boolean
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PRESENCE_FEATURE_ENABLED = process.env.NODE_ENV === 'test'
  ? true
  : process.env.NEXT_PUBLIC_ENABLE_PROJECT_PRESENCE === 'true'

// Cache table support for the current runtime session so repeated mounts
// do not keep hitting a missing endpoint and spamming 404s.
let presenceFeatureSupportedCache: boolean | null = null
let presenceFeatureProbeCompleteCache = false

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function isMissingPresenceTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false

  const error = err as {
    code?: string
    message?: string
    details?: string
    hint?: string
    status?: number
    statusCode?: number
    statusText?: string
  }

  if (error.status === 404 || error.statusCode === 404) {
    return true
  }

  if (error.code === '42P01' || error.code === 'PGRST205') {
    return true
  }

  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''} ${error.statusText ?? ''}`.toLowerCase()
  if (
    text.includes('404') ||
    text.includes('not found')
  ) {
    return true
  }

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
  const [presenceSupported, setPresenceSupported] = useState(
    PRESENCE_FEATURE_ENABLED && presenceFeatureSupportedCache !== false
  )
  const [presenceProbeComplete, setPresenceProbeComplete] = useState(presenceFeatureProbeCompleteCache)

  const disablePresenceSupport = useCallback(() => {
    presenceFeatureSupportedCache = false
    presenceFeatureProbeCompleteCache = true
    setPresenceSupported(false)
    setPresenceProbeComplete(true)
    setPresence([])
    setError(null)
  }, [])

  const markPresenceSupported = useCallback(() => {
    presenceFeatureSupportedCache = true
    presenceFeatureProbeCompleteCache = true
    setPresenceSupported(true)
    setPresenceProbeComplete(true)
  }, [])

  const fetchPresence = useCallback(async () => {
    if (!PRESENCE_FEATURE_ENABLED) {
      setPresence([])
      setPresenceProbeComplete(true)
      return false
    }

    if (!projectId) {
      setPresence([])
      setPresenceProbeComplete(false)
      return false
    }

    if (!presenceSupported) {
      setPresence([])
      setPresenceProbeComplete(true)
      return false
    }

    if (!isUuid(projectId)) {
      setPresence([])
      setError(null)
      setPresenceProbeComplete(true)
      return false
    }

    const supabase = getSupabase()
    if (!supabase) {
      setPresence([])
      setPresenceProbeComplete(true)
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
      markPresenceSupported()
      return true
    } catch (err) {
      if (isMissingPresenceTableError(err)) {
        disablePresenceSupport()
        return false
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch project presence.'))
      setPresenceProbeComplete(true)
      return false
    } finally {
      setLoading(false)
    }
  }, [disablePresenceSupport, markPresenceSupported, presenceSupported, projectId])

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
    if (!projectId || !presenceSupported || !presenceProbeComplete) return
    if (!isUuid(projectId)) return

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
  }, [currentUserId, disablePresenceSupport, presenceProbeComplete, presenceSupported, projectId])

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
