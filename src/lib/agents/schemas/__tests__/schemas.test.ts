/**
 * Tests for individual agent schemas
 */

import { describe, it, expect } from 'vitest'
import { ArchitectOutputSchema } from '../architect'
import { FrontendOutputSchema } from '../frontend'
import { BackendOutputSchema } from '../backend'
import { DatabaseOutputSchema } from '../database'
import { DevopsOutputSchema } from '../devops'
import { QaOutputSchema } from '../qa'
import { PlannerOutputSchema } from '../planner'
import { StrategistOutputSchema } from '../strategist'
import { AuditorOutputSchema } from '../auditor'

// ============================================
// ARCHITECT SCHEMA UNIT TESTS
// ============================================

describe('ArchitectOutputSchema', () => {
  it('parses minimal valid output', () => {
    const data = {
      success: true,
      message: 'Design created',
    }
    const result = ArchitectOutputSchema.parse(data)
    expect(result.success).toBe(true)
  })

  it('parses with all optional fields', () => {
    const data = {
      success: true,
      message: 'Complete design',
      design: {
        overview: 'Architecture overview',
        components: [
          {
            name: 'Service',
            type: 'service',
            responsibility: 'Handle requests',
          },
        ],
      },
      decisions: [
        {
          title: 'Decision',
          context: 'Why',
          decision: 'What',
          consequences: ['Consequence 1'],
        },
      ],
    }
    const result = ArchitectOutputSchema.parse(data)
    expect(result.design?.overview).toBe('Architecture overview')
  })

  it('throws on invalid message type', () => {
    const data = { success: true, message: 123 }
    expect(() => ArchitectOutputSchema.parse(data)).toThrow()
  })

  it('throws on invalid component type enum', () => {
    const data = {
      success: true,
      message: 'test',
      design: {
        overview: 'test',
        components: [
          {
            name: 'C',
            type: 'invalid-service',
            responsibility: 'test',
          },
        ],
      },
    }
    expect(() => ArchitectOutputSchema.parse(data)).toThrow()
  })
})

// ============================================
// FRONTEND SCHEMA UNIT TESTS
// ============================================

describe('FrontendOutputSchema', () => {
  it('parses valid component metadata', () => {
    const data = {
      success: true,
      message: 'Component created',
      components: [
        {
          name: 'Button',
          type: 'component',
          props: {
            label: { type: 'string', required: true },
          },
        },
      ],
    }
    const result = FrontendOutputSchema.parse(data)
    expect(result.components?.[0].name).toBe('Button')
  })

  it('parses with styling framework', () => {
    const data = {
      success: true,
      message: 'Styled',
      styling: {
        framework: 'tailwind',
        colors: ['primary'],
      },
    }
    const result = FrontendOutputSchema.parse(data)
    expect(result.styling?.framework).toBe('tailwind')
  })

  it('throws on invalid framework', () => {
    const data = {
      success: true,
      message: 'test',
      styling: { framework: 'bootstrap5' },
    }
    expect(() => FrontendOutputSchema.parse(data)).toThrow()
  })

  it('parses test coverage', () => {
    const data = {
      success: true,
      message: 'test',
      testsCoverage: { total: 100, covered: 80 },
    }
    const result = FrontendOutputSchema.parse(data)
    expect(result.testsCoverage?.percentage).toBeUndefined()
  })
})

// ============================================
// BACKEND SCHEMA UNIT TESTS
// ============================================

describe('BackendOutputSchema', () => {
  it('parses valid endpoints', () => {
    const data = {
      success: true,
      message: 'API created',
      endpoints: [
        {
          path: '/api/users',
          method: 'POST',
        },
      ],
    }
    const result = BackendOutputSchema.parse(data)
    expect(result.endpoints?.[0].path).toBe('/api/users')
  })

  it('throws on invalid HTTP method', () => {
    const data = {
      success: true,
      message: 'test',
      endpoints: [{ path: '/test', method: 'STREAMING' }],
    }
    expect(() => BackendOutputSchema.parse(data)).toThrow()
  })

  it('parses middleware configuration', () => {
    const data = {
      success: true,
      message: 'test',
      middleware: [
        {
          name: 'auth',
          type: 'auth',
          order: 0,
        },
      ],
    }
    const result = BackendOutputSchema.parse(data)
    expect(result.middleware?.[0].type).toBe('auth')
  })

  it('parses database configuration', () => {
    const data = {
      success: true,
      message: 'test',
      database: {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
      },
    }
    const result = BackendOutputSchema.parse(data)
    expect(result.database?.port).toBe(5432)
  })

  it('throws on invalid database port', () => {
    const data = {
      success: true,
      message: 'test',
      database: { type: 'postgresql', port: 99999 },
    }
    expect(() => BackendOutputSchema.parse(data)).toThrow()
  })
})

