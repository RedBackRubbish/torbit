import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { strictRateLimiter, getClientIP, rateLimitResponse } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import {
  appendTrustBundleArtifacts,
  createShipTrustBundle,
  resolveShipSigningSecret,
  signShipTrustBundle,
  type ShipGovernancePayload,
} from '@/lib/ship/trust-bundle'

export const runtime = 'nodejs'
export const maxDuration = 120

const ShipFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
})

const GitHubShipRequestSchema = z.object({
  operation: z.enum(['init', 'push', 'pull-request', 'status']).default('pull-request'),
  workflowMode: z.enum(['pr-first', 'direct']).default('pr-first'),
  token: z.string().min(1),
  owner: z.string().optional(),
  repoName: z.string().optional(),
  projectName: z.string().optional(),
  private: z.boolean().default(true),
  commitMessage: z.string().optional(),
  branch: z.string().optional(),
  prTitle: z.string().optional(),
  prDescription: z.string().optional(),
  baseBranch: z.string().optional(),
  governance: z.object({
    auditorPassed: z.boolean(),
    previewVerified: z.boolean(),
    runtimeProbePassed: z.boolean(),
    runtimeHash: z.string().optional(),
    dependencyLockHash: z.string().optional(),
    rescueCount: z.number().int().nonnegative().optional(),
    requiresHumanReview: z.boolean().optional(),
    verifiedAt: z.string().optional(),
  }).optional(),
  files: z.array(ShipFileSchema).default([]),
})

interface GitHubUser {
  login: string
}

interface GitHubRepo {
  name: string
  html_url: string
  default_branch: string
  owner: {
    login: string
  }
}

interface GitHubRefResponse {
  object: {
    sha: string
  }
}

interface GitHubContentResponse {
  sha?: string
}

interface GitHubPullRequest {
  html_url: string
  number: number
}

interface GitHubPullRequestDetails {
  mergeable: boolean | null
  mergeable_state?: string
}

function sanitizeRepoName(input: string): string {
  const sanitized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return sanitized || 'torbit-project'
}

function sanitizeBranchName(input: string): string {
  const sanitized = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9/._-]+/g, '-')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.\.+/g, '.')
    .replace(/\/{2,}/g, '/')

  return sanitized || 'main'
}

function sanitizeOwner(input: string): string {
  const sanitized = input
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '')

  if (!sanitized) {
    throw new Error('Invalid GitHub owner name')
  }

  return sanitized
}

function normalizeFilePath(path: string): string {
  const withoutLeading = path.replace(/^\/+/, '').replace(/\\/g, '/')
  const compact = withoutLeading.replace(/\/{2,}/g, '/')

  if (!compact || compact.includes('..')) {
    throw new Error(`Invalid file path: ${path}`)
  }

  return compact
}

function encodePathForContentsApi(path: string): string {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/')
}

async function readGitHubError(response: Response): Promise<string> {
  const fallback = `GitHub API request failed (${response.status})`

  try {
    const data = await response.json() as { message?: string; errors?: Array<{ message?: string }> }
    const message = data.message || fallback
    const firstDetail = data.errors?.[0]?.message
    return firstDetail ? `${message}: ${firstDetail}` : message
  } catch {
    return fallback
  }
}

async function githubRequest(path: string, token: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/vnd.github+json')
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('X-GitHub-Api-Version', '2022-11-28')

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers,
  })
}

