import { describe, expect, it } from 'vitest'
import {
  getProductionTemplatePaths,
  hasProductionTemplatePath,
  PRODUCTION_TEMPLATE_PATHS,
} from './template-paths'

describe('integration template paths', () => {
  it('indexes known template paths from production templates', () => {
    expect(Object.keys(PRODUCTION_TEMPLATE_PATHS).length).toBeGreaterThan(0)
    expect(getProductionTemplatePaths('stripe')).toContain('src/lib/stripe/client.ts')
  })

  it('checks path membership per integration id', () => {
    expect(hasProductionTemplatePath('supabase', 'src/lib/supabase/client.ts')).toBe(true)
    expect(hasProductionTemplatePath('supabase', 'src/lib/supabase/unknown.ts')).toBe(false)
    expect(hasProductionTemplatePath('unknown-integration', 'src/lib/anything.ts')).toBe(false)
  })
})
