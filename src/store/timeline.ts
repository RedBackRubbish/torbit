import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// ============================================================================
// NEURAL TIMELINE STORE
// ============================================================================
// Tracks agent activity as a visual "subway map" of nodes
// Each step represents an agent action with status tracking
// ============================================================================

export type StepStatus = 'pending' | 'thinking' | 'active' | 'auditing' | 'complete' | 'failed'
export type AgentType = 'Planner' | 'Builder' | 'Auditor' | 'Architect' | 'DevOps'

export interface TimelineStep {
  id: string
  agent: AgentType
  label: string
  description?: string
  status: StepStatus
  fuelCost?: number
  startedAt?: number
  completedAt?: number
  thinkingOutput?: string[]  // Live streaming thoughts
  error?: string
}

export interface TimelineState {
  steps: TimelineStep[]
  activeStepId: string | null
  isExpanded: boolean
}

export interface TimelineActions {
  // Step Management
  addStep: (step: Omit<TimelineStep, 'id' | 'startedAt'>) => string
  updateStep: (id: string, updates: Partial<TimelineStep>) => void
  completeStep: (id: string, success?: boolean) => void
  failStep: (id: string, error: string) => void
  
  // Thinking Stream
  appendThinking: (id: string, line: string) => void
  
  // Bulk Operations
  clearTimeline: () => void
  setExpanded: (expanded: boolean) => void
  
  // Query Helpers
  getActiveStep: () => TimelineStep | null
  getPendingSteps: () => TimelineStep[]
}

// Agent -> Tool mapping for automatic agent detection
export const TOOL_TO_AGENT: Record<string, AgentType> = {
  // Planner tools
  'planSteps': 'Planner',
  'updatePlan': 'Planner',
  'generateDesignSystem': 'Planner',
  
  // Architect tools
  'analyzeRequirements': 'Architect',
  'designArchitecture': 'Architect',
  'selectTechStack': 'Architect',
  'verifyDependencyGraph': 'Architect',
  
  // Builder tools (Frontend/Backend/Database)
  'createFile': 'Builder',
  'editFile': 'Builder',
  'deleteFile': 'Builder',
  'runTerminalCommand': 'Builder',
  'installPackage': 'Builder',
  'generateComponent': 'Builder',
  'createApiRoute': 'Builder',
  'createDatabaseSchema': 'Builder',
  'generateMigration': 'Builder',
  
  // Auditor tools
  'runTests': 'Auditor',
  'lintCode': 'Auditor',
  'verifyVisualMatch': 'Auditor',
  'runE2eCycle': 'Auditor',
  'checkAccessibility': 'Auditor',
  
  // DevOps tools
  'deployToProduction': 'DevOps',
  'syncToGithub': 'DevOps',
  'setupCI': 'DevOps',
}

// Fuel cost estimates per tool category
export const TOOL_FUEL_COSTS: Record<string, number> = {
  // Low cost (1-2 fuel)
  'planSteps': 1,
  'updatePlan': 1,
  'analyzeRequirements': 2,
  
  // Medium cost (3-5 fuel)
  'createFile': 3,
  'editFile': 3,
  'generateComponent': 5,
  'createApiRoute': 4,
  
  // High cost (8-15 fuel)
  'runTests': 8,
  'runE2eCycle': 15,
  'deployToProduction': 12,
  'verifyVisualMatch': 10,
}

let stepCounter = 0

export const useTimeline = create<TimelineState & TimelineActions>()(
  immer((set, get) => ({
    // Initial State
    steps: [],
    activeStepId: null,
    isExpanded: true,

    // ========================================================================
    // Step Management
    // ========================================================================
    
    addStep: (step) => {
      const id = `step-${++stepCounter}-${Date.now()}`
      
      set((state) => {
        // Mark any previous active step as complete if still active
        const prevActive = state.steps.find(s => s.id === state.activeStepId)
        if (prevActive && prevActive.status === 'active') {
          prevActive.status = 'complete'
          prevActive.completedAt = Date.now()
        }
        
        state.steps.push({
          ...step,
          id,
          startedAt: Date.now(),
          thinkingOutput: [],
        })
        
        if (step.status === 'active' || step.status === 'thinking') {
          state.activeStepId = id
        }
      })
      
      return id
    },

    updateStep: (id, updates) => {
      set((state) => {
        const step = state.steps.find(s => s.id === id)
        if (step) {
          Object.assign(step, updates)
          
          if (updates.status === 'active' || updates.status === 'thinking') {
            state.activeStepId = id
          }
        }
      })
    },

    completeStep: (id, success = true) => {
      set((state) => {
        const step = state.steps.find(s => s.id === id)
        if (step) {
          step.status = success ? 'complete' : 'failed'
          step.completedAt = Date.now()
          
          if (state.activeStepId === id) {
            state.activeStepId = null
          }
        }
      })
    },

    failStep: (id, error) => {
      set((state) => {
        const step = state.steps.find(s => s.id === id)
        if (step) {
          step.status = 'failed'
          step.error = error
          step.completedAt = Date.now()
          
          if (state.activeStepId === id) {
            state.activeStepId = null
          }
        }
      })
    },

    // ========================================================================
    // Thinking Stream (Real-time agent thoughts)
    // ========================================================================
    
    appendThinking: (id, line) => {
      set((state) => {
        const step = state.steps.find(s => s.id === id)
        if (step) {
          if (!step.thinkingOutput) {
            step.thinkingOutput = []
          }
          step.thinkingOutput.push(line)
          
          // Keep only last 5 lines for performance
          if (step.thinkingOutput.length > 5) {
            step.thinkingOutput = step.thinkingOutput.slice(-5)
          }
        }
      })
    },

    // ========================================================================
    // Bulk Operations
    // ========================================================================
    
    clearTimeline: () => {
      set((state) => {
        state.steps = []
        state.activeStepId = null
      })
      stepCounter = 0
    },

    setExpanded: (expanded) => {
      set((state) => {
        state.isExpanded = expanded
      })
    },

    // ========================================================================
    // Query Helpers
    // ========================================================================
    
    getActiveStep: () => {
      const state = get()
      return state.steps.find(s => s.id === state.activeStepId) || null
    },

    getPendingSteps: () => {
      return get().steps.filter(s => s.status === 'pending' || s.status === 'thinking')
    },
  }))
)

// ============================================================================
// Helper: Get agent info for display
// ============================================================================
export function getAgentDisplayInfo(agent: AgentType) {
  const info = {
    Planner: { icon: 'Brain', color: 'cyan', label: 'Planning' },
    Architect: { icon: 'Compass', color: 'blue', label: 'Architecting' },
    Builder: { icon: 'Hammer', color: 'yellow', label: 'Building' },
    Auditor: { icon: 'ShieldCheck', color: 'purple', label: 'Auditing' },
    DevOps: { icon: 'Rocket', color: 'silver', label: 'Deploying' },
  }
  return info[agent] || info.Builder
}
