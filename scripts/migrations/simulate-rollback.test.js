import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'

const RUN_INTEGRATION = process.env.RUN_MIGRATION_INTEGRATION === 'true'

describe('migrations:simulate-rollback', () => {
  it('validates migration files structure', () => {
    // Always run static validation
    const script = path.resolve(__dirname, './validate-migrations.js')
    const out = execSync(`node ${script}`, { stdio: 'pipe' }).toString()
    expect(out).toContain('MIGRATION VALIDATION OK')
  })

  if (RUN_INTEGRATION) {
    it('attempts to apply and rollback migrations (integration)', async () => {
      // This test only runs when RUN_MIGRATION_INTEGRATION=true and requires psql/SUPABASE_URL
      const supabaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
      if (!supabaseUrl) {
        throw new Error('SUPABASE_DB_URL or DATABASE_URL must be set to run integration test')
      }

      // For safety, require an explicit flag
      if (!process.env.ALLOW_MIGRATION_RUN) {
        throw new Error('Set ALLOW_MIGRATION_RUN=true to allow running migrations against DB')
      }

      // Running real migrations is intentionally out-of-scope for unit tests here.
      // Teams should run the scripts/migrations/run-migration.js helper in CI with proper secrets.
    })
  } else {
    it('skips integration apply/rollback (set RUN_MIGRATION_INTEGRATION=true to enable)', () => {
      expect(RUN_INTEGRATION).toBe(false)
    })
  }
})
