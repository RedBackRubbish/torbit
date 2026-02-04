import { describe, it, expect } from 'vitest'
import {
  createUserId,
  createAgentId,
  createMessageId,
  createProjectId,
  createTransactionId,
  createTaskId,
  isUserId,
  isAgentId,
  isMessageId,
  isProjectId,
  isTransactionId,
  isTaskId,
  unwrapId,
  AGENT_IDS,
  getAgentName,
  type UserId,
  type AgentId,
} from './branded-types'

describe('Branded Types', () => {
  describe('ID Creation', () => {
    it('should create UserId with prefix', () => {
      const id = createUserId()
      expect(id).toMatch(/^user_/)
    })

    it('should create AgentId with prefix', () => {
      const id = createAgentId()
      expect(id).toMatch(/^agent_/)
    })

    it('should create MessageId with prefix', () => {
      const id = createMessageId()
      expect(id).toMatch(/^msg_/)
    })

    it('should create ProjectId with prefix', () => {
      const id = createProjectId()
      expect(id).toMatch(/^proj_/)
    })

    it('should create TransactionId with prefix', () => {
      const id = createTransactionId()
      expect(id).toMatch(/^txn_/)
    })

    it('should create TaskId with prefix', () => {
      const id = createTaskId()
      expect(id).toMatch(/^task_/)
    })

    it('should allow custom values', () => {
      const customId = createUserId('user_custom123')
      expect(customId).toBe('user_custom123')
    })

    it('should generate unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(createMessageId())
      }
      expect(ids.size).toBe(100)
    })
  })

  describe('Type Guards', () => {
    it('should validate UserId format', () => {
      expect(isUserId('user_123')).toBe(true)
      expect(isUserId('agent_123')).toBe(false)
      expect(isUserId('invalid')).toBe(false)
    })

    it('should validate AgentId format', () => {
      expect(isAgentId('agent_123')).toBe(true)
      expect(isAgentId('user_123')).toBe(false)
    })

    it('should validate MessageId format', () => {
      expect(isMessageId('msg_123')).toBe(true)
      expect(isMessageId('message_123')).toBe(false)
    })

    it('should validate ProjectId format', () => {
      expect(isProjectId('proj_123')).toBe(true)
      expect(isProjectId('project_123')).toBe(false)
    })

    it('should validate TransactionId format', () => {
      expect(isTransactionId('txn_123')).toBe(true)
      expect(isTransactionId('transaction_123')).toBe(false)
    })

    it('should validate TaskId format', () => {
      expect(isTaskId('task_123')).toBe(true)
      expect(isTaskId('todo_123')).toBe(false)
    })
  })

  describe('Utilities', () => {
    it('should unwrap ID to raw string', () => {
      const userId = createUserId('user_test')
      const raw = unwrapId(userId)
      expect(raw).toBe('user_test')
      expect(typeof raw).toBe('string')
    })

    it('should provide predefined agent IDs', () => {
      expect(AGENT_IDS.ARCHITECT).toBe('agent_architect')
      expect(AGENT_IDS.FRONTEND).toBe('agent_frontend')
      expect(AGENT_IDS.BACKEND).toBe('agent_backend')
      expect(AGENT_IDS.DESIGNER).toBe('agent_designer')
      expect(AGENT_IDS.DEBUGGER).toBe('agent_debugger')
    })

    it('should get agent name from ID', () => {
      expect(getAgentName(AGENT_IDS.ARCHITECT)).toBe('Architect')
      expect(getAgentName(AGENT_IDS.FRONTEND)).toBe('Frontend')
      expect(getAgentName(createAgentId('agent_custom'))).toBe('Custom')
    })
  })

  describe('Type Safety (compile-time)', () => {
    it('should not allow mixing ID types at runtime (demonstration)', () => {
      const userId: UserId = createUserId()
      const agentId: AgentId = createAgentId()
      
      // At runtime these are just strings, but TypeScript prevents mixing at compile time
      // This test demonstrates they are different values
      expect(userId).not.toBe(agentId)
    })
  })
})
