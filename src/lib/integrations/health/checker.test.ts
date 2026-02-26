import { describe, expect, it } from 'vitest'
import { checkIntegrationHealth, formatHealthSummary } from './checker'

describe('integration health checker template completeness', () => {
  it('reports template coverage for checked integrations', async () => {
    const packageJsonContent = JSON.stringify({
      dependencies: {
        '@stripe/stripe-js': '3.0.7',
        resend: '3.2.0',
      },
    })

    const result = await checkIntegrationHealth(packageJsonContent, {
      trigger: 'manual',
      includeOrphans: false,
      checkDeprecations: false,
      silent: true,
    })

    expect(result.report.summary.templateCompleteness.checkedIntegrations).toBe(2)
    expect(result.report.summary.templateCompleteness.mappedIntegrations).toBe(2)
    expect(result.report.summary.templateCompleteness.partiallyMappedIntegrations).toBe(0)
    expect(result.report.summary.templateCompleteness.uncoveredIntegrations).toEqual([])
    expect(result.report.summary.templateCompleteness.coveragePercent).toBe(100)
    expect(result.report.summary.templateCompleteness.fileCoveragePercent).toBe(100)
  })

  it('renders template coverage in health summary', async () => {
    const packageJsonContent = JSON.stringify({
      dependencies: {
        '@stripe/stripe-js': '3.0.7',
        '@stripe/react-stripe-js': '2.5.1',
        stripe: '14.21.0',
        '@stripe/stripe-react-native': '0.35.0',
      },
    })

    const result = await checkIntegrationHealth(packageJsonContent, {
      trigger: 'manual',
      includeOrphans: false,
      checkDeprecations: false,
      silent: true,
    })

    expect(result.report.status).toBe('healthy')
    expect(formatHealthSummary(result.report)).toContain('Template coverage')
    expect(formatHealthSummary(result.report)).toContain('files')
  })
})
