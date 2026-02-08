import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { strictRateLimiter, getClientIP, rateLimitResponse } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 120

const ShipFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
})

const DeployRequestSchema = z.object({
  provider: z.enum(['vercel', 'netlify', 'railway']).default('vercel'),
  projectName: z.string().optional(),
  framework: z.enum(['sveltekit', 'nextjs', 'vite', 'remix', 'astro', 'auto']).default('auto'),
  buildCommand: z.string().optional(),
  outputDirectory: z.string().optional(),
  region: z.string().optional(),
  environmentVariables: z.record(z.string(), z.string())
    .optional()
    .transform(vars => {
      if (!vars) return vars
      // Filter out potentially dangerous env var keys
      const BLOCKED_PREFIXES = ['AWS_', 'STRIPE_SECRET', 'SUPABASE_SERVICE', 'DATABASE_URL', 'REDIS_URL', 'GITHUB_TOKEN', 'VERCEL_TOKEN', 'NETLIFY_TOKEN']
      const filtered: Record<string, string> = {}
      for (const [key, value] of Object.entries(vars)) {
        const upperKey = key.toUpperCase()
        const isBlocked = BLOCKED_PREFIXES.some(prefix => upperKey.startsWith(prefix))
        if (!isBlocked) {
          filtered[key] = value
        }
      }
      return filtered
    }),
  files: z.array(ShipFileSchema).min(1),
})

interface VercelDeploymentResponse {
  id: string
  url?: string
  inspectorUrl?: string
  readyState?: string
}

interface NetlifySiteResponse {
  id: string
  name?: string
  ssl_url?: string
  url?: string
  admin_url?: string
}

interface NetlifyDeployResponse {
  id: string
  state?: string
  ssl_url?: string
  deploy_ssl_url?: string
  url?: string
  deploy_url?: string
  admin_url?: string
}

function toSlug(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'torbit-project'
}

function normalizeFilePath(path: string): string {
  const clean = path.replace(/^\/+/, '').replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  if (!clean || clean.includes('..')) {
    throw new Error(`Invalid file path: ${path}`)
  }
  return clean
}

async function readJsonOrText(response: Response): Promise<string> {
  try {
    const data = await response.json() as { error?: { message?: string }; message?: string }
    return data.error?.message || data.message || `Request failed (${response.status})`
  } catch {
    try {
      const text = await response.text()
      return text || `Request failed (${response.status})`
    } catch {
      return `Request failed (${response.status})`
    }
  }
}

async function deployToVercel(params: {
  token: string
  teamId?: string
  teamSlug?: string
  projectName: string
  framework: 'sveltekit' | 'nextjs' | 'vite' | 'remix' | 'astro' | 'auto'
  buildCommand?: string
  outputDirectory?: string
  environmentVariables?: Record<string, string>
  files: Array<{ path: string; content: string }>
}): Promise<{
  deploymentId: string
  deploymentUrl?: string
  inspectorUrl?: string
  state?: string
}> {
  const { token, teamId, teamSlug, projectName, framework, buildCommand, outputDirectory, environmentVariables, files } = params

  const query = new URLSearchParams()
  if (teamId) {
    query.set('teamId', teamId)
  } else if (teamSlug) {
    query.set('slug', teamSlug)
  }

  const endpoint = `https://api.vercel.com/v13/deployments${query.toString() ? `?${query.toString()}` : ''}`

  const projectSettings: Record<string, string> = {}
  if (framework !== 'auto') {
    projectSettings.framework = framework
  }
  if (buildCommand) {
    projectSettings.buildCommand = buildCommand
  }
  if (outputDirectory) {
    projectSettings.outputDirectory = outputDirectory
  }

  const vercelRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: toSlug(projectName),
      target: 'production',
      files: files.map((file) => ({
        file: file.path,
        data: file.content,
      })),
      ...(Object.keys(projectSettings).length > 0 ? { projectSettings } : {}),
      ...(environmentVariables && Object.keys(environmentVariables).length > 0 ? { env: environmentVariables } : {}),
    }),
  })

  if (!vercelRes.ok) {
    throw new Error(await readJsonOrText(vercelRes))
  }

  const deployment = await vercelRes.json() as VercelDeploymentResponse
  const deploymentUrl = deployment.url
    ? (deployment.url.startsWith('http') ? deployment.url : `https://${deployment.url}`)
    : undefined

  return {
    deploymentId: deployment.id,
    deploymentUrl,
    inspectorUrl: deployment.inspectorUrl,
    state: deployment.readyState,
  }
}