async function getOrCreateRepository(params: {
  token: string
  owner: string
  viewerLogin: string
  repoName: string
  isPrivate: boolean
}): Promise<GitHubRepo> {
  const { token, owner, viewerLogin, repoName, isPrivate } = params

  const existingRepoRes = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`, token)
  if (existingRepoRes.ok) {
    return await existingRepoRes.json() as GitHubRepo
  }

  if (existingRepoRes.status !== 404) {
    throw new Error(await readGitHubError(existingRepoRes))
  }

  const createPath = owner === viewerLogin
    ? '/user/repos'
    : `/orgs/${encodeURIComponent(owner)}/repos`

  const createRes = await githubRequest(createPath, token, {
    method: 'POST',
    body: JSON.stringify({
      name: repoName,
      private: isPrivate,
      auto_init: true,
    }),
  })

  if (!createRes.ok) {
    throw new Error(await readGitHubError(createRes))
  }

  return await createRes.json() as GitHubRepo
}

async function getBranchSha(params: {
  token: string
  owner: string
  repo: string
  branch: string
}): Promise<string | null> {
  const { token, owner, repo, branch } = params

  const refRes = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`,
    token
  )

  if (refRes.status === 404) {
    return null
  }

  if (!refRes.ok) {
    throw new Error(await readGitHubError(refRes))
  }

  const ref = await refRes.json() as GitHubRefResponse
  return ref.object.sha
}

async function ensureBranch(params: {
  token: string
  owner: string
  repo: string
  branch: string
  baseBranch: string
}): Promise<void> {
  const { token, owner, repo, branch, baseBranch } = params

  const currentSha = await getBranchSha({ token, owner, repo, branch })
  if (currentSha) {
    return
  }

  const baseSha = await getBranchSha({ token, owner, repo, branch: baseBranch })
  if (!baseSha) {
    throw new Error(`Base branch "${baseBranch}" does not exist`)
  }

  const createRefRes = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: baseSha,
      }),
    }
  )

  if (createRefRes.ok || createRefRes.status === 422) {
    return
  }

  throw new Error(await readGitHubError(createRefRes))
}

async function upsertFile(params: {
  token: string
  owner: string
  repo: string
  branch: string
  path: string
  content: string
  commitMessage: string
}): Promise<void> {
  const { token, owner, repo, branch, path, content, commitMessage } = params
  const encodedPath = encodePathForContentsApi(path)

  const existingRes = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    token
  )

  let existingSha: string | undefined
  if (existingRes.ok) {
    const existing = await existingRes.json() as GitHubContentResponse
    existingSha = existing.sha
  } else if (existingRes.status !== 404) {
    throw new Error(await readGitHubError(existingRes))
  }

  const putRes = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(content, 'utf8').toString('base64'),
        branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    }
  )

  if (!putRes.ok) {
    throw new Error(await readGitHubError(putRes))
  }
}

