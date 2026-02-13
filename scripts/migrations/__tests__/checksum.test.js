const fs = require('fs')
const path = require('path')
const os = require('os')
const { computeChecksum, deriveExpectedSchema } = require('../run-integration')
const { validate } = require('../validate-migrations')

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations')

describe('migration checksum and parsing utilities', () => {
  test('computeChecksum changes when file modified', () => {
    const sample = fs.readdirSync(MIGRATIONS_DIR).find(f => f.endsWith('.up.sql'))
    const src = path.join(MIGRATIONS_DIR, sample)
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migtest-'))
    const copy = path.join(tmpDir, sample)
    fs.copyFileSync(src, copy)

    const c1 = computeChecksum(copy)
    // modify copy
    fs.appendFileSync(copy, '\n-- comment to change checksum')
    const c2 = computeChecksum(copy)
    expect(c1).not.toBe(c2)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test('deriveExpectedSchema parses CREATE TABLE and INDEX', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migtest-'))
    const file = path.join(tmpDir, '001_test.up.sql')
    const sql = `CREATE TABLE test_table (\n  id serial PRIMARY KEY,\n  name text NOT NULL,\n  CONSTRAINT test_unique UNIQUE (name)\n);\n\nCREATE INDEX idx_test_name ON test_table(name);\n`
    fs.writeFileSync(file, sql)

    const parsed = deriveExpectedSchema([file])
    expect(parsed.tables.test_table).toBeTruthy()
    expect(parsed.tables.test_table.columns.id).toBeTruthy()
    expect(parsed.tables.test_table.columns.name.notnull).toBe(true)
    expect(parsed.indexes.find(i => i.name === 'idx_test_name')).toBeTruthy()

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test('validate-migrations passes', () => {
    // Should not throw for the repo migrations
    expect(() => validate()).not.toThrow()
  })
})
