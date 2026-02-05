/**
 * TORBIT Mobile - Export Validation
 * Fail fast, fail honestly
 */

import type { MobileCapabilities, MobileProjectConfig } from './types'
import { CAPABILITY_PACKAGES, CAPABILITY_PERMISSIONS } from './types'

// ============================================
// Validation Types
// ============================================

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  id: string
  severity: ValidationSeverity
  title: string
  description: string
  fix?: string
  category: 'icon' | 'splash' | 'config' | 'capabilities' | 'content' | 'privacy'
}

export interface ValidationResult {
  valid: boolean
  canExport: boolean
  issues: ValidationIssue[]
  stats: {
    errors: number
    warnings: number
    info: number
  }
}

export interface ProjectFile {
  path: string
  content: string
}

// ============================================
// File Pattern Matchers
// ============================================

const APP_ICON_PATTERNS = [
  /assets\/icon\.(png|jpg|jpeg|svg)$/i,
  /assets\/images\/icon\.(png|jpg|jpeg|svg)$/i,
  /app-icon\.(png|jpg|jpeg|svg)$/i,
  /icon\.(png|jpg|jpeg|svg)$/i,
]

const SPLASH_PATTERNS = [
  /assets\/splash\.(png|jpg|jpeg|svg)$/i,
  /assets\/images\/splash\.(png|jpg|jpeg|svg)$/i,
  /splash\.(png|jpg|jpeg|svg)$/i,
]

const PRIVACY_POLICY_PATTERNS = [
  /privacy/i,
  /PRIVACY/,
]

// ============================================
// Core Validation Functions
// ============================================

export function validateProject(
  files: ProjectFile[],
  config: MobileProjectConfig
): ValidationResult {
  const issues: ValidationIssue[] = []
  
  // 1. Validate app name
  issues.push(...validateAppName(config.appName))
  
  // 2. Validate bundle ID
  issues.push(...validateBundleId(config.bundleId))
  
  // 3. Check for app icon
  issues.push(...validateAppIcon(files))
  
  // 4. Check for splash screen
  issues.push(...validateSplash(files))
  
  // 5. Validate project has content (not just scaffold)
  issues.push(...validateContent(files))
  
  // 6. Validate capabilities configuration
  issues.push(...validateCapabilities(files, config.capabilities))
  
  // 7. Check for privacy policy (if auth enabled)
  issues.push(...validatePrivacy(files, config.capabilities))
  
  // Calculate stats
  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const info = issues.filter(i => i.severity === 'info').length
  
  return {
    valid: errors === 0,
    canExport: errors === 0, // Can export if no blocking errors
    issues,
    stats: { errors, warnings, info }
  }
}

// ============================================
// Individual Validators
// ============================================

function validateAppName(appName: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  
  if (!appName || appName.trim() === '') {
    issues.push({
      id: 'app-name-missing',
      severity: 'error',
      title: 'App name is required',
      description: 'Your app needs a name to be submitted to the App Store.',
      fix: 'Set an app name in the project settings.',
      category: 'config',
    })
  } else if (appName.length > 30) {
    issues.push({
      id: 'app-name-too-long',
      severity: 'warning',
      title: 'App name may be too long',
      description: `App name is ${appName.length} characters. Apple recommends 30 or fewer.`,
      fix: 'Consider shortening your app name.',
      category: 'config',
    })
  } else if (appName === 'My App' || appName === 'MyApp') {
    issues.push({
      id: 'app-name-placeholder',
      severity: 'warning',
      title: 'App name appears to be a placeholder',
      description: 'Change the app name before submitting to the App Store.',
      fix: 'Set a unique app name in the project settings.',
      category: 'config',
    })
  }
  
  return issues
}

