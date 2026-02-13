#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const SNAPSHOT_DIR = path.resolve(__dirname, './snapshots')

function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
}

function isProductionLike(databaseUrl) {
  try {
    const u = new URL(databaseUrl)
    const host = (u.hostname || '').toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false
    if (host.includes('prod') || host.includes('production')) return true
    if (host.includes('amazonaws.com') || host.includes('supabase.co')) return true
    return true // default to conservative: treat unknown hosts as production-like
  } catch (err) {
    return true
  }
}

function snapshotFilename(databaseUrl) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const u = new URL(databaseUrl)
  const host = u.hostname.replace(/[:\/]/g, '_')
  return path.join(SNAPSHOT_DIR, `snapshot_${host}_${ts}.sql`)
}

function createSnapshot(databaseUrl, options = {}) {
  const allow = process.env.ALLOW_MIGRATION_RUN === 'true'
  const enabled = process.env.ENABLE_PROD_SNAPSHOT === 'true'
  const isCI = process.env.CI === 'true'

  if (!allow || !enabled) {
    throw new Error('Snapshots are disabled: require ALLOW_MIGRATION_RUN=true and ENABLE_PROD_SNAPSHOT=true')
  }
  if (isCI) {
    // In CI ephemeral runs we skip snapshot to avoid slowdowns
    return null
  }

  if (isProductionLike(databaseUrl) && process.env.CONFIRM_PROD !== 'true') {
    throw new Error('Refusing to snapshot a production-like database without CONFIRM_PROD=true')
  }

  ensureSnapshotDir()
  const out = snapshotFilename(databaseUrl)
  if (fs.existsSync(out)) {
    // ensure we don't overwrite; append a suffix
    const alt = out.replace(/\.sql$/, `_${Date.now()}.sql`)
    return createSnapshotWithFile(databaseUrl, alt)
  }
  return createSnapshotWithFile(databaseUrl, out)
}

function createSnapshotWithFile(databaseUrl, outPath) {
  // Use pg_dump plain SQL
  const cmd = `pg_dump --dbname='${databaseUrl}' --no-owner --no-privileges --format=plain -f '${outPath}'`
  try {
    execSync(cmd, { stdio: 'inherit' })
    return outPath
  } catch (err) {
    throw new Error(`pg_dump failed: ${err.message}`)
  }
}

function restoreSnapshot(databaseUrl, snapshotFile) {
  if (!snapshotFile) throw new Error('No snapshot file provided')
  // Use psql to restore plain SQL
  const cmd = `psql '${databaseUrl}' -f '${snapshotFile}'`
  try {
    execSync(cmd, { stdio: 'inherit' })
    return true
  } catch (err) {
    throw new Error(`Restore failed: ${err.message}`)
  }
}

module.exports = { createSnapshot, restoreSnapshot, isProductionLike, snapshotFilename }