// ============================================
// DATABASE SCHEMA UNIT TESTS
// ============================================

describe('DatabaseOutputSchema', () => {
  it('parses table definitions', () => {
    const data = {
      success: true,
      message: 'Schema created',
      schema: {
        tables: [
          {
            name: 'users',
            columns: [
              {
                name: 'id',
                type: 'uuid',
                primaryKey: true,
              },
            ],
          },
        ],
      },
    }
    const result = DatabaseOutputSchema.parse(data)
    expect(result.schema?.tables?.[0].columns[0].name).toBe('id')
  })

  it('throws on empty column list', () => {
    const data = {
      success: true,
      message: 'test',
      schema: { tables: [{ name: 'empty', columns: [] }] },
    }
    expect(() => DatabaseOutputSchema.parse(data)).toThrow()
  })

  it('parses migrations', () => {
    const data = {
      success: true,
      message: 'test',
      migrations: [
        {
          name: 'create_users',
          version: '001',
          timestamp: '2024-01-01T00:00:00Z',
          up: 'CREATE TABLE...',
          down: 'DROP TABLE...',
        },
      ],
    }
    const result = DatabaseOutputSchema.parse(data)
    expect(result.migrations?.[0].version).toBe('001')
  })

  it('parses foreign key constraints', () => {
    const data = {
      success: true,
      message: 'test',
      schema: {
        tables: [
          {
            name: 'orders',
            columns: [
              {
                name: 'user_id',
                type: 'uuid',
                references: {
                  table: 'users',
                  column: 'id',
                  onDelete: 'CASCADE',
                },
              },
            ],
          },
        ],
      },
    }
    const result = DatabaseOutputSchema.parse(data)
    expect(result.schema?.tables?.[0].columns[0].references?.onDelete).toBe('CASCADE')
  })
})

// ============================================
// DEVOPS SCHEMA UNIT TESTS
// ============================================

describe('DevopsOutputSchema', () => {
  it('parses infrastructure resources', () => {
    const data = {
      success: true,
      message: 'Infrastructure defined',
      infrastructure: [
        {
          type: 'compute',
          name: 'api-server',
          provider: 'aws',
        },
      ],
    }
    const result = DevopsOutputSchema.parse(data)
    expect(result.infrastructure?.[0].type).toBe('compute')
  })

  it('throws on invalid resource type', () => {
    const data = {
      success: true,
      message: 'test',
      infrastructure: [
        {
          type: 'router',
          name: 'test',
          provider: 'aws',
        },
      ],
    }
    expect(() => DevopsOutputSchema.parse(data)).toThrow()
  })

  it('parses pipeline stages', () => {
    const data = {
      success: true,
      message: 'test',
      pipeline: [
        {
          name: 'build',
          steps: [
            {
              name: 'compile',
              command: 'npm run build',
            },
          ],
        },
      ],
    }
    const result = DevopsOutputSchema.parse(data)
    expect(result.pipeline?.[0].name).toBe('build')
  })

  it('parses deployments', () => {
    const data = {
      success: true,
      message: 'test',
      deployments: [
        {
          environment: 'staging',
          status: 'success',
        },
      ],
    }
    const result = DevopsOutputSchema.parse(data)
    expect(result.deployments?.[0].status).toBe('success')
  })
})

// ============================================
// QA SCHEMA UNIT TESTS
// ============================================

describe('QaOutputSchema', () => {
  it('parses test suites', () => {
    const data = {
      success: true,
      message: 'Tests run',
      testSuites: [
        {
          name: 'Unit Tests',
          type: 'unit',
          tests: [
            {
              name: 'test_addition',
              status: 'passed',
              duration: 100,
            },
          ],
          duration: 500,
        },
      ],
    }
    const result = QaOutputSchema.parse(data)
    expect(result.testSuites?.[0].type).toBe('unit')
  })

  it('throws on invalid test type', () => {
    const data = {
      success: true,
      message: 'test',
      testSuites: [
        {
          name: 'Tests',
          type: 'smoke',
          tests: [],
          duration: 0,
        },
      ],
    }
    expect(() => QaOutputSchema.parse(data)).toThrow()
  })

  it('parses coverage metrics', () => {
    const data = {
      success: true,
      message: 'test',
      coverage: {
        percentage: 85,
        trend: 'improving',
      },
    }
    const result = QaOutputSchema.parse(data)
    expect(result.coverage?.percentage).toBe(85)
  })

  it('throws on invalid coverage percentage', () => {
    const data = {
      success: true,
      message: 'test',
      coverage: { percentage: 150 },
    }
    expect(() => QaOutputSchema.parse(data)).toThrow()
  })
})