function validateBundleId(bundleId: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  
  if (!bundleId || bundleId.trim() === '') {
    issues.push({
      id: 'bundle-id-missing',
      severity: 'error',
      title: 'Bundle ID is required',
      description: 'A bundle identifier is required for iOS apps.',
      fix: 'Set a bundle ID like com.yourcompany.appname',
      category: 'config',
    })
    return issues
  }
  
  // Check format: reverse domain notation
  const bundleIdRegex = /^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z][a-zA-Z0-9-]*)+$/
  if (!bundleIdRegex.test(bundleId)) {
    issues.push({
      id: 'bundle-id-invalid',
      severity: 'error',
      title: 'Invalid bundle ID format',
      description: 'Bundle ID must use reverse domain notation (e.g., com.company.app).',
      fix: 'Use format: com.yourcompany.appname',
      category: 'config',
    })
  }
  
  // Check for placeholder
  if (bundleId === 'com.torbit.app' || bundleId.includes('example') || bundleId.includes('placeholder')) {
    issues.push({
      id: 'bundle-id-placeholder',
      severity: 'warning',
      title: 'Bundle ID appears to be a placeholder',
      description: 'Change the bundle ID to your own before submitting.',
      fix: 'Use your own bundle ID from Apple Developer Portal.',
      category: 'config',
    })
  }
  
  return issues
}

function validateAppIcon(files: ProjectFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  
  const hasIcon = files.some(file => 
    APP_ICON_PATTERNS.some(pattern => pattern.test(file.path))
  )
  
  // Also check app.config.ts for icon reference
  const appConfig = files.find(f => f.path.includes('app.config'))
  const hasIconInConfig = appConfig && appConfig.content.includes('icon:')
  
  if (!hasIcon && !hasIconInConfig) {
    issues.push({
      id: 'app-icon-missing',
      severity: 'error',
      title: 'App icon is missing',
      description: 'iOS requires an app icon (1024x1024 PNG, no alpha channel).',
      fix: 'Add an icon.png file to your assets folder.',
      category: 'icon',
    })
  }
  
  return issues
}

function validateSplash(files: ProjectFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  
  const hasSplash = files.some(file => 
    SPLASH_PATTERNS.some(pattern => pattern.test(file.path))
  )
  
  // Also check app.config.ts for splash reference
  const appConfig = files.find(f => f.path.includes('app.config'))
  const hasSplashInConfig = appConfig && appConfig.content.includes('splash:')
  
  if (!hasSplash && !hasSplashInConfig) {
    issues.push({
      id: 'splash-missing',
      severity: 'warning',
      title: 'Splash screen is missing',
      description: 'A splash screen provides a polished launch experience.',
      fix: 'Add a splash.png file to your assets folder.',
      category: 'splash',
    })
  }
  
  return issues
}

function validateContent(files: ProjectFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  
  // Check if project has meaningful content beyond scaffold
  const codeFiles = files.filter(f => 
    f.path.endsWith('.tsx') || 
    f.path.endsWith('.ts') || 
    f.path.endsWith('.jsx') || 
    f.path.endsWith('.js')
  )
  
  // Filter out config files
  const appCodeFiles = codeFiles.filter(f => 
    !f.path.includes('config') && 
    !f.path.includes('.d.ts')
  )
  
  if (appCodeFiles.length < 2) {
    issues.push({
      id: 'content-minimal',
      severity: 'warning',
      title: 'Project appears to be minimal',
      description: 'Your project has very few code files. Consider adding more functionality.',
      fix: 'Continue building your app with AI assistance.',
      category: 'content',
    })
  }
  
  // Check for placeholder content
  const hasPlaceholders = files.some(f => 
    f.content.includes('Lorem ipsum') || 
    f.content.includes('TODO:') ||
    f.content.includes('FIXME:') ||
    f.content.includes('placeholder')
  )
  
  if (hasPlaceholders) {
    issues.push({
      id: 'content-placeholders',
      severity: 'warning',
      title: 'Placeholder content detected',
      description: 'Your app contains placeholder text or TODOs that should be replaced.',
      fix: 'Replace placeholder content before submitting.',
      category: 'content',
    })
  }
  
  return issues
}

