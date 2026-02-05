/**
 * TORBIT Mobile - Screenshot Generator
 * App Store screenshot capture at exact Apple dimensions
 */

// ============================================
// App Store Screenshot Dimensions
// ============================================

export interface ScreenshotDevice {
  id: string
  name: string
  displayName: string
  width: number
  height: number
  scale: number
  folder: string
}

// Apple's required dimensions (in pixels at 1x scale for the image file)
export const SCREENSHOT_DEVICES: ScreenshotDevice[] = [
  {
    id: 'iphone-6.7',
    name: 'iPhone 6.7"',
    displayName: 'iPhone 15 Pro Max',
    width: 1290,
    height: 2796,
    scale: 3,
    folder: 'iphone-6.7',
  },
  {
    id: 'iphone-6.1',
    name: 'iPhone 6.1"',
    displayName: 'iPhone 15 / 14',
    width: 1179,
    height: 2556,
    scale: 3,
    folder: 'iphone-6.1',
  },
]

export const DEFAULT_SCREENSHOT_DEVICE = SCREENSHOT_DEVICES[0]

// ============================================
// Screenshot Types
// ============================================

export interface Screenshot {
  id: string
  name: string
  route: string
  deviceId: string
  dataUrl: string | null
  status: 'pending' | 'capturing' | 'complete' | 'error'
  error?: string
}

export interface ScreenshotSet {
  device: ScreenshotDevice
  screenshots: Screenshot[]
}

export interface ScreenshotBundle {
  sets: ScreenshotSet[]
  generatedAt: string
}

// ============================================
// Route Detection (from file structure)
// ============================================

export interface DetectedRoute {
  name: string
  path: string
  displayName: string
}

export function detectRoutesFromFiles(files: { path: string; content: string }[]): DetectedRoute[] {
  const routes: DetectedRoute[] = []
  
  // Look for Expo Router app directory structure
  const appFiles = files.filter(f => 
    f.path.includes('app/') && 
    (f.path.endsWith('.tsx') || f.path.endsWith('.jsx'))
  )
  
  // Common route patterns in Expo Router
  for (const file of appFiles) {
    const path = file.path
    
    // Skip layouts and non-page files
    if (path.includes('_layout') || path.includes('layout.')) continue
    if (path.includes('[') && path.includes(']')) continue // Skip dynamic routes for now
    
    // Extract route name
    let routePath = path
      .replace(/.*app\//, '/')
      .replace(/\(.*?\)\//g, '') // Remove route groups
      .replace(/\.(tsx|jsx|ts|js)$/, '')
      .replace(/\/index$/, '/')
      .replace(/\/$/, '') || '/'
    
    // Generate display name
    const segments = routePath.split('/').filter(Boolean)
    const displayName = segments.length > 0
      ? segments[segments.length - 1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
      : 'Home'
    
    routes.push({
      name: displayName,
      path: routePath,
      displayName,
    })
  }
  
  // Dedupe and sort
  const uniqueRoutes = routes.filter((route, index, self) => 
    index === self.findIndex(r => r.path === route.path)
  )
  
  // Put home/index first
  return uniqueRoutes.sort((a, b) => {
    if (a.path === '/') return -1
    if (b.path === '/') return 1
    return a.displayName.localeCompare(b.displayName)
  })
}

// ============================================
// Screenshot Capture
// ============================================

export interface CaptureOptions {
  element: HTMLElement
  device: ScreenshotDevice
  backgroundColor?: string
}

export async function captureScreenshot(options: CaptureOptions): Promise<string> {
  const { element, device, backgroundColor = '#000000' } = options
  
  // Dynamic import to avoid SSR issues
  const html2canvas = (await import('html2canvas')).default
  
  // Calculate scale to match device resolution
  // The element is rendered at CSS pixels, we need to scale up
  const elementRect = element.getBoundingClientRect()
  const scaleX = device.width / elementRect.width
  const scaleY = device.height / elementRect.height
  const scale = Math.max(scaleX, scaleY)
  
  // Capture at high resolution
  const canvas = await html2canvas(element, {
    scale: scale,
    width: elementRect.width,
    height: elementRect.height,
    backgroundColor,
    useCORS: true,
    allowTaint: true,
    logging: false,
  })
  
  // Resize to exact device dimensions
  const resizedCanvas = document.createElement('canvas')
  resizedCanvas.width = device.width
  resizedCanvas.height = device.height
  
  const ctx = resizedCanvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')
  
  // Fill background
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, device.width, device.height)
  
  // Center the captured content
  const capturedAspect = canvas.width / canvas.height
  const deviceAspect = device.width / device.height
  
  let drawWidth, drawHeight, drawX, drawY
  
  if (capturedAspect > deviceAspect) {
    // Captured is wider - fit to width
    drawWidth = device.width
    drawHeight = device.width / capturedAspect
    drawX = 0
    drawY = (device.height - drawHeight) / 2
  } else {
    // Captured is taller - fit to height
    drawHeight = device.height
    drawWidth = device.height * capturedAspect
    drawX = (device.width - drawWidth) / 2
    drawY = 0
  }
  
  ctx.drawImage(canvas, drawX, drawY, drawWidth, drawHeight)
  
  return resizedCanvas.toDataURL('image/png', 1.0)
}

// ============================================
// Screenshot Bundle Generation
// ============================================

export async function generateScreenshotZip(bundle: ScreenshotBundle): Promise<Blob> {
  const { default: JSZip } = await import('jszip')
  
  const zip = new JSZip()
  
  for (const set of bundle.sets) {
    const folder = zip.folder(set.device.folder)
    if (!folder) continue
    
    for (let i = 0; i < set.screenshots.length; i++) {
      const screenshot = set.screenshots[i]
      if (!screenshot.dataUrl) continue
      
      // Convert data URL to blob
      const base64 = screenshot.dataUrl.split(',')[1]
      const filename = `${String(i + 1).padStart(2, '0')}-${screenshot.name.toLowerCase().replace(/\s+/g, '-')}.png`
      
      folder.file(filename, base64, { base64: true })
    }
  }
  
  return zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  })
}

// ============================================
// Screenshot Validation
// ============================================

export interface ScreenshotValidation {
  valid: boolean
  warnings: string[]
}

export function validateScreenshots(screenshots: Screenshot[]): ScreenshotValidation {
  const warnings: string[] = []
  
  const completed = screenshots.filter(s => s.status === 'complete' && s.dataUrl)
  
  if (completed.length < 3) {
    warnings.push(`Only ${completed.length} screenshot${completed.length !== 1 ? 's' : ''} captured. Apple recommends at least 3.`)
  }
  
  if (completed.length > 10) {
    warnings.push('More than 10 screenshots captured. Apple allows maximum of 10.')
  }
  
  // Check for duplicates (same route captured multiple times)
  const routes = completed.map(s => s.route)
  const duplicates = routes.filter((route, index) => routes.indexOf(route) !== index)
  if (duplicates.length > 0) {
    warnings.push(`Same screen captured multiple times: ${[...new Set(duplicates)].join(', ')}`)
  }
  
  return {
    valid: completed.length >= 1,
    warnings,
  }
}

// ============================================
// Download Helper
// ============================================

export function downloadScreenshotBlob(blob: Blob, appName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${appName.replace(/\s+/g, '-')}-AppStore-Screenshots.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
