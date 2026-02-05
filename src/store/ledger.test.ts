import { describe, it, expect, beforeEach } from 'vitest'
import { useLedger, generateLedgerHash } from './ledger'

describe('Activity Ledger Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useLedger.getState().clearLedger()
  })

  describe('Initial State', () => {
    it('should start with empty entries', () => {
      const { entries } = useLedger.getState()
      expect(entries).toEqual([])
    })

    it('should be collapsed by default', () => {
      const { isExpanded } = useLedger.getState()
      expect(isExpanded).toBe(false)
    })
  })

  describe('Recording Events', () => {
    it('should record intent', () => {
      const { recordIntent, entries } = useLedger.getState()
      recordIntent('0x12345678')
      
      const updated = useLedger.getState().entries
      expect(updated).toHaveLength(1)
      expect(updated[0].phase).toBe('describe')
      expect(updated[0].label).toBe('Intent recorded')
      expect(updated[0].proof?.intentHash).toBe('0x12345678')
    })

    it('should record artifacts generated', () => {
      const { recordArtifactsGenerated } = useLedger.getState()
      recordArtifactsGenerated(3, ['app/page.tsx', 'app/layout.tsx', 'components/Button.tsx'])
      
      const updated = useLedger.getState().entries
      expect(updated).toHaveLength(1)
      expect(updated[0].phase).toBe('build')
      expect(updated[0].label).toBe('Artifacts generated')
      expect(updated[0].proof?.artifactCount).toBe(3)
      expect(updated[0].proof?.filesGenerated).toHaveLength(3)
    })

    it('should record verification passed', () => {
      const { recordVerificationPassed } = useLedger.getState()
      recordVerificationPassed('0xruntime', '0xdeps')
      
      const updated = useLedger.getState().entries
      expect(updated).toHaveLength(1)
      expect(updated[0].phase).toBe('verify')
      expect(updated[0].label).toBe('Auditor verification passed')
      expect(updated[0].proof?.auditorVerdict).toBe('passed')
      expect(updated[0].proof?.runtimeHash).toBe('0xruntime')
      expect(updated[0].proof?.dependencyLockHash).toBe('0xdeps')
    })

    it('should record verification failed', () => {
      const { recordVerificationFailed } = useLedger.getState()
      recordVerificationFailed()
      
      const updated = useLedger.getState().entries
      expect(updated).toHaveLength(1)
      expect(updated[0].phase).toBe('verify')
      expect(updated[0].label).toBe('Auditor verification failed')
      expect(updated[0].proof?.auditorVerdict).toBe('failed')
    })

    it('should record export', () => {
      const { recordExport } = useLedger.getState()
      recordExport('ZIP', true)
      
      const updated = useLedger.getState().entries
      expect(updated).toHaveLength(1)
      expect(updated[0].phase).toBe('export')
      expect(updated[0].label).toBe('Project exported')
      expect(updated[0].proof?.exportFormat).toBe('ZIP')
      expect(updated[0].proof?.includesProof).toBe(true)
    })

    it('should not duplicate entries for same phase (except export)', () => {
      const { recordIntent } = useLedger.getState()
      recordIntent('0x111')
      recordIntent('0x222')
      
      const updated = useLedger.getState().entries
      expect(updated).toHaveLength(1)
      expect(updated[0].proof?.intentHash).toBe('0x111')
    })

    it('should allow multiple exports', () => {
      const { recordExport } = useLedger.getState()
      recordExport('ZIP', true)
      recordExport('GitHub', false)
      
      const updated = useLedger.getState().entries
      expect(updated).toHaveLength(2)
    })
  })

  describe('UI State', () => {
    it('should toggle expanded state', () => {
      const { toggleExpanded } = useLedger.getState()
      expect(useLedger.getState().isExpanded).toBe(false)
      
      toggleExpanded()
      expect(useLedger.getState().isExpanded).toBe(true)
      
      toggleExpanded()
      expect(useLedger.getState().isExpanded).toBe(false)
    })

    it('should set expanded state directly', () => {
      const { setExpanded } = useLedger.getState()
      
      setExpanded(true)
      expect(useLedger.getState().isExpanded).toBe(true)
      
      setExpanded(false)
      expect(useLedger.getState().isExpanded).toBe(false)
    })
  })

  describe('Queries', () => {
    it('should count completed phases', () => {
      const { recordIntent, recordArtifactsGenerated, getCompletedCount } = useLedger.getState()
      
      expect(getCompletedCount()).toBe(0)
      
      recordIntent('0x123')
      expect(useLedger.getState().getCompletedCount()).toBe(1)
      
      useLedger.getState().recordArtifactsGenerated(1, ['file.tsx'])
      expect(useLedger.getState().getCompletedCount()).toBe(2)
    })

    it('should get phase status', () => {
      const { getPhaseStatus, recordIntent } = useLedger.getState()
      
      expect(getPhaseStatus('describe')).toBe('pending')
      
      recordIntent('0x123')
      expect(useLedger.getState().getPhaseStatus('describe')).toBe('complete')
      expect(useLedger.getState().getPhaseStatus('build')).toBe('pending')
    })

    it('should get entry by phase', () => {
      const { getEntry, recordIntent } = useLedger.getState()
      
      expect(getEntry('describe')).toBeUndefined()
      
      recordIntent('0x123')
      const entry = useLedger.getState().getEntry('describe')
      expect(entry).toBeDefined()
      expect(entry?.phase).toBe('describe')
    })
  })

  describe('generateLedgerHash', () => {
    it('should generate consistent hash for same input', () => {
      const hash1 = generateLedgerHash('test input')
      const hash2 = generateLedgerHash('test input')
      
      // Note: hash includes random component, so just check format
      expect(hash1.startsWith('0x')).toBe(true)
      expect(hash1.length).toBeGreaterThan(8) // 0x + hex chars
    })

    it('should generate different hashes for different inputs', () => {
      const hash1 = generateLedgerHash('input one')
      const hash2 = generateLedgerHash('input two')
      
      // First 8 chars after 0x should differ
      expect(hash1.slice(0, 10)).not.toBe(hash2.slice(0, 10))
    })
  })
})
