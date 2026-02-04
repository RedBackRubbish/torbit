import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import type { AgentId } from '@/lib/tools/definitions'

// ============================================
// Types
// ============================================

export type TaskStatus = 'not-started' | 'in-progress' | 'completed' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  agentId?: AgentId
  createdAt: number
  updatedAt: number
  completedAt?: number
  parentId?: string  // For subtasks
  externalId?: string  // Linear/Jira/GitHub ID
}

export interface TasksState {
  tasks: Task[]
  activeTaskId: string | null
}

export interface TasksActions {
  // CRUD
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  
  // Bulk operations
  clearCompleted: () => void
  clearAll: () => void
  
  // Status changes
  setTaskStatus: (id: string, status: TaskStatus) => void
  markComplete: (id: string) => void
  markInProgress: (id: string) => void
  
  // Active task
  setActiveTask: (id: string | null) => void
  
  // Agent operations
  addAgentTask: (agentId: AgentId, title: string, description?: string) => string
  getAgentTasks: (agentId: AgentId) => Task[]
  
  // Queries
  getTasksByStatus: (status: TaskStatus) => Task[]
  getTaskById: (id: string) => Task | undefined
}

// ============================================
// Store
// ============================================

export const useTaskStore = create<TasksState & TasksActions>()(
  persist(
    immer((set, get) => ({
      // Initial state
      tasks: [],
      activeTaskId: null,

      // Add task
      addTask: (taskData) => {
        const id = crypto.randomUUID()
        const now = Date.now()
        
        set((state) => {
          state.tasks.push({
            ...taskData,
            id,
            createdAt: now,
            updatedAt: now,
          })
        })
        
        return id
      },

      // Update task
      updateTask: (id, updates) => {
        set((state) => {
          const task = state.tasks.find(t => t.id === id)
          if (task) {
            Object.assign(task, updates, { updatedAt: Date.now() })
            
            // Set completedAt when marked complete
            if (updates.status === 'completed' && !task.completedAt) {
              task.completedAt = Date.now()
            }
            // Clear completedAt if un-completed
            if (updates.status && updates.status !== 'completed') {
              task.completedAt = undefined
            }
          }
        })
      },

      // Delete task
      deleteTask: (id) => {
        set((state) => {
          state.tasks = state.tasks.filter(t => t.id !== id)
          if (state.activeTaskId === id) {
            state.activeTaskId = null
          }
        })
      },

      // Clear completed
      clearCompleted: () => {
        set((state) => {
          state.tasks = state.tasks.filter(t => t.status !== 'completed')
        })
      },

      // Clear all
      clearAll: () => {
        set((state) => {
          state.tasks = []
          state.activeTaskId = null
        })
      },

      // Status helpers
      setTaskStatus: (id, status) => {
        get().updateTask(id, { status })
      },

      markComplete: (id) => {
        get().updateTask(id, { status: 'completed' })
      },

      markInProgress: (id) => {
        get().updateTask(id, { status: 'in-progress' })
      },

      // Active task
      setActiveTask: (id) => {
        set((state) => {
          state.activeTaskId = id
        })
      },

      // Agent operations
      addAgentTask: (agentId, title, description = '') => {
        return get().addTask({
          title,
          description,
          status: 'in-progress',
          priority: 'medium',
          agentId,
        })
      },

      getAgentTasks: (agentId) => {
        return get().tasks.filter(t => t.agentId === agentId)
      },

      // Queries
      getTasksByStatus: (status) => {
        return get().tasks.filter(t => t.status === status)
      },

      getTaskById: (id) => {
        return get().tasks.find(t => t.id === id)
      },
    })),
    {
      name: 'torbit-tasks',
      version: 1,
    }
  )
)

// ============================================
// Helper hooks
// ============================================

export function useActiveTask() {
  const { activeTaskId, tasks, setActiveTask } = useTaskStore()
  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) : null
  return { activeTask, setActiveTask }
}

export function useTaskStats() {
  const tasks = useTaskStore(state => state.tasks)
  
  return {
    total: tasks.length,
    notStarted: tasks.filter(t => t.status === 'not-started').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    completionRate: tasks.length > 0 
      ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 
      : 0,
  }
}