// ============================================
// PLANNER SCHEMA UNIT TESTS
// ============================================

describe('PlannerOutputSchema', () => {
  it('parses plans with tasks', () => {
    const data = {
      success: true,
      message: 'Plan created',
      plan: [
        {
          id: 'task-1',
          title: 'Design',
          description: 'Create wireframes',
          priority: 'high',
        },
      ],
    }
    const result = PlannerOutputSchema.parse(data)
    expect(result.plan?.[0].title).toBe('Design')
  })

  it('parses task hierarchy', () => {
    const data = {
      success: true,
      message: 'test',
      hierarchy: [
        {
          epic: 'Epic 1',
          story: 'Story 1',
          tasks: [
            {
              id: 't1',
              title: 'Task 1',
              description: 'Do something',
            },
          ],
        },
      ],
    }
    const result = PlannerOutputSchema.parse(data)
    expect(result.hierarchy?.[0].epic).toBe('Epic 1')
  })

  it('throws on invalid priority', () => {
    const data = {
      success: true,
      message: 'test',
      plan: [
        {
          id: 'task-1',
          title: 'Task',
          description: 'Desc',
          priority: 'urgent',
        },
      ],
    }
    expect(() => PlannerOutputSchema.parse(data)).toThrow()
  })
})

// ============================================
// STRATEGIST SCHEMA UNIT TESTS
// ============================================

describe('StrategistOutputSchema', () => {
  it('parses governance verdict', () => {
    const data = {
      success: true,
      message: 'Reviewed',
      verdict: 'approved',
    }
    const result = StrategistOutputSchema.parse(data)
    expect(result.verdict).toBe('approved')
  })

  it('throws on invalid verdict', () => {
    const data = {
      success: true,
      message: 'test',
      verdict: 'pending',
    }
    expect(() => StrategistOutputSchema.parse(data)).toThrow()
  })

  it('parses protected invariants', () => {
    const data = {
      success: true,
      message: 'test',
      protected_invariants: [
        {
          description: 'Blue theme',
          scope: ['sidebar'],
          severity: 'hard',
        },
      ],
    }
    const result = StrategistOutputSchema.parse(data)
    expect(result.protected_invariants?.[0].severity).toBe('hard')
  })

  it('parses amendments', () => {
    const data = {
      success: true,
      message: 'test',
      verdict: 'approved_with_amendments',
      amendments: ['Fix security', 'Add tests'],
    }
    const result = StrategistOutputSchema.parse(data)
    expect(result.amendments).toHaveLength(2)
  })
})

// ============================================
// AUDITOR SCHEMA UNIT TESTS
// ============================================

describe('AuditorOutputSchema', () => {
  it('parses audit verdict', () => {
    const data = {
      success: true,
      message: 'Audited',
      verdict: 'passed',
    }
    const result = AuditorOutputSchema.parse(data)
    expect(result.verdict).toBe('passed')
  })

  it('parses audit gates', () => {
    const data = {
      success: true,
      message: 'test',
      gates: {
        visual: { passed: true, issues: [] },
        security: {
          passed: false,
          issues: [
            {
              id: 'sec-1',
              severity: 'critical',
              category: 'auth',
              message: 'Missing auth',
            },
          ],
        },
      },
    }
    const result = AuditorOutputSchema.parse(data)
    expect(result.gates?.security?.passed).toBe(false)
  })

  it('throws on invalid verdict', () => {
    const data = {
      success: true,
      message: 'test',
      verdict: 'unknown',
    }
    expect(() => AuditorOutputSchema.parse(data)).toThrow()
  })

  it('parses blockers', () => {
    const data = {
      success: true,
      message: 'test',
      blockers: [
        {
          category: 'security',
          description: 'SQL injection risk',
          fix: 'Use parameterized queries',
        },
      ],
    }
    const result = AuditorOutputSchema.parse(data)
    expect(result.blockers?.[0].category).toBe('security')
  })
})

// ============================================
// SAFEPARSING TESTS
// ============================================

describe('Safe Parsing with ZodSchema safeParse', () => {
  it('safeParse returns success false on invalid input', () => {
    const result = ArchitectOutputSchema.safeParse({ success: 'invalid' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })

  it('safeParse returns data on valid input', () => {
    const input = { success: true, message: 'OK' }
    const result = ArchitectOutputSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.success).toBe(true)
    }
  })
})
