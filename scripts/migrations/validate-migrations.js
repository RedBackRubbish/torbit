#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations')

function listMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'))
}

function parseVersion(filename) {
  const match = filename.match(/^(\d{3})_([\w-]+)\.(up|down)\.sql$/)
  if (!match) return null
  return { version: Number(match[1]), name: match[2], direction: match[3], filename }
}

function validate() {
  const files = listMigrationFiles()
  const parsed = files.map(f => ({ f, p: parseVersion(f) })).filter(x => x.p)

  const groups = {}
  parsed.forEach(({ f, p }) => {
    const key = `${String(p.version).padStart(3,'0')}_${p.name}`
    groups[key] = groups[key] || { up: null, down: null, version: p.version }
    if (p.direction === 'up') groups[key].up = f
    if (p.direction === 'down') groups[key].down = f
  })

  const errors = []
  const versions = Object.keys(groups).map(k => groups[k])
  versions.sort((a,b) => a.version - b.version)

  versions.forEach(g => {
    if (!g.up) errors.push(`Missing .up.sql for migration ${g.version}`)
    if (!g.down) errors.push(`Missing .down.sql for migration ${g.version}`)
  })

  // Ensure version ordering is contiguous starting from 1
  const numbers = versions.map(v => v.version)
  for (let i = 0; i < numbers.length; i++) {
    const expected = i + 1
    if (numbers[i] !== expected) {
      errors.push(`Non-contiguous migration versions. Expected ${String(expected).padStart(3,'0')} but found ${String(numbers[i]).padStart(3,'0')}`)
      break
    }
  }

  // Basic content checks
  versions.forEach(g => {
    const upPath = path.join(MIGRATIONS_DIR, g.up)
    const downPath = path.join(MIGRATIONS_DIR, g.down)
    const upContent = fs.readFileSync(upPath, 'utf8')
    const downContent = fs.readFileSync(downPath, 'utf8')

    if (!/CREATE\s+TABLE/i.test(upContent) && !/ALTER\s+TABLE/i.test(upContent)) {
      errors.push(`${g.up} missing CREATE/ALTER statements`)
    }
    if (!/DROP\s+TABLE/i.test(downContent) && !/ALTER\s+TABLE/i.test(downContent)) {
      errors.push(`${g.down} missing DROP/ALTER statements`)
    }
  })

  if (errors.length > 0) {
    console.error('MIGRATION VALIDATION FAILED:')
    errors.forEach(e => console.error('- ' + e))
    process.exit(2)
  }

  console.log('MIGRATION VALIDATION OK')
}

if (require.main === module) validate()

module.exports = { validate }
