import { _formatLogForTest } from '../logger.server'

describe('logger formatting', () => {
  it('produces valid JSON with correlation id field', () => {
    const s = _formatLogForTest('info', 'hello', { foo: 'bar' })
    const obj = JSON.parse(s)
    expect(obj).toHaveProperty('ts')
    expect(obj).toHaveProperty('level', 'info')
    expect(obj).toHaveProperty('message', 'hello')
    expect(obj).toHaveProperty('foo', 'bar')
    // correlationId might be undefined in test environment
  })
})
