import { createHash, createHmac } from 'node:crypto'

export interface ShipFileInput {
  path: string
  content: string
}

export interface ShipGovernancePayload {
  auditorPassed: boolean
  previewVerified: boolean
  runtimeProbePassed: boolean
  runtimeHash?: string | null
  dependencyLockHash?: string | null
  rescueCount?: number
  requiresHumanReview?: boolean
  verifiedAt?: string | null
}

export interface ReleaseReadinessReport {
  ready: boolean
  blockers: string[]
  warnings: string[]
  manualRescueRequired: boolean
}

export interface ShipTrustBundle {
  version: '1.0.0'
  generatedAt: string
  target: 'deploy' | 'github'
  workflowMode: 'pr-first' | 'direct'
  actorUserId: string
  projectName: string
  governance: ShipGovernancePayload
  readiness: ReleaseReadinessReport
  fileManifest: Array<{
    path: string
    bytes: number
    hash: string
  }>
  fileManifestHash: string
  bundleHash: string
  signature?: {
    algorithm: 'HMAC-SHA256'
    keyId: string
    value: string
    signedAt: string
  }
}

export function normalizeShipPath(value: string): string {
  return value.replace(/^\/+/, '').replace(/\\/g, '/').replace(/\/{2,}/g, '/')
}

export function resolveShipSigningSecret(): string | null {
  const secret = process.env.TORBIT_AUDIT_SIGNING_SECRET || process.env.TORBIT_SIGNING_SECRET
  if (!secret || !secret.trim()) return null
  return secret.trim()
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function createFileManifest(files: ShipFileInput[]): Array<{ path: string; bytes: number; hash: string }> {
  return files
    .map((file) => ({
      path: normalizeShipPath(file.path),
      bytes: Buffer.byteLength(file.content, 'utf8'),
      hash: hashContent(file.content),
    }))
    .sort((a, b) => a.path.localeCompare(b.path))
}

export function evaluateReleaseReadiness(governance: ShipGovernancePayload): ReleaseReadinessReport {
  const blockers: string[] = []
  const warnings: string[] = []
  const manualRescueRequired = (governance.rescueCount ?? 0) > 0

  if (!governance.auditorPassed) {
    blockers.push('Auditor verification has not passed.')
  }

  if (!governance.previewVerified) {
    blockers.push('Preview verification is incomplete.')
  }

  if (!governance.runtimeProbePassed) {
    blockers.push('Runtime probe did not pass for the current build.')
  }

  if (governance.requiresHumanReview) {
    blockers.push('Human review is required before shipping.')
  }

  if (manualRescueRequired) {
    warnings.push('Build required manual rescue before ship.')
  }

  if (!governance.runtimeHash) {
    warnings.push('Runtime hash is missing from verification payload.')
  }

  if (!governance.dependencyLockHash) {
    warnings.push('Dependency lock hash is missing from verification payload.')
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    manualRescueRequired,
  }
}

export function createShipTrustBundle(input: {
  projectName: string
  target: 'deploy' | 'github'
  workflowMode: 'pr-first' | 'direct'
  actorUserId: string
  governance: ShipGovernancePayload
  files: ShipFileInput[]
}): ShipTrustBundle {
  const fileManifest = createFileManifest(input.files)
  const fileManifestHash = hashJson(fileManifest)
  const readiness = evaluateReleaseReadiness(input.governance)
  const generatedAt = new Date().toISOString()

  const unsigned: Omit<ShipTrustBundle, 'signature'> = {
    version: '1.0.0',
    generatedAt,
    target: input.target,
    workflowMode: input.workflowMode,
    actorUserId: input.actorUserId,
    projectName: input.projectName,
    governance: input.governance,
    readiness,
    fileManifest,
    fileManifestHash,
    bundleHash: '',
  }

  const bundleHash = hashJson(unsigned)

  return {
    ...unsigned,
    bundleHash,
  }
}

export function signShipTrustBundle(
  bundle: ShipTrustBundle,
  signingSecret: string,
  keyId: string = process.env.TORBIT_AUDIT_SIGNING_KEY_ID || 'torbit-default'
): ShipTrustBundle {
  const signature = createHmac('sha256', signingSecret).update(bundle.bundleHash).digest('hex')
  return {
    ...bundle,
    signature: {
      algorithm: 'HMAC-SHA256',
      keyId,
      value: signature,
      signedAt: new Date().toISOString(),
    },
  }
}

export function appendTrustBundleArtifacts(
  files: ShipFileInput[],
  bundle: ShipTrustBundle
): ShipFileInput[] {
  const nextFiles = [...files]

  nextFiles.push({
    path: '.torbit/TRUST_BUNDLE.json',
    content: `${JSON.stringify(bundle, null, 2)}\n`,
  })

  nextFiles.push({
    path: '.torbit/TRUST_FILE_MANIFEST.json',
    content: `${JSON.stringify(bundle.fileManifest, null, 2)}\n`,
  })

  const checklist = [
    '# TORBIT Ship Checklist',
    '',
    `Generated: ${bundle.generatedAt}`,
    `Target: ${bundle.target}`,
    `Workflow: ${bundle.workflowMode}`,
    '',
    '## Readiness',
    `- Ready: ${bundle.readiness.ready ? 'YES' : 'NO'}`,
    `- Manual rescue required: ${bundle.readiness.manualRescueRequired ? 'YES' : 'NO'}`,
    '',
    '## Blockers',
    ...(bundle.readiness.blockers.length > 0
      ? bundle.readiness.blockers.map((item) => `- ${item}`)
      : ['- None']),
    '',
    '## Warnings',
    ...(bundle.readiness.warnings.length > 0
      ? bundle.readiness.warnings.map((item) => `- ${item}`)
      : ['- None']),
    '',
    '## Integrity',
    `- File manifest hash: ${bundle.fileManifestHash}`,
    `- Bundle hash: ${bundle.bundleHash}`,
  ]

  if (bundle.signature) {
    checklist.push(`- Signature: ${bundle.signature.algorithm}/${bundle.signature.keyId}`)
  }

  nextFiles.push({
    path: '.torbit/SHIP_CHECKLIST.md',
    content: `${checklist.join('\n')}\n`,
  })

  return nextFiles
}