function validateCapabilities(
  files: ProjectFile[], 
  capabilities: MobileCapabilities
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  
  // Check for capability-specific requirements
  const appConfig = files.find(f => f.path.includes('app.config'))
  const infoPlist = appConfig?.content || ''
  
  if (capabilities.camera) {
    if (!infoPlist.includes('NSCameraUsageDescription') && !infoPlist.includes('cameraPermission')) {
      issues.push({
        id: 'camera-permission-missing',
        severity: 'warning',
        title: 'Camera permission description may be missing',
        description: 'Apps using camera must explain why to users.',
        fix: 'Ensure NSCameraUsageDescription is set in app.config.ts',
        category: 'capabilities',
      })
    }
  }
  
  if (capabilities.location) {
    if (!infoPlist.includes('NSLocationWhenInUseUsageDescription') && !infoPlist.includes('locationPermission')) {
      issues.push({
        id: 'location-permission-missing',
        severity: 'warning',
        title: 'Location permission description may be missing',
        description: 'Apps using location must explain why to users.',
        fix: 'Ensure NSLocationWhenInUseUsageDescription is set in app.config.ts',
        category: 'capabilities',
      })
    }
  }
  
  if (capabilities.biometrics) {
    if (!infoPlist.includes('NSFaceIDUsageDescription') && !infoPlist.includes('faceIdPermission')) {
      issues.push({
        id: 'faceid-permission-missing',
        severity: 'warning',
        title: 'Face ID permission description may be missing',
        description: 'Apps using Face ID must explain why to users.',
        fix: 'Ensure NSFaceIDUsageDescription is set in app.config.ts',
        category: 'capabilities',
      })
    }
  }
  
  return issues
}

function validatePrivacy(
  files: ProjectFile[], 
  capabilities: MobileCapabilities
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  
  // If auth is enabled, privacy policy is essentially required
  if (capabilities.auth) {
    const hasPrivacyReference = files.some(f => 
      PRIVACY_POLICY_PATTERNS.some(pattern => pattern.test(f.content))
    )
    
    if (!hasPrivacyReference) {
      issues.push({
        id: 'privacy-policy-missing',
        severity: 'warning',
        title: 'Privacy policy reference not found',
        description: 'Apps with authentication require a privacy policy for App Store submission.',
        fix: 'Add a privacy policy URL to your app.',
        category: 'privacy',
      })
    }
  }
  
  // If payments enabled, warn about guidelines
  if (capabilities.payments) {
    issues.push({
      id: 'payments-guidelines',
      severity: 'info',
      title: 'In-App Purchase guidelines apply',
      description: 'Review Apple\'s App Store Guidelines 3.1 before submission.',
      fix: 'Ensure compliance with in-app purchase requirements.',
      category: 'privacy',
    })
  }
  
  return issues
}

// ============================================
// Podfile Generator (Capability-aware)
// ============================================

export function generatePodfile(
  config: MobileProjectConfig,
  appName: string
): string {
  const enabledCapabilities = Object.entries(config.capabilities)
    .filter(([_, enabled]) => enabled)
    .map(([cap]) => cap as keyof MobileCapabilities)
  
  // Base pods that are always included
  const basePods = [
    'use_expo_modules!',
  ]
  
  // Capability-specific pods are handled by Expo autolinking,
  // but we document which capabilities are in use
  const capabilityComments = enabledCapabilities.map(cap => 
    `# ${cap}: ${CAPABILITY_PACKAGES[cap].join(', ')}`
  )
  
  return `# TORBIT Generated Podfile
# Capabilities: ${enabledCapabilities.join(', ') || 'none'}

require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")
require File.join(File.dirname(\`node --print "require.resolve('react-native/package.json')"\`), "scripts/react_native_pods")

require 'json'
podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}

ENV['RCT_NEW_ARCH_ENABLED'] = podfile_properties['newArchEnabled'] == 'true' ? '1' : '0'
ENV['EX_DEV_CLIENT_NETWORK_INSPECTOR'] = podfile_properties['EX_DEV_CLIENT_NETWORK_INSPECTOR']

platform :ios, podfile_properties['ios.deploymentTarget'] || '${config.minIosVersion}'
install! 'cocoapods', :deterministic_uuids => false

prepare_react_native_project!

target '${appName.replace(/\s+/g, '')}' do
  use_expo_modules!
  
  config = use_native_modules!
  
  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
    :app_path => "#{Pod::Config.instance.installation_root}/..",
    :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
  )
  
  # Enabled Capabilities:
${capabilityComments.map(c => '  ' + c).join('\n') || '  # (none)'}
  
  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => podfile_properties['apple.ccacheEnabled'] == 'true',
    )
  end
end
`
}

