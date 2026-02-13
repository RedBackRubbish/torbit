import { describe, it } from 'vitest'
import { runIntegration } from './run-integration'

const ENABLE = process.env.RUN_MIGRATION_INTEGRATION === 'true' && process.env.ALLOW_MIGRATION_RUN === 'true'

describe('migrations:integration', () => {
  if (!ENABLE) {
    it.skip('integration disabled (set RUN_MIGRATION_INTEGRATION and ALLOW_MIGRATION_RUN)', () => {})
    return
  }

  it('applies and rolls back migrations against ephemeral DB', async () => {
    await runIntegration()
  })
})
