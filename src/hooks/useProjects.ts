/**
 * TORBIT - useProjects Hook
 * 
 * CRUD operations for user projects with Supabase.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import type { Project, NewProject, UpdateProject, Json } from '@/lib/supabase/types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = getSupabase()
      if (!supabase) { setLoading(false); return }
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (fetchError) throw fetchError
      setProjects(data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch projects'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Create project
  const createProject = useCallback(async (project: Omit<NewProject, 'user_id'>) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not configured')
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Must be logged in to create a project')
    
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...project, user_id: user.id })
      .select()
      .single()
    
    if (error) throw error
    setProjects(prev => [data, ...prev])
    return data
  }, [])

  // Update project
  const updateProject = useCallback(async (id: string, updates: UpdateProject) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    setProjects(prev => prev.map(p => p.id === id ? data : p))
    return data
  }, [])

  // Delete project
  const deleteProject = useCallback(async (id: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [])

  // Save files to project
  const saveFiles = useCallback(async (projectId: string, files: Json) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase
      .from('projects')
      .update({ files, updated_at: new Date().toISOString() })
      .eq('id', projectId)
    
    if (error) throw error
  }, [])

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    saveFiles,
  }
}

// Single project hook
export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(!!projectId)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!projectId) {
      setProject(null)
      setLoading(false)
      return
    }

    const fetchProject = async () => {
      setLoading(true)
      try {
        const supabase = getSupabase()
        if (!supabase) { setLoading(false); return }
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()
        
        if (fetchError) throw fetchError
        setProject(data)
        
        // Update last opened
        await supabase
          .from('projects')
          .update({ last_opened_at: new Date().toISOString() })
          .eq('id', projectId)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch project'))
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [projectId])

  return { project, loading, error }
}