async function createNetlifyZip(files: Array<{ path: string; content: string }>): Promise<Buffer> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  files.forEach((file) => {
    zip.file(file.path, file.content)
  })

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })
}

async function ensureNetlifySite(params: {
  token: string
  siteId?: string
  projectName: string
}): Promise<{
  siteId: string
  siteUrl?: string
  adminUrl?: string
}> {
  const { token, siteId, projectName } = params

  if (siteId) {
    const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!siteRes.ok) {
      throw new Error(await readJsonOrText(siteRes))
    }

    const site = await siteRes.json() as NetlifySiteResponse
    return {
      siteId: site.id,
      siteUrl: site.ssl_url || site.url,
      adminUrl: site.admin_url,
    }
  }

  const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: toSlug(projectName),
    }),
  })

  if (!createRes.ok) {
    throw new Error(await readJsonOrText(createRes))
  }

  const site = await createRes.json() as NetlifySiteResponse
  return {
    siteId: site.id,
    siteUrl: site.ssl_url || site.url,
    adminUrl: site.admin_url,
  }
}

async function deployToNetlify(params: {
  token: string
  siteId?: string
  projectName: string
  files: Array<{ path: string; content: string }>
}): Promise<{
  siteId: string
  deployId: string
  deploymentUrl?: string
  dashboardUrl?: string
  state?: string
}> {
  const { token, siteId, projectName, files } = params
  const site = await ensureNetlifySite({ token, siteId, projectName })
  const zipBuffer = await createNetlifyZip(files)

  const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(site.siteId)}/deploys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/zip',
    },
    body: new Uint8Array(zipBuffer),
  })

  if (!deployRes.ok) {
    throw new Error(await readJsonOrText(deployRes))
  }

  const deploy = await deployRes.json() as NetlifyDeployResponse

  return {
    siteId: site.siteId,
    deployId: deploy.id,
    deploymentUrl: deploy.ssl_url || deploy.deploy_ssl_url || deploy.url || deploy.deploy_url || site.siteUrl,
    dashboardUrl: deploy.admin_url || site.adminUrl,
    state: deploy.state,
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
    const parseResult = DeployRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const payload = parseResult.data
    const normalizedFiles = payload.files.map((file) => ({
      path: normalizeFilePath(file.path),
      content: file.content,
    }))
    const projectName = payload.projectName?.trim() || 'Torbit Project'

    if (payload.provider === 'railway') {
      return NextResponse.json(
        { error: 'Railway deploy is not supported in this build. Use Vercel or Netlify.' },
        { status: 400 }
      )
    }

    if (payload.provider === 'vercel') {
      const vercelToken = process.env.VERCEL_TOKEN
      if (!vercelToken) {
        return NextResponse.json(
          { error: 'VERCEL_TOKEN is not configured on the server.' },
          { status: 500 }
        )
      }

      const deployment = await deployToVercel({
        token: vercelToken,
        teamId: process.env.VERCEL_TEAM_ID,
        teamSlug: process.env.VERCEL_TEAM_SLUG,
        projectName,
        framework: payload.framework,
        buildCommand: payload.buildCommand,
        outputDirectory: payload.outputDirectory,
        environmentVariables: payload.environmentVariables,
        files: normalizedFiles,
      })

      return NextResponse.json({
        success: true,
        provider: 'vercel',
        deploymentId: deployment.deploymentId,
        deploymentUrl: deployment.deploymentUrl,
        inspectorUrl: deployment.inspectorUrl,
        state: deployment.state,
      })
    }

    const netlifyToken = process.env.NETLIFY_TOKEN
    if (!netlifyToken) {
      return NextResponse.json(
        { error: 'NETLIFY_TOKEN is not configured on the server.' },
        { status: 500 }
      )
    }

    const netlifyDeployment = await deployToNetlify({
      token: netlifyToken,
      siteId: process.env.NETLIFY_SITE_ID,
      projectName,
      files: normalizedFiles,
    })

    return NextResponse.json({
      success: true,
      provider: 'netlify',
      deploymentId: netlifyDeployment.deployId,
      deploymentUrl: netlifyDeployment.deploymentUrl,
      dashboardUrl: netlifyDeployment.dashboardUrl,
      siteId: netlifyDeployment.siteId,
      state: netlifyDeployment.state,
    })
  } catch (error) {
    console.error('Deploy ship error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deployment failed' },
      { status: 500 }
    )
  }
}
