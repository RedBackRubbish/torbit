#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { computeChecksum } = require('./run-integration')

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations')

function listMigrations() {
  return fs.readdirSync(MIGRATIONS_DIR).filter(f => /^\d{3}_.+\.(up|down)\.sql$/.test(f)).sort()
}

function printChecksums() {
  const files = listMigrations()
  const out = files.map(f => ({ file: f, checksum: computeChecksum(path.join(MIGRATIONS_DIR, f)) }))
  console.log(JSON.stringify(out, null, 2))
}

if (require.main === module) {
  printChecksums()
}

module.exports = { printChecksums }
