#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
// 'pg' is required only when running integration against an ephemeral DB

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations')
const crypto = require('crypto')
const snapshot = require('./snapshot')

function listMigrations() {
  return fs.readdirSync(MIGRATIONS_DIR).filter(f => /^\d{3}_.+\.(up|down)\.sql$/.test(f))
}

function parseMigrationName(file) {
  const m = file.match(/^(\d{3})_([\w-]+)\.(up|down)\.sql$/)
  if (!m) return null
  return { version: Number(m[1]), name: m[2], dir: m[3], file }
}

async function applySql(client, sql, filename) {
  console.log(`--- Applying: ${filename}`)
  try {
    await client.query(sql)
    console.log(`+++ Applied: ${filename}`)
  } catch (err) {
    console.error(`!!! Error applying ${filename}:`, err.message)
    throw err
  }
}

function computeChecksum(filePath) {
  const content = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(content).digest('hex')
}

async function ensureMigrationHistory(client) {
  // create append-only _migration_history table and trigger that prevents UPDATE/DELETE
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migration_history (
      id serial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      checksum text NOT NULL,
      applied_at timestamptz DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION _migration_history_block_updates() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'migration history is append-only';
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '_migration_history_no_update') THEN
        CREATE TRIGGER _migration_history_no_update
        BEFORE UPDATE OR DELETE ON _migration_history
        FOR EACH ROW EXECUTE PROCEDURE _migration_history_block_updates();
      END IF;
    END$$;
  `)
}

async function getAppliedMigrationChecksum(client, filename) {
  const res = await client.query('SELECT checksum FROM _migration_history WHERE filename=$1', [filename])
  if (res.rowCount === 0) return null
  return res.rows[0].checksum
}

async function recordAppliedMigration(client, filename, checksum) {
  await client.query('INSERT INTO _migration_history(filename, checksum) VALUES($1,$2)', [filename, checksum])
}

function deriveExpectedSchema(upFilePaths) {
  const tables = {}
  const indexes = []

  for (const p of upFilePaths) {
    const content = fs.readFileSync(p, 'utf8')
    // find CREATE TABLE ... (...) blocks
    const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([\w_]+)\s*\(([^;]+?)\)\s*;/gis
    let m
    while ((m = re.exec(content))) {
      const table = m[1]
      const body = m[2]
      const cols = parseColumnDefinitions(body)
      tables[table] = tables[table] || { columns: {}, constraints: { pk: [], uniques: [], fks: [] } }
      Object.assign(tables[table].columns, cols.columns)
      tables[table].constraints.pk = tables[table].constraints.pk.concat(cols.pk || [])
      tables[table].constraints.uniques = tables[table].constraints.uniques.concat(cols.uniques || [])
      tables[table].constraints.fks = tables[table].constraints.fks.concat(cols.fks || [])
    }

    // find CREATE INDEX statements
    const idxRe = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+([\w_]+)\s+ON\s+(?:public\.)?([\w_]+)\s*\(([^)]+)\)\s*;/gis
    let mi
    while ((mi = idxRe.exec(content))) {
      indexes.push({ name: mi[1], table: mi[2], cols: mi[3].split(',').map(s => s.trim()) })
    }
  }

  return { tables, indexes }
}

function parseColumnDefinitions(body) {
  // Split on commas at top level (not inside parens)
  const parts = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) parts.push(cur.trim())

  const columns = {}
  const pk = []
  const uniques = []
  const fks = []

  for (const p of parts) {
    const pp = p.replace(/\s+/g, ' ').trim()
    // constraint lines
    const constraintMatch = pp.match(/^CONSTRAINT\s+([\w_]+)\s+(PRIMARY KEY|UNIQUE|FOREIGN KEY)\s*\(([^)]+)\)\s*(REFERENCES\s+([\w_]+)\s*\(([^)]+)\))?/i)
    if (constraintMatch) {
      const name = constraintMatch[1]
      const kind = constraintMatch[2].toUpperCase()
      const cols = constraintMatch[3].split(',').map(s => s.trim())
      if (kind.includes('PRIMARY')) pk.push({ name, cols })
      if (kind.includes('UNIQUE')) uniques.push({ name, cols })
      if (kind.includes('FOREIGN')) {
        const refTable = constraintMatch[5]
        const refCols = (constraintMatch[6] || '').split(',').map(s => s.trim())
        fks.push({ name, cols, refTable, refCols })
      }
      continue
    }

    // column definition
    const colMatch = pp.match(/^([\w_]+)\s+([^,]+)$/i)
    if (colMatch) {
      const name = colMatch[1]
      const rest = colMatch[2]
      // type is first token (may include parens)
      const typeMatch = rest.match(/^([A-Za-z0-9_]+(?:\([^\)]+\))?)/)
      const type = typeMatch ? typeMatch[1] : rest.split(' ')[0]
      const notnull = /NOT\s+NULL/i.test(rest)
      columns[name] = { type: type.toLowerCase(), notnull }
      if (/PRIMARY\s+KEY/i.test(rest)) pk.push({ name: `${name}_pk_inline`, cols: [name] })
      if (/UNIQUE/i.test(rest)) uniques.push({ name: `${name}_unique_inline`, cols: [name] })
      continue
    }
  }

  return { columns, pk, uniques, fks }
}

function matchType(expected, actual) {
  // Normalize simple types: ignore length/precision differences for now except base type
  const e = expected.split('(')[0].toLowerCase()
  const a = actual.split('(')[0].toLowerCase()
  return e === a || a.includes(e) || e.includes(a)
}

function throwDiff(title, expected, actual) {
  const msg = `MISMATCH: ${title}\n  Expected: ${expected}\n  Actual:   ${actual}`
  console.error(msg)
  throw new Error(msg)
}

function compareArraysDiff(name, expected, actual) {
  const expSet = new Set(expected)
  const actSet = new Set(actual)
  const missing = expected.filter(x => !actSet.has(x))
  const unexpected = actual.filter(x => !expSet.has(x))
  if (missing.length || unexpected.length) {
    const parts = []
    if (missing.length) parts.push(`Missing ${name}: ${missing.join(', ')}`)
    if (unexpected.length) parts.push(`Unexpected ${name}: ${unexpected.join(', ')}`)
    const msg = `Schema mismatch for ${name}:\n  ${parts.join('\n  ')}`
    console.error(msg)
    throw new Error(msg)
  }
}

async function verifyConstraintsAndIndexes(client, tableName, tableSpec) {
  // Primary keys and unique constraints
  const pkRes = await client.query(
    `SELECT c.conname, pg_get_constraintdef(c.oid) as def
     FROM pg_constraint c
     JOIN pg_class t ON c.conrelid = t.oid
     WHERE t.relname = $1 AND c.contype = 'p'`,
    [tableName]
  )
  const pkNames = pkRes.rows.map(r => r.conname)
  if (tableSpec.constraints.pk && tableSpec.constraints.pk.length) {
    const expectedPkNames = tableSpec.constraints.pk.map(p => p.name).filter(Boolean)
    compareArraysDiff(`${tableName} primary keys`, expectedPkNames.sort(), pkNames.sort())
  }

  // Unique constraints
  const uqRes = await client.query(
    `SELECT c.conname FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname=$1 AND c.contype='u'`,
    [tableName]
  )
  const uqNames = uqRes.rows.map(r => r.conname)
  const expectedUq = (tableSpec.constraints.uniques || []).map(u => u.name).filter(Boolean)
  if (expectedUq.length) compareArraysDiff(`${tableName} unique constraints`, expectedUq.sort(), uqNames.sort())

  // Foreign keys
  const fkRes = await client.query(
    `SELECT c.conname, pg_get_constraintdef(c.oid) as def FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname=$1 AND c.contype='f'`,
    [tableName]
  )
  const fkNames = fkRes.rows.map(r => r.conname)
  const expectedFks = (tableSpec.constraints.fks || []).map(f => f.name).filter(Boolean)
  if (expectedFks.length) compareArraysDiff(`${tableName} foreign keys`, expectedFks.sort(), fkNames.sort())

  // Indexes
  const idxRes = await client.query(`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename=$1`, [tableName])
  const idxNames = idxRes.rows.map(r => r.indexname)
  // tableSpec doesn't include parsed index names by default; skip strict check unless expected provided
  if (tableSpec.indexes && tableSpec.indexes.length) {
    compareArraysDiff(`${tableName} indexes`, tableSpec.indexes.sort(), idxNames.sort())
  }
}

async function runIntegration() {
  const databaseUrl = process.env.DATABASE_URL
  const allowRun = process.env.RUN_MIGRATION_INTEGRATION === 'true' && process.env.ALLOW_MIGRATION_RUN === 'true'
  if (!allowRun) {
    console.log('RUN_MIGRATION_INTEGRATION or ALLOW_MIGRATION_RUN not set — skipping integration run')
    return
  }

  if (!databaseUrl) throw new Error('DATABASE_URL must be set')

    // lazy-require pg to avoid failing module load in environments without pg installed
    let Client
    try {
      ({ Client } = require('pg'))
    } catch (err) {
      console.error("The 'pg' module is required to run migrations against a DB. Install it or run in CI where it's available.")
      throw err
    }

    const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    const files = listMigrations().map(f => parseMigrationName(f)).filter(Boolean)
    const ups = files.filter(f => f.dir === 'up').sort((a,b) => a.version - b.version)
    const downs = files.filter(f => f.dir === 'down').sort((a,b) => a.version - b.version)

    // Ensure migration history table exists and is append-only
    await ensureMigrationHistory(client)

    // Derive expected schema from .up.sql files (used for drift detection)
    const expected = deriveExpectedSchema(ups.map(u => path.join(MIGRATIONS_DIR, u.file)))

    // Pre-run check: ensure there are no unexpected existing user tables (except our migration history)
    const beforeTablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
    const beforeTables = beforeTablesRes.rows.map(r => r.table_name).filter(t => t !== '_migration_history')
    if (beforeTables.length) {
      console.error('Unexpected existing tables before running migrations:', beforeTables)
      throw new Error('Database not clean before running integration migrations — aborting to prevent drift')
    }

    // Optionally create a pre-migration snapshot (prod safety layer)
    let snapshotFile = null
    try {
      const enableSnapshot = process.env.ENABLE_PROD_SNAPSHOT === 'true' && process.env.ALLOW_MIGRATION_RUN === 'true'
      const isCI = process.env.CI === 'true'
      if (enableSnapshot && !isCI) {
        // snapshot.createSnapshot will enforce CONFIRM_PROD for production-like DBs
        snapshotFile = snapshot.createSnapshot(databaseUrl)
        if (snapshotFile) console.log('Pre-migration snapshot saved to', snapshotFile)
      }
    } catch (err) {
      console.error('Failed to create pre-migration snapshot:', err.message)
      throw err
    }

    // Apply ups in order with checksum enforcement
    for (const m of ups) {
      const filePath = path.join(MIGRATIONS_DIR, m.file)
      const checksum = computeChecksum(filePath)
      const appliedChecksum = await getAppliedMigrationChecksum(client, m.file)
      if (appliedChecksum) {
        if (appliedChecksum !== checksum) {
          console.error(`Checksum mismatch for applied migration ${m.file}: history=${appliedChecksum} current=${checksum}`)
          throw new Error(`Migration checksum mismatch for ${m.file} — historical migration has been modified. Aborting.`)
        }
        console.log(`Skipping already-applied migration ${m.file} (checksum OK)`)
        continue
      }

      const sql = fs.readFileSync(filePath, 'utf8')
      try {
        await applySql(client, sql, m.file)
        // record applied migration (append-only)
          if (snapshotFile) {
            try {
              console.log('Attempting to restore pre-migration snapshot from', snapshotFile)
              snapshot.restoreSnapshot(databaseUrl, snapshotFile)
              console.log('Restore succeeded')
            } catch (restoreErr) {
              console.error('Automatic restore failed:', restoreErr.message)
              // prefer to surface original error but ensure non-zero exit later
            }
          }
            console.error('Automatic restore failed:', restoreErr.message)
            // prefer to surface original error but ensure non-zero exit later
          }

      // exportable helper: execute given async function with snapshot protection
  }

  async function executeWithSnapshot(databaseUrl, fn) {
    let snapshotFile = null
    try {
      const enableSnapshot = process.env.ENABLE_PROD_SNAPSHOT === 'true' && process.env.ALLOW_MIGRATION_RUN === 'true'
      const isCI = process.env.CI === 'true'
      if (enableSnapshot && !isCI) {
        snapshotFile = snapshot.createSnapshot(databaseUrl)
        if (snapshotFile) console.log('Pre-migration snapshot saved to', snapshotFile)
      }
      return await fn()
    } catch (err) {
      if (snapshotFile) {
        try {
          console.log('Attempting automatic restore from', snapshotFile)
          snapshot.restoreSnapshot(databaseUrl, snapshotFile)
          console.log('Automatic restore succeeded')
        } catch (restoreErr) {
          console.error('Automatic restore failed:', restoreErr.message)
        }
      }
      throw err
    }
        }
        throw err
      }
    }

    // Query actual schema
    const actualTablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
    const actualTables = actualTablesRes.rows.map(r => r.table_name)
    console.log('Tables after up:', actualTables)

    // Compare expected tables
    compareArraysDiff('tables', Object.keys(expected.tables).sort(), actualTables.sort())

    // For each expected table, verify columns, types, nullability
    for (const [tableName, tableSpec] of Object.entries(expected.tables)) {
      console.log(`Verifying table: ${tableName}`)
      const colsRes = await client.query(
        `SELECT column_name, data_type, is_nullable, column_default, udt_name, character_maximum_length, numeric_precision
         FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
        [tableName]
      )
      const actualCols = {}
      for (const r of colsRes.rows) {
        actualCols[r.column_name] = r
      }

      // Fail on unexpected or missing columns
      const expectedColNames = Object.keys(tableSpec.columns)
      const actualColNames = Object.keys(actualCols)
      compareArraysDiff(`${tableName} columns`, expectedColNames.sort(), actualColNames.sort())

      // Check column details
      for (const colName of expectedColNames) {
        const expectedCol = tableSpec.columns[colName]
        const actualCol = actualCols[colName]
        if (!actualCol) continue // already reported

        // Compare basic type names (udt_name or data_type)
        const actualType = actualCol.udt_name || actualCol.data_type
        if (!matchType(expectedCol.type, actualType)) {
          throwDiff(`Type mismatch for ${tableName}.${colName}`, expectedCol.type, actualType)
        }

        // NOT NULL check
        const actualNotNull = actualCol.is_nullable === 'NO'
        if ((expectedCol.notnull || false) !== actualNotNull) {
          throwDiff(`NULL constraint mismatch for ${tableName}.${colName}`, expectedCol.notnull ? 'NOT NULL' : 'NULLABLE', actualNotNull ? 'NOT NULL' : 'NULLABLE')
        }
      }

      // Verify primary keys, unique constraints, foreign keys, indexes
      await verifyConstraintsAndIndexes(client, tableName, tableSpec)
    }

    // Run downs in reverse order of version
    const downsByVersion = downs.sort((a,b) => b.version - a.version)
    for (const m of downsByVersion) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, m.file), 'utf8')
      await applySql(client, sql, m.file)
    }

    // Verify no user tables remain
    const afterDrop = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
    console.log('Tables after down:', afterDrop.rows.map(r => r.table_name))
    if (afterDrop.rows.length !== 0) {
      throw new Error('Expected zero tables after running down migrations')
    }

    // Reapply ups to confirm idempotency
    for (const m of ups) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, m.file), 'utf8')
      await applySql(client, sql, m.file)
    }

    const finalTables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
    console.log('Tables after reapply up:', finalTables.rows.map(r => r.table_name))

    console.log('Migration integration run completed successfully')
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  runIntegration().catch(err => {
    console.error('Migration integration failed:', err)
    process.exit(2)
  })
}

module.exports = { runIntegration, computeChecksum, deriveExpectedSchema }
