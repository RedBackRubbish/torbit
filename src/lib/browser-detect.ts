/**
 * Browser Detection Utilities
 * 
 * Used for Safari fallback mode - honest degradation when
 * SharedArrayBuffer is unavailable.
 */

export interface BrowserInfo {
  isSafari: boolean
  isChrome: boolean
  isEdge: boolean
  isFirefox: boolean
  supportsWebContainer: boolean
  userAgent: string
}

/**
 * Detect browser type and WebContainer compatibility
 */
export function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      isSafari: false,
      isChrome: false,
      isEdge: false,
      isFirefox: false,
      supportsWebContainer: false,
      userAgent: '',
    }
  }

  const ua = navigator.userAgent

  // Safari detection (exclude Chrome-based browsers that include Safari in UA)
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua)
  
  // Chrome detection (includes Chromium-based)
  const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua)
  
  // Edge detection
  const isEdge = /Edg/.test(ua)
  
  // Firefox detection
  const isFirefox = /Firefox/.test(ua)

  // WebContainer requires SharedArrayBuffer
  const supportsWebContainer = typeof SharedArrayBuffer !== 'undefined'

  return {
    isSafari,
    isChrome,
    isEdge,
    isFirefox,
    supportsWebContainer,
    userAgent: ua,
  }
}

/**
 * Check if current browser supports live execution
 */
export function supportsLiveExecution(): boolean {
  const browser = detectBrowser()
  return browser.supportsWebContainer
}

/**
 * Get a user-friendly browser recommendation message
 */
export function getBrowserRecommendation(): string {
  const browser = detectBrowser()
  
  if (browser.isSafari) {
    return 'Safari does not support the secure execution environment TORBIT requires. Please use Chrome or Edge for live execution.'
  }
  
  if (browser.isFirefox) {
    return 'Firefox has limited support for TORBIT\'s execution environment. For the best experience, use Chrome or Edge.'
  }
  
  if (!browser.supportsWebContainer) {
    return 'Your browser does not support SharedArrayBuffer, which TORBIT requires for live execution. Please use Chrome or Edge.'
  }
  
  return ''
}
