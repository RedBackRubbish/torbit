import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// ============================================
// Types
// ============================================

// Full agent list - includes all specialist agents
export type AgentId = 'architect' | 'frontend' | 'backend' | 'database' | 'devops' | 'qa' | 'planner' | 'auditor'
export type AgentStatus = 'idle' | 'thinking' | 'working' | 'complete' | 'error'

export interface Agent {
  id: AgentId
  name: string
  role: string
  status: AgentStatus
  color: string
  currentTask?: string
  progress?: number
}

export interface ProjectFile {
  id: string
  path: string
  name: string
  content: string
  language: string
  isNew?: boolean
  isModified?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agentId?: AgentId
  timestamp: Date
  isStreaming?: boolean
}

export interface BuilderState {
  // Project
  projectId: string | null
  projectName: string
  prompt: string
  
  // Files
  files: ProjectFile[]
  activeFileId: string | null
  
  // Agents
  agents: Agent[]
  activeAgentId: AgentId | null
  
  // Chat
  messages: ChatMessage[]
  isGenerating: boolean
  
  // UI State
  sidebarTab: 'agents' | 'files'
  previewTab: 'preview' | 'code'
  previewDevice: 'desktop' | 'tablet' | 'mobile'
  sidebarCollapsed: boolean
  chatCollapsed: boolean
}

export interface BuilderActions {
  // Project
  initProject: (prompt: string) => void
  
  // Files
  addFile: (file: Omit<ProjectFile, 'id'>) => void
  updateFile: (id: string, content: string) => void
  deleteFile: (id: string) => void
  setActiveFile: (id: string | null) => void
  
  // Agents
  setAgentStatus: (agentId: AgentId, status: AgentStatus, task?: string, progress?: number) => void
  setActiveAgent: (agentId: AgentId | null) => void
  
  // Chat
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateLastMessage: (content: string) => void
  setIsGenerating: (isGenerating: boolean) => void
  
  // UI
  setSidebarTab: (tab: 'agents' | 'files') => void
  setPreviewTab: (tab: 'preview' | 'code') => void
  setPreviewDevice: (device: 'desktop' | 'tablet' | 'mobile') => void
  toggleSidebar: () => void
  toggleChat: () => void
  
  // Reset
  reset: () => void
}

// ============================================
// Initial State
// ============================================

const INITIAL_AGENTS: Agent[] = [
  {
    id: 'architect',
    name: 'Architect',
    role: 'System Design & Planning',
    status: 'idle',
    color: '#00ff41',
  },
  {
    id: 'frontend',
    name: 'Frontend',
    role: 'UI/UX Implementation',
    status: 'idle',
    color: '#00d4ff',
  },
  {
    id: 'backend',
    name: 'Backend',
    role: 'API & Business Logic',
    status: 'idle',
    color: '#ff6b00',
  },
  {
    id: 'database',
    name: 'Database',
    role: 'Data Architecture',
    status: 'idle',
    color: '#a855f7',
  },
  {
    id: 'devops',
    name: 'DevOps',
    role: 'Infrastructure & Deploy',
    status: 'idle',
    color: '#f43f5e',
  },
  {
    id: 'qa',
    name: 'QA',
    role: 'Testing & Quality',
    status: 'idle',
    color: '#eab308',
  },
  {
    id: 'planner',
    name: 'Planner',
    role: 'Task & Ticket Management',
    status: 'idle',
    color: '#22c55e',
  },
  {
    id: 'auditor',
    name: 'Auditor',
    role: 'Hostile QA & Code Review',
    status: 'idle',
    color: '#ef4444',
  },
]

const initialState: BuilderState = {
  projectId: null,
  projectName: 'Untitled Project',
  prompt: '',
  files: [],
  activeFileId: null,
  agents: INITIAL_AGENTS,
  activeAgentId: null,
  messages: [],
  isGenerating: false,
  sidebarTab: 'agents',
  previewTab: 'preview',
  previewDevice: 'desktop',
  sidebarCollapsed: false,
  chatCollapsed: false,
}

// ============================================
// Store
// ============================================

export const useBuilderStore = create<BuilderState & BuilderActions>()(
  immer((set, get) => ({
    ...initialState,

    initProject: (prompt) => {
      set((state) => {
        state.projectId = crypto.randomUUID()
        state.prompt = prompt
        state.messages = [
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: 'Project initialized. Agents standing by.',
            timestamp: new Date(),
          },
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: prompt,
            timestamp: new Date(),
          },
        ]
      })
    },

    addFile: (file) => {
      set((state) => {
        state.files.push({
          ...file,
          id: crypto.randomUUID(),
          isNew: true,
        })
      })
    },

    updateFile: (id, content) => {
      set((state) => {
        const file = state.files.find((f) => f.id === id)
        if (file) {
          file.content = content
          file.isModified = true
        }
      })
    },

    deleteFile: (id) => {
      set((state) => {
        state.files = state.files.filter((f) => f.id !== id)
        if (state.activeFileId === id) {
          state.activeFileId = null
        }
      })
    },

    setActiveFile: (id) => {
      set((state) => {
        state.activeFileId = id
        if (id) {
          state.previewTab = 'code'
        }
      })
    },

    setAgentStatus: (agentId, status, task, progress) => {
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId)
        if (agent) {
          agent.status = status
          agent.currentTask = task
          agent.progress = progress
        }
      })
    },

    setActiveAgent: (agentId) => {
      set((state) => {
        state.activeAgentId = agentId
      })
    },

    addMessage: (message) => {
      set((state) => {
        state.messages.push({
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        })
      })
    },

    updateLastMessage: (content) => {
      set((state) => {
        const lastMessage = state.messages[state.messages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = content
        }
      })
    },

    setIsGenerating: (isGenerating) => {
      set((state) => {
        state.isGenerating = isGenerating
      })
    },

    setSidebarTab: (tab) => {
      set((state) => {
        state.sidebarTab = tab
      })
    },

    setPreviewTab: (tab) => {
      set((state) => {
        state.previewTab = tab
      })
    },

    setPreviewDevice: (device) => {
      set((state) => {
        state.previewDevice = device
      })
    },

    toggleSidebar: () => {
      set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed
      })
    },

    toggleChat: () => {
      set((state) => {
        state.chatCollapsed = !state.chatCollapsed
      })
    },

    reset: () => {
      set(() => initialState)
    },
  }))
)
