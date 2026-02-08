/**
 * Supabase Types Tests
 * 
 * Tests type exports and database schema types.
 */

import { describe, it, expect } from 'vitest'
import type {
  Database,
  Profile,
  Project,
  Conversation,
  Message,
  FuelTransaction,
  AuditEvent,
  ProjectCollaborator,
  ProjectPresence,
  BackgroundRun,
  ProductEvent,
  NewProject,
  UpdateProject,
  NewMessage,
  NewBackgroundRun,
  UpdateBackgroundRun,
  Json,
} from '../types'

describe('Supabase Types', () => {
  describe('Type Exports', () => {
    it('should export Database type', () => {
      // Type-level test - if this compiles, types are exported correctly
      const _db: Database | null = null
      expect(_db).toBeNull()
    })

    it('should export all table row types', () => {
      const _profile: Profile | null = null
      const _project: Project | null = null
      const _conversation: Conversation | null = null
      const _message: Message | null = null
      const _fuelTransaction: FuelTransaction | null = null
      const _auditEvent: AuditEvent | null = null
      const _projectCollaborator: ProjectCollaborator | null = null
      const _projectPresence: ProjectPresence | null = null
      const _backgroundRun: BackgroundRun | null = null
      const _productEvent: ProductEvent | null = null

      expect(_profile).toBeNull()
      expect(_project).toBeNull()
      expect(_conversation).toBeNull()
      expect(_message).toBeNull()
      expect(_fuelTransaction).toBeNull()
      expect(_auditEvent).toBeNull()
      expect(_projectCollaborator).toBeNull()
      expect(_projectPresence).toBeNull()
      expect(_backgroundRun).toBeNull()
      expect(_productEvent).toBeNull()
    })

    it('should export insert/update types', () => {
      const _newProject: NewProject | null = null
      const _updateProject: UpdateProject | null = null
      const _newMessage: NewMessage | null = null
      const _newBackgroundRun: NewBackgroundRun | null = null
      const _updateBackgroundRun: UpdateBackgroundRun | null = null

      expect(_newProject).toBeNull()
      expect(_updateProject).toBeNull()
      expect(_newMessage).toBeNull()
      expect(_newBackgroundRun).toBeNull()
      expect(_updateBackgroundRun).toBeNull()
    })

    it('should export Json type', () => {
      const _json: Json | null = null
      expect(_json).toBeNull()
    })
  })

  describe('Profile Type', () => {
    it('should have required fields', () => {
      const profile: Profile = {
        id: 'uuid',
        email: 'test@example.com',
        full_name: null,
        avatar_url: null,
        tier: 'free',
        fuel_balance: 1000,
        created_at: '2026-02-05',
        updated_at: '2026-02-05',
      }

      expect(profile.id).toBe('uuid')
      expect(profile.tier).toBe('free')
      expect(profile.fuel_balance).toBe(1000)
    })

    it('should support all tier values', () => {
      const tiers: Profile['tier'][] = ['free', 'pro', 'enterprise']
      expect(tiers).toHaveLength(3)
    })
  })

  describe('Project Type', () => {
    it('should have required fields', () => {
      const project: Project = {
        id: 'uuid',
        user_id: 'user-uuid',
        name: 'Test Project',
        description: null,
        project_type: 'web',
        files: [],
        settings: {},
        knowledge_snapshot: null,
        created_at: '2026-02-05',
        updated_at: '2026-02-05',
        last_opened_at: null,
      }

      expect(project.name).toBe('Test Project')
      expect(project.project_type).toBe('web')
    })

    it('should support web and mobile project types', () => {
      const types: Project['project_type'][] = ['web', 'mobile']
      expect(types).toHaveLength(2)
    })
  })

  describe('NewProject Type', () => {
    it('should require name and user_id', () => {
      const newProject: NewProject = {
        user_id: 'user-uuid',
        name: 'New Project',
      }

      expect(newProject.name).toBe('New Project')
      expect(newProject.user_id).toBe('user-uuid')
    })

    it('should allow optional fields', () => {
      const newProject: NewProject = {
        user_id: 'user-uuid',
        name: 'New Project',
        description: 'A test project',
        project_type: 'mobile',
        files: [{ name: 'test.ts', content: 'code' }],
        settings: { theme: 'dark' },
      }

      expect(newProject.description).toBe('A test project')
      expect(newProject.project_type).toBe('mobile')
    })
  })

  describe('Message Type', () => {
    it('should support all role types', () => {
      const roles: Message['role'][] = ['user', 'assistant', 'system']
      expect(roles).toHaveLength(3)
    })
  })

  describe('FuelTransaction Type', () => {
    it('should support all transaction types', () => {
      const types: FuelTransaction['type'][] = ['purchase', 'usage', 'refund', 'bonus']
      expect(types).toHaveLength(4)
    })
  })

  describe('BackgroundRun Type', () => {
    it('should include retry and orchestration metadata fields', () => {
      const run: BackgroundRun = {
        id: 'run-1',
        project_id: 'project-1',
        user_id: 'user-1',
        run_type: 'mobile-release',
        status: 'queued',
        input: {},
        metadata: {},
        output: null,
        idempotency_key: null,
        retryable: true,
        attempt_count: 0,
        max_attempts: 3,
        cancel_requested: false,
        last_heartbeat_at: null,
        next_retry_at: null,
        error_message: null,
        progress: 0,
        started_at: null,
        finished_at: null,
        created_at: '2026-02-08',
        updated_at: '2026-02-08',
      }

      expect(run.max_attempts).toBe(3)
      expect(run.retryable).toBe(true)
    })
  })
})