async function createOrFindPullRequest(params: {
  token: string
  owner: string
  repo: string
  headBranch: string
  baseBranch: string
  title: string
  body: string
}): Promise<GitHubPullRequest> {
  const { token, owner, repo, headBranch, baseBranch, title, body } = params

  const createRes = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        head: `${owner}:${headBranch}`,
        base: baseBranch,
      }),
    }
  )

  if (createRes.ok) {
    return await createRes.json() as GitHubPullRequest
  }

  // Reuse existing open PR for same head/base if GitHub returns 422.
  if (createRes.status === 422) {
    const listRes = await githubRequest(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open&head=${encodeURIComponent(`${owner}:${headBranch}`)}&base=${encodeURIComponent(baseBranch)}`,
      token
    )

    if (listRes.ok) {
      const pulls = await listRes.json() as GitHubPullRequest[]
      if (pulls.length > 0) {
        return pulls[0]
      }
    }
  }

  throw new Error(await readGitHubError(createRes))
}

async function getPullRequestMergeability(params: {
  token: string
  owner: string
  repo: string
  prNumber: number
}): Promise<{
  mergeable: boolean | null
  mergeableState: string | null
}> {
  const { token, owner, repo, prNumber } = params
  const maxAttempts = 5

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await githubRequest(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`,
      token
    )

    if (!response.ok) {
      throw new Error(await readGitHubError(response))
    }

    const details = await response.json() as GitHubPullRequestDetails
    if (details.mergeable !== null) {
      return {
        mergeable: details.mergeable,
        mergeableState: details.mergeable_state || null,
      }
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 750))
    }
  }

  return {
    mergeable: null,
    mergeableState: 'unknown',
  }
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request)
  const rateLimitResult = await strictRateLimiter.check(clientIP)

  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const parseResult = GitHubShipRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const payload = parseResult.data
    const token = payload.token.trim()
    if (!token) {
      return NextResponse.json(
        { error: 'Missing GitHub access token for this request.' },
        { status: 400 }
      )
    }

    const repoName = sanitizeRepoName(
      payload.repoName ?? payload.projectName ?? 'torbit-project'
    )
    const effectiveOperation = (
      payload.operation === 'push' && payload.workflowMode === 'pr-first'
        ? 'pull-request'
        : payload.operation
    )

    if (
      (effectiveOperation === 'push' || effectiveOperation === 'pull-request') &&
      payload.files.length === 0
    ) {
      return NextResponse.json(
        { error: `Operation "${effectiveOperation}" requires at least one file.` },
        { status: 400 }
      )
    }

    const viewerRes = await githubRequest('/user', token)
    if (!viewerRes.ok) {
      throw new Error(await readGitHubError(viewerRes))
    }
    const viewer = await viewerRes.json() as GitHubUser

    const owner = payload.owner
      ? sanitizeOwner(payload.owner)
      : viewer.login
    const repository = await getOrCreateRepository({
      token,
      owner,
      viewerLogin: viewer.login,
      repoName,
      isPrivate: payload.private,
    })

    const baseBranch = payload.baseBranch
      ? sanitizeBranchName(payload.baseBranch)
      : sanitizeBranchName(repository.default_branch || 'main')
    const requestedBranch = payload.branch
      ? sanitizeBranchName(payload.branch)
      : sanitizeBranchName(repository.default_branch || 'main')
    const normalizedFiles = payload.files.map((file) => ({
      path: normalizeFilePath(file.path),
      content: file.content,
    }))

    const governance: ShipGovernancePayload = payload.governance ?? {
      auditorPassed: false,
      previewVerified: false,
      runtimeProbePassed: false,
      rescueCount: 0,
      requiresHumanReview: false,
      runtimeHash: null,
      dependencyLockHash: null,
      verifiedAt: null,
    }

    if (payload.operation === 'init') {
      return NextResponse.json({
        success: true,
        operation: 'init',
        owner,
        repo: repository.name,
        defaultBranch: repository.default_branch,
        repoUrl: repository.html_url,
      })
    }

    if (payload.operation === 'status') {
      const branchSha = await getBranchSha({
        token,
        owner,
        repo: repository.name,
        branch: requestedBranch,
      })

      return NextResponse.json({
        success: true,
        operation: 'status',
        owner,
        repo: repository.name,
        repoUrl: repository.html_url,
        defaultBranch: repository.default_branch,
        branch: requestedBranch,
        branchExists: Boolean(branchSha),
      })
    }

    const unsignedTrustBundle = createShipTrustBundle({
      projectName: payload.projectName || repository.name,
      target: 'github',
      workflowMode: payload.workflowMode,
      actorUserId: user.id,
      governance,
      files: normalizedFiles,
    })

    const signedTrustBundle = (() => {
      const signingSecret = resolveShipSigningSecret()
      if (!signingSecret) return unsignedTrustBundle
      return signShipTrustBundle(unsignedTrustBundle, signingSecret)
    })()

    if (effectiveOperation === 'push' && !signedTrustBundle.readiness.ready) {
      return NextResponse.json(
        {
          error: 'Direct push blocked by trusted shipping gate.',
          blockers: signedTrustBundle.readiness.blockers,
          warnings: signedTrustBundle.readiness.warnings,
          workflowMode: payload.workflowMode,
          trustBundleHash: signedTrustBundle.bundleHash,
          manualRescueRequired: signedTrustBundle.readiness.manualRescueRequired,
        },
        { status: 412 }
      )
    }

    const shipFiles = appendTrustBundleArtifacts(normalizedFiles, signedTrustBundle)

    let branch = requestedBranch
    if (effectiveOperation === 'pull-request' && branch === baseBranch) {
      branch = sanitizeBranchName(`torbit-export-${Date.now().toString(36)}`)
    }

    await ensureBranch({
      token,
      owner,
      repo: repository.name,
      branch,
      baseBranch,
    })

    const commitMessage = payload.commitMessage?.trim() || 'chore: sync project from TORBIT'

    for (const file of shipFiles) {
      await upsertFile({
        token,
        owner,
        repo: repository.name,
        branch,
        path: file.path,
        content: file.content,
        commitMessage,
      })
    }

    if (effectiveOperation === 'pull-request') {
      const readinessLines = [
        '### TORBIT Trust Gate',
        `- Ready for direct deploy: ${signedTrustBundle.readiness.ready ? 'Yes' : 'No'}`,
        `- Manual rescue required: ${signedTrustBundle.readiness.manualRescueRequired ? 'Yes' : 'No'}`,
        `- Bundle hash: \`${signedTrustBundle.bundleHash}\``,
        ...(signedTrustBundle.readiness.blockers.length > 0
          ? [
            '',
            '#### Blockers',
            ...signedTrustBundle.readiness.blockers.map((item) => `- ${item}`),
          ]
          : []),
        ...(signedTrustBundle.readiness.warnings.length > 0
          ? [
            '',
            '#### Warnings',
            ...signedTrustBundle.readiness.warnings.map((item) => `- ${item}`),
          ]
          : []),
      ].join('\n')

      const pr = await createOrFindPullRequest({
        token,
        owner,
        repo: repository.name,
        headBranch: branch,
        baseBranch,
        title: payload.prTitle?.trim() || `TORBIT export for ${payload.projectName || repository.name}`,
        body: `${payload.prDescription?.trim() || 'Automated project sync from TORBIT.'}\n\n${readinessLines}`,
      })
      const mergeability = await getPullRequestMergeability({
        token,
        owner,
        repo: repository.name,
        prNumber: pr.number,
      })
      const mergeableWithoutRescue = (
        mergeability.mergeable === true &&
        !signedTrustBundle.readiness.manualRescueRequired
      )

      return NextResponse.json({
        success: true,
        operation: 'pull-request',
        requestedOperation: payload.operation,
        workflowMode: payload.workflowMode,
        owner,
        repo: repository.name,
        branch,
        baseBranch,
        filesSynced: shipFiles.length,
        repoUrl: repository.html_url,
        prUrl: pr.html_url,
        prNumber: pr.number,
        mergeable: mergeability.mergeable,
        mergeableState: mergeability.mergeableState,
        mergeableWithoutRescue,
        manualRescueRequired: signedTrustBundle.readiness.manualRescueRequired,
        trustBundleHash: signedTrustBundle.bundleHash,
        trustSigned: Boolean(signedTrustBundle.signature),
        blockers: signedTrustBundle.readiness.blockers,
        warnings: signedTrustBundle.readiness.warnings,
      })
    }

    return NextResponse.json({
      success: true,
      operation: 'push',
      requestedOperation: payload.operation,
      workflowMode: payload.workflowMode,
      owner,
      repo: repository.name,
      branch,
      filesSynced: shipFiles.length,
      repoUrl: repository.html_url,
      trustBundleHash: signedTrustBundle.bundleHash,
      trustSigned: Boolean(signedTrustBundle.signature),
      manualRescueRequired: signedTrustBundle.readiness.manualRescueRequired,
      blockers: signedTrustBundle.readiness.blockers,
      warnings: signedTrustBundle.readiness.warnings,
    })
  } catch (error) {
    console.error('GitHub ship error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'GitHub sync failed' },
      { status: 500 }
    )
  }
}