// ============================================
// Entitlement Generator (Only enabled capabilities)
// ============================================

export function generateEntitlements(
  capabilities: MobileCapabilities,
  bundleId: string
): string {
  const entitlements: string[] = []
  
  // Base entitlements (always present)
  entitlements.push(`<key>application-identifier</key>`)
  entitlements.push(`<string>$(AppIdentifierPrefix)${bundleId}</string>`)
  
  // Only add entitlements for enabled capabilities
  if (capabilities.push) {
    entitlements.push(`<key>aps-environment</key>`)
    entitlements.push(`<string>development</string>`)
  }
  
  if (capabilities.payments) {
    entitlements.push(`<key>com.apple.developer.in-app-payments</key>`)
    entitlements.push(`<array><string>merchant.${bundleId}</string></array>`)
  }
  
  if (capabilities.auth) {
    entitlements.push(`<key>com.apple.developer.associated-domains</key>`)
    entitlements.push(`<array><string>applinks:*.${bundleId.split('.').slice(-1)[0]}.com</string></array>`)
  }
  
  // Always include keychain for secure storage
  entitlements.push(`<key>keychain-access-groups</key>`)
  entitlements.push(`<array><string>$(AppIdentifierPrefix)${bundleId}</string></array>`)
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${entitlements.map(e => '  ' + e).join('\n')}
</dict>
</plist>
`
}

// ============================================
// Info.plist Permission Strings (Only enabled)
// ============================================

export function getRequiredPermissionStrings(
  capabilities: MobileCapabilities
): Record<string, string> {
  const permissions: Record<string, string> = {}
  
  if (capabilities.camera) {
    permissions['NSCameraUsageDescription'] = 'This app uses the camera to capture photos and videos.'
    permissions['NSPhotoLibraryUsageDescription'] = 'This app accesses your photo library to save and select photos.'
    permissions['NSPhotoLibraryAddUsageDescription'] = 'This app saves photos to your library.'
  }
  
  if (capabilities.location) {
    permissions['NSLocationWhenInUseUsageDescription'] = 'This app uses your location to provide location-based features.'
    permissions['NSLocationAlwaysAndWhenInUseUsageDescription'] = 'This app uses your location to provide location-based features even in the background.'
  }
  
  if (capabilities.biometrics) {
    permissions['NSFaceIDUsageDescription'] = 'This app uses Face ID for secure authentication.'
  }
  
  if (capabilities.push) {
    // Push doesn't require a permission string, but we note it
  }
  
  return permissions
}

// ============================================
// Export Summary (for validation display)
// ============================================

export function generateValidationSummary(result: ValidationResult): string {
  const lines: string[] = []
  
  if (result.valid) {
    lines.push('✅ Project is ready for export')
  } else {
    lines.push('❌ Project has issues that must be resolved')
  }
  
  lines.push('')
  lines.push(`Errors: ${result.stats.errors}`)
  lines.push(`Warnings: ${result.stats.warnings}`)
  lines.push(`Info: ${result.stats.info}`)
  
  if (result.issues.length > 0) {
    lines.push('')
    lines.push('Issues:')
    result.issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'
      lines.push(`${icon} ${issue.title}`)
    })
  }
  
  return lines.join('\n')
}
