import { WebContainer } from '@webcontainer/api'

// ============================================================================
// WEBCONTAINER ENGINE - The Reactor Core
// ============================================================================
// Singleton pattern prevents multiple boots (which would crash the app).
// The WebContainer runs a full Node.js environment inside the browser.
// ============================================================================

let webcontainerInstance: WebContainer | null = null
let bootPromise: Promise<WebContainer> | null = null

/**
 * Get or boot the WebContainer instance.
 * Uses singleton pattern to ensure only one container exists.
 */
export async function getWebContainer(): Promise<WebContainer> {
  // Already booted
  if (webcontainerInstance !== null) {
    return webcontainerInstance
  }
  
  // Currently booting (prevent race conditions)
  if (bootPromise !== null) {
    return bootPromise
  }
  
  // Start boot sequence
  bootPromise = (async () => {
    console.log('🔋 BOOTING REACTOR CORE...')
    console.log('⚡ Initializing WebContainer...')
    
    try {
      const instance = await WebContainer.boot()
      webcontainerInstance = instance
      
      console.log('✅ REACTOR ONLINE')
      console.log('🚀 Virtual Node.js environment ready')
      
      return instance
    } catch (error) {
      console.error('❌ REACTOR MELTDOWN:', error)
      bootPromise = null
      throw error
    }
  })()
  
  return bootPromise
}

/**
 * Check if WebContainer is supported in current browser
 */
export function isWebContainerSupported(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check for SharedArrayBuffer support (required)
  if (typeof SharedArrayBuffer === 'undefined') {
    console.warn('SharedArrayBuffer not available. WebContainer requires COOP/COEP headers.')
    return false
  }
  
  return true
}

/**
 * Tear down the WebContainer (for cleanup)
 */
export async function teardownWebContainer(): Promise<void> {
  if (webcontainerInstance) {
    await webcontainerInstance.teardown()
    webcontainerInstance = null
    bootPromise = null
    console.log('🔌 Reactor shutdown complete')
  }
}
