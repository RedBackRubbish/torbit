import { describe, expect, it } from 'vitest'
import { resolveScopedProjectId, sanitizeProjectSegment } from './project-id'

describe('project id scoping', () => {
  it('keeps historical default when incoming project id is missing', () => {
    expect(resolveScopedProjectId('user-123')).toBe('user-user-123')
    expect(resolveScopedProjectId('abc', '   ')).toBe('user-abc')
  })

  it('namespaces explicit project ids by authenticated user', () => {
    const alice = resolveScopedProjectId('alice-id', 'shared-project')
    const bob = resolveScopedProjectId('bob-id', 'shared-project')

    expect(alice).not.toBe(bob)
    expect(alice).toBe('user-alice-id::shared-project')
    expect(bob).toBe('user-bob-id::shared-project')
  })

  it('sanitizes unsafe characters in incoming project ids', () => {
    expect(sanitizeProjectSegment('../etc/passwd')).toBe('.._etc_passwd')
    expect(resolveScopedProjectId('u1', '../etc/passwd')).toBe('user-u1::.._etc_passwd')
  })
})
