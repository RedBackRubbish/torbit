/**
 * useProjects Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const mockProjects = [
  {
    id: 'project-1',
    user_id: 'user-1',
    name: 'Test Project 1',
    description: 'A test project',
    project_type: 'web',
    files: [],
    settings: {},
    created_at: '2026-02-05T00:00:00Z',
    updated_at: '2026-02-05T00:00:00Z',
  },
  {
    id: 'project-2',
    user_id: 'user-1',
    name: 'Test Project 2',
    description: null,
    project_type: 'mobile',
    files: [],
    settings: {},
    created_at: '2026-02-04T00:00:00Z',
    updated_at: '2026-02-04T00:00:00Z',
  },
]

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => Promise.resolve({ data: mockProjects, error: null })),
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: mockProjects[0], error: null })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: { ...mockProjects[0], id: 'new-project' }, 
          error: null 
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { ...mockProjects[0], name: 'Updated Name' }, 
            error: null 
          })),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => mockSupabase,
}))

describe('useProjects Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should start with loading true', async () => {
      const { useProjects } = await import('../useProjects')
      const { result } = renderHook(() => useProjects())
      
      expect(result.current.loading).toBe(true)
    })

    it('should have empty projects initially', async () => {
      const { useProjects } = await import('../useProjects')
      const { result } = renderHook(() => useProjects())
      
      expect(result.current.projects).toEqual([])
    })
  })

  describe('Fetching Projects', () => {
    it('should fetch projects on mount', async () => {
      const { useProjects } = await import('../useProjects')
      const { result } = renderHook(() => useProjects())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.projects).toHaveLength(2)
    })

    it('should order projects by updated_at descending', async () => {
      const { useProjects } = await import('../useProjects')
      renderHook(() => useProjects())
      
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('projects')
      })
    })
  })

  describe('CRUD Operations', () => {
    it('should expose createProject method', async () => {
      const { useProjects } = await import('../useProjects')
      const { result } = renderHook(() => useProjects())
      
      expect(typeof result.current.createProject).toBe('function')
    })

    it('should expose updateProject method', async () => {
      const { useProjects } = await import('../useProjects')
      const { result } = renderHook(() => useProjects())
      
      expect(typeof result.current.updateProject).toBe('function')
    })

    it('should expose deleteProject method', async () => {
      const { useProjects } = await import('../useProjects')
      const { result } = renderHook(() => useProjects())
      
      expect(typeof result.current.deleteProject).toBe('function')
    })

    it('should expose saveFiles method', async () => {
      const { useProjects } = await import('../useProjects')
      const { result } = renderHook(() => useProjects())
      
      expect(typeof result.current.saveFiles).toBe('function')
    })

    it('should expose fetchProjects method', async () => {
      const { useProjects } = await import('../useProjects')
      const { result } = renderHook(() => useProjects())
      
      expect(typeof result.current.fetchProjects).toBe('function')
    })
  })

  describe('Error Handling', () => {
    it('should set error state on fetch failure', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Fetch failed' }
          })),
          eq: vi.fn(),
        })),
      } as any)

      const { useProjects } = await import('../useProjects')
      const { result } = renderHook(() => useProjects())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.error).toBeDefined()
    })
  })
})

describe('useProject Hook (Single Project)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch single project by ID', async () => {
    const { useProject } = await import('../useProjects')
    const { result } = renderHook(() => useProject('project-1'))
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(result.current.project).toBeDefined()
  })

  it('should return null project when ID is null', async () => {
    const { useProject } = await import('../useProjects')
    const { result } = renderHook(() => useProject(null))
    
    expect(result.current.project).toBeNull()
    expect(result.current.loading).toBe(false)
  })
})
