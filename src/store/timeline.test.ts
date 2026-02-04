import { describe, it, expect, beforeEach } from 'vitest'
import { useTimeline, type TimelineStep, type AgentType, type StepStatus } from './timeline'

describe('TimelineStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useTimeline.setState({
      steps: [],
      activeStepId: null,
      isExpanded: true,
    })
  })

  describe('Initial State', () => {
    it('should have empty steps initially', () => {
      const state = useTimeline.getState()
      expect(state.steps).toEqual([])
      expect(state.activeStepId).toBeNull()
      expect(state.isExpanded).toBe(true)
    })
  })

  describe('addStep', () => {
    it('should add a step with generated id', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Builder',
        label: 'Creating component',
        status: 'active',
      })

      expect(stepId).toBeTruthy()
      expect(stepId).toContain('step-')
      
      const state = useTimeline.getState()
      expect(state.steps).toHaveLength(1)
      expect(state.steps[0].id).toBe(stepId)
    })

    it('should set active step when status is active', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Planner',
        label: 'Planning',
        status: 'active',
      })

      expect(useTimeline.getState().activeStepId).toBe(stepId)
    })

    it('should set active step when status is thinking', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Architect',
        label: 'Thinking...',
        status: 'thinking',
      })

      expect(useTimeline.getState().activeStepId).toBe(stepId)
    })

    it('should not set active step for pending status', () => {
      const store = useTimeline.getState()
      store.addStep({
        agent: 'Builder',
        label: 'Queued task',
        status: 'pending',
      })

      expect(useTimeline.getState().activeStepId).toBeNull()
    })

    it('should complete previous active step when adding new active step', () => {
      const store = useTimeline.getState()
      const firstId = store.addStep({
        agent: 'Planner',
        label: 'First',
        status: 'active',
      })

      store.addStep({
        agent: 'Builder',
        label: 'Second',
        status: 'active',
      })

      const state = useTimeline.getState()
      const firstStep = state.steps.find(s => s.id === firstId)
      expect(firstStep?.status).toBe('complete')
      expect(firstStep?.completedAt).toBeTruthy()
    })

    it('should add startedAt timestamp', () => {
      const before = Date.now()
      const store = useTimeline.getState()
      store.addStep({
        agent: 'DevOps',
        label: 'Deploying',
        status: 'active',
      })
      const after = Date.now()

      const step = useTimeline.getState().steps[0]
      expect(step.startedAt).toBeGreaterThanOrEqual(before)
      expect(step.startedAt).toBeLessThanOrEqual(after)
    })

    it('should initialize empty thinkingOutput array', () => {
      const store = useTimeline.getState()
      store.addStep({
        agent: 'Builder',
        label: 'Working',
        status: 'thinking',
      })

      const step = useTimeline.getState().steps[0]
      expect(step.thinkingOutput).toEqual([])
    })
  })

  describe('updateStep', () => {
    it('should update step properties', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Builder',
        label: 'Initial',
        status: 'pending',
      })

      store.updateStep(stepId, {
        label: 'Updated',
        description: 'New description',
      })

      const step = useTimeline.getState().steps.find(s => s.id === stepId)
      expect(step?.label).toBe('Updated')
      expect(step?.description).toBe('New description')
    })

    it('should set active step when updating to active status', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Builder',
        label: 'Waiting',
        status: 'pending',
      })

      expect(useTimeline.getState().activeStepId).toBeNull()

      store.updateStep(stepId, { status: 'active' })

      expect(useTimeline.getState().activeStepId).toBe(stepId)
    })

    it('should handle non-existent step gracefully', () => {
      const store = useTimeline.getState()
      // Should not throw
      store.updateStep('non-existent', { label: 'Test' })
      expect(useTimeline.getState().steps).toHaveLength(0)
    })
  })

  describe('completeStep', () => {
    it('should mark step as complete', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Builder',
        label: 'Task',
        status: 'active',
      })

      store.completeStep(stepId)

      const step = useTimeline.getState().steps.find(s => s.id === stepId)
      expect(step?.status).toBe('complete')
      expect(step?.completedAt).toBeTruthy()
    })

    it('should clear active step if completed step was active', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Builder',
        label: 'Task',
        status: 'active',
      })

      expect(useTimeline.getState().activeStepId).toBe(stepId)

      store.completeStep(stepId)

      expect(useTimeline.getState().activeStepId).toBeNull()
    })

    it('should allow marking as failed with success=false', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Builder',
        label: 'Task',
        status: 'active',
      })

      store.completeStep(stepId, false)

      const step = useTimeline.getState().steps.find(s => s.id === stepId)
      expect(step?.status).toBe('failed')
    })
  })

  describe('failStep', () => {
    it('should mark step as failed with error message', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Builder',
        label: 'Task',
        status: 'active',
      })

      store.failStep(stepId, 'Something went wrong')

      const step = useTimeline.getState().steps.find(s => s.id === stepId)
      expect(step?.status).toBe('failed')
      expect(step?.error).toBe('Something went wrong')
      expect(step?.completedAt).toBeTruthy()
    })

    it('should clear active step', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Builder',
        label: 'Task',
        status: 'active',
      })

      store.failStep(stepId, 'Error')

      expect(useTimeline.getState().activeStepId).toBeNull()
    })
  })

  describe('appendThinking', () => {
    it('should append thought to step', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Architect',
        label: 'Thinking',
        status: 'thinking',
      })

      store.appendThinking(stepId, 'First thought')
      store.appendThinking(stepId, 'Second thought')

      const step = useTimeline.getState().steps.find(s => s.id === stepId)
      expect(step?.thinkingOutput).toEqual(['First thought', 'Second thought'])
    })

    it('should initialize thinkingOutput if undefined', () => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Builder',
        label: 'Working',
        status: 'active',
      })

      // Force undefined thinkingOutput
      useTimeline.setState(state => ({
        ...state,
        steps: state.steps.map(s => 
          s.id === stepId ? { ...s, thinkingOutput: undefined } : s
        ),
      }))

      store.appendThinking(stepId, 'New thought')

      const step = useTimeline.getState().steps.find(s => s.id === stepId)
      expect(step?.thinkingOutput).toContain('New thought')
    })
  })

  describe('clearTimeline', () => {
    it('should clear all steps', () => {
      const store = useTimeline.getState()
      store.addStep({ agent: 'Builder', label: 'One', status: 'complete' })
      store.addStep({ agent: 'Builder', label: 'Two', status: 'complete' })
      store.addStep({ agent: 'Builder', label: 'Three', status: 'active' })

      expect(useTimeline.getState().steps).toHaveLength(3)

      store.clearTimeline()

      expect(useTimeline.getState().steps).toHaveLength(0)
      expect(useTimeline.getState().activeStepId).toBeNull()
    })
  })

  describe('setExpanded', () => {
    it('should toggle expanded state', () => {
      const store = useTimeline.getState()
      
      expect(useTimeline.getState().isExpanded).toBe(true)
      
      store.setExpanded(false)
      expect(useTimeline.getState().isExpanded).toBe(false)
      
      store.setExpanded(true)
      expect(useTimeline.getState().isExpanded).toBe(true)
    })
  })

  describe('Query Helpers', () => {
    it('getActiveStep should return current active step', () => {
      const store = useTimeline.getState()
      store.addStep({ agent: 'Builder', label: 'Inactive', status: 'complete' })
      const activeId = store.addStep({ agent: 'Auditor', label: 'Active', status: 'active' })

      const activeStep = store.getActiveStep()
      
      expect(activeStep).not.toBeNull()
      expect(activeStep?.id).toBe(activeId)
      expect(activeStep?.agent).toBe('Auditor')
    })

    it('getActiveStep should return null when no active step', () => {
      const store = useTimeline.getState()
      store.addStep({ agent: 'Builder', label: 'Done', status: 'complete' })

      expect(store.getActiveStep()).toBeNull()
    })

    it('getPendingSteps should return all pending steps', () => {
      const store = useTimeline.getState()
      store.addStep({ agent: 'Builder', label: 'Pending 1', status: 'pending' })
      store.addStep({ agent: 'Builder', label: 'Active', status: 'active' })
      store.addStep({ agent: 'Builder', label: 'Pending 2', status: 'pending' })
      store.addStep({ agent: 'Builder', label: 'Complete', status: 'complete' })

      const pending = store.getPendingSteps()
      
      expect(pending).toHaveLength(2)
      expect(pending.every(s => s.status === 'pending')).toBe(true)
    })
  })

  describe('Agent Types', () => {
    const agentTypes: AgentType[] = ['Planner', 'Builder', 'Auditor', 'Architect', 'DevOps']

    it.each(agentTypes)('should accept %s as agent type', (agent) => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent,
        label: `${agent} task`,
        status: 'active',
      })

      const step = useTimeline.getState().steps.find(s => s.id === stepId)
      expect(step?.agent).toBe(agent)
    })
  })

  describe('Step Statuses', () => {
    const statuses: StepStatus[] = ['pending', 'thinking', 'active', 'auditing', 'complete', 'failed']

    it.each(statuses)('should handle %s status', (status) => {
      const store = useTimeline.getState()
      const stepId = store.addStep({
        agent: 'Builder',
        label: 'Test',
        status,
      })

      const step = useTimeline.getState().steps.find(s => s.id === stepId)
      expect(step?.status).toBe(status)
    })
  })
})
