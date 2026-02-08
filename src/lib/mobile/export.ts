/**
 * TORBIT Mobile - Export Service
 * Generates store-ready iOS + Android export bundles
 */

import type { MobileCapabilities, MobileProjectConfig } from './types'

// ============================================
// Export Bundle Types
// ============================================

export interface ExportBundle {
  files: ExportFile[]
  metadata: ExportMetadata
}

export interface ExportFile {
  path: string
  content: string
}

export interface ExportMetadata {
  appName: string
  bundleId: string
  version: string
  buildNumber: number
  platforms: string[]
  capabilities: string[]
  exportedAt: string
  torbitVersion: string
}

// ============================================
// Generate Export Bundle
// ============================================

export function generateExportBundle(
  projectFiles: ExportFile[],
  config: MobileProjectConfig
): ExportBundle {
  const files: ExportFile[] = []
  const hasEasConfig = projectFiles.some((file) => normalizeExportPath(file.path) === 'eas.json')
  
  // 1. Add all project files
  projectFiles.forEach(file => {
    files.push({
      path: file.path,
      content: file.content,
    })
  })
  
  // 2. Add README-SIGNING.md
  files.push({
    path: 'README-SIGNING.md',
    content: generateSigningReadme(config),
  })
  
  // 3. Add SUBMISSION-CHECKLIST.md
  files.push({
    path: 'SUBMISSION-CHECKLIST.md',
    content: generateSubmissionChecklist(config),
  })

  // 4. Add README-ANDROID.md (if Android platform enabled)
  if (config.platforms.includes('android')) {
    files.push({
      path: 'README-ANDROID.md',
      content: generateAndroidReadme(config),
    })

    files.push({
      path: 'PLAY-STORE-CHECKLIST.md',
      content: generatePlayStoreChecklist(config),
    })
  }

  // 5. Add README-MOBILE-PIPELINE.md
  files.push({
    path: 'README-MOBILE-PIPELINE.md',
    content: generateMobilePipelineReadme(config),
  })

  // 6. Add eas.json defaults if missing
  if (!hasEasConfig) {
    files.push({
      path: 'eas.json',
      content: generateEasConfig(config),
    })
  }
  
  // 7. Add APP-METADATA.json
  const metadata: ExportMetadata = {
    appName: config.appName,
    bundleId: config.bundleId,
    version: config.version,
    buildNumber: config.buildNumber,
    platforms: config.platforms,
    capabilities: Object.entries(config.capabilities)
      .filter(([_, enabled]) => enabled)
      .map(([cap]) => cap),
    exportedAt: new Date().toISOString(),
    torbitVersion: '1.0.0',
  }
  
  files.push({
    path: 'APP-METADATA.json',
    content: JSON.stringify(metadata, null, 2),
  })
  
  // 8. Add .env.example
  files.push({
    path: '.env.example',
    content: generateEnvExample(config),
  })
  
  return { files, metadata }
}

function normalizeExportPath(filePath: string): string {
  return filePath.replace(/^\/+/, '').replace(/\\/g, '/').replace(/\/{2,}/g, '/')
}

// ============================================
// README-SIGNING.md Generator
// ============================================

function generateSigningReadme(config: MobileProjectConfig): string {
  return `# ${config.appName} - iOS Signing Guide

## Prerequisites

- **macOS** with Xcode 15+ installed
- **Apple Developer Account** (free or paid)
- **Node.js 18+** and npm installed

---

## Step 1: Install Dependencies

\`\`\`bash
# Install npm dependencies
npm install

# Install iOS dependencies
npx expo prebuild --platform ios
cd ios && pod install && cd ..
\`\`\`

---

## Step 2: Open in Xcode

\`\`\`bash
open ios/${config.bundleId.split('.').pop() || 'app'}.xcworkspace
\`\`\`

> ⚠️ Always open the **.xcworkspace** file, not .xcodeproj

---

## Step 3: Configure Signing

1. Select the project in the left sidebar
2. Select the main target (not "Tests")
3. Go to **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. Select your **Team** from the dropdown
6. Update **Bundle Identifier** to your own (e.g., \`com.yourcompany.${config.bundleId.split('.').pop()}\`)

---

## Step 4: Build & Run

### Simulator
1. Select a simulator from the device dropdown (e.g., "iPhone 15 Pro")
2. Press **⌘ + R** or click the Play button

### Physical Device
1. Connect your iPhone via USB
2. Trust your computer on the device
3. Select your device from the dropdown
4. Press **⌘ + R**

> First build on device requires your Apple ID to be trusted in Settings → General → Device Management

---

## Step 5: Archive for App Store

1. Select **"Any iOS Device (arm64)"** as the build target
2. Go to **Product → Archive**
3. Once complete, the Organizer window opens
4. Click **"Distribute App"**
5. Follow the prompts for App Store Connect

---

## Troubleshooting

### "No signing certificate found"
→ Sign in to Xcode with your Apple ID (Xcode → Settings → Accounts)

### "Bundle ID is not available"
→ Change the Bundle Identifier to something unique

### "Pod install failed"
\`\`\`bash
cd ios
pod deintegrate
pod install --repo-update
\`\`\`

### "Build failed with module errors"
\`\`\`bash
cd ios
rm -rf Pods Podfile.lock
pod install
\`\`\`

---

## Need Help?

- [Expo iOS Deployment Guide](https://docs.expo.dev/build/setup/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

*Generated by TORBIT on ${new Date().toLocaleDateString()}*
`
}

// ============================================
// SUBMISSION-CHECKLIST.md Generator
// ============================================

function generateSubmissionChecklist(config: MobileProjectConfig): string {
  const enabledCapabilities = Object.entries(config.capabilities)
    .filter(([_, enabled]) => enabled)
    .map(([cap]) => cap as keyof MobileCapabilities)
  
  let checklist = `# ${config.appName} - App Store Submission Checklist

## App Information

- **App Name:** ${config.appName}
- **Bundle ID:** ${config.bundleId}
- **Version:** ${config.version}
- **Build Number:** ${config.buildNumber}
- **Minimum iOS:** ${config.minIosVersion}

---

## Pre-Submission Requirements

### ✅ Apple Developer Account
- [ ] Enrolled in Apple Developer Program ($99/year for App Store)
- [ ] App ID created in Apple Developer Portal
- [ ] Certificates and provisioning profiles configured

### ✅ App Store Connect Setup
- [ ] App created in App Store Connect
- [ ] App Information completed (name, subtitle, category)
- [ ] Pricing and availability configured
- [ ] App Privacy policy URL added

### ✅ Required Assets
- [ ] App Icon (1024x1024, no alpha channel)
- [ ] Screenshots for required device sizes:
  - [ ] iPhone 6.7" (1290 x 2796)
  - [ ] iPhone 6.5" (1284 x 2778)
  - [ ] iPhone 5.5" (1242 x 2208)
- [ ] App Preview videos (optional but recommended)

---

## Privacy & Permissions

`

  // Add capability-specific requirements
  if (enabledCapabilities.includes('camera')) {
    checklist += `### 📷 Camera Usage
- [ ] Added \`NSCameraUsageDescription\` in Info.plist
- [ ] Added \`NSPhotoLibraryUsageDescription\` in Info.plist
- [ ] Explain camera use in App Privacy section

`
  }

  if (enabledCapabilities.includes('location')) {
    checklist += `### 📍 Location Services
- [ ] Added \`NSLocationWhenInUseUsageDescription\` in Info.plist
- [ ] Added \`NSLocationAlwaysUsageDescription\` if using background location
- [ ] Justify location use in App Review notes

`
  }

  if (enabledCapabilities.includes('push')) {
    checklist += `### 🔔 Push Notifications
- [ ] APNs Key created in Apple Developer Portal
- [ ] Push notification capability enabled in Xcode
- [ ] Backend configured to send push notifications

`
  }

  if (enabledCapabilities.includes('biometrics')) {
    checklist += `### 🔐 Face ID / Touch ID
- [ ] Added \`NSFaceIDUsageDescription\` in Info.plist
- [ ] Provide fallback authentication method

`
  }

  if (enabledCapabilities.includes('payments')) {
    checklist += `### 💳 In-App Purchases
- [ ] In-App Purchase capability enabled
- [ ] Products created in App Store Connect
- [ ] Sandbox testing completed
- [ ] Tax and banking information configured
- [ ] Review App Store Guidelines 3.1 (Payments)

`
  }

  if (enabledCapabilities.includes('auth')) {
    checklist += `### 🔑 Authentication
- [ ] Privacy Policy URL provided
- [ ] Account deletion functionality implemented (required)
- [ ] Sign in with Apple implemented (if using social login)

`
  }

  checklist += `---

## App Review Preparation

### ✅ Review Guidelines Compliance
- [ ] Read [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [ ] No placeholder content or "lorem ipsum"
- [ ] All features functional and complete
- [ ] No references to other platforms (Android, etc.)

### ✅ Demo Account (if applicable)
- [ ] Provide test account credentials in App Review notes
- [ ] Ensure test account has access to all features

### ✅ Review Notes
- [ ] Explain any non-obvious functionality
- [ ] Provide context for any permission requests
- [ ] Include any special instructions for reviewers

---

## Final Checks

- [ ] Tested on physical device
- [ ] All analytics and crash reporting configured
- [ ] No debug code or test servers in production
- [ ] Version and build numbers incremented
- [ ] Archive builds successfully
- [ ] Validated in Xcode Organizer

---

## Submission

1. Archive the app in Xcode (Product → Archive)
2. Validate the archive in Organizer
3. Upload to App Store Connect
4. Complete App Store listing
5. Submit for Review

---

*Generated by TORBIT on ${new Date().toLocaleDateString()}*
`

  return checklist
}

// ============================================
// README-ANDROID.md Generator
// ============================================

function generateAndroidReadme(config: MobileProjectConfig): string {
  return `# ${config.appName} - Android Release Guide

## Prerequisites

- **Google Play Console** account
- **Expo account** with \`EXPO_TOKEN\` configured
- **Java 17** and Android SDK (for local builds)

---

## Build Android with EAS

\`\`\`bash
npm install
npx eas login
npx eas build --platform android --profile production --auto-submit-with-profile android-internal --non-interactive
\`\`\`

This queues a production Android build and submits it to the Play Console internal track.

---

## Track Options

- \`android-internal\` -> Internal testing
- \`android-alpha\` -> Closed testing alpha
- \`android-beta\` -> Closed testing beta
- \`android-production\` -> Production rollout

Update \`submit\` profiles in \`eas.json\` if you need different tracks.

---

## If You Need an AAB Locally

\`\`\`bash
npx expo prebuild --platform android
cd android
./gradlew bundleRelease
\`\`\`

The resulting bundle is at:
\`android/app/build/outputs/bundle/release/app-release.aab\`

---

## Need Help?

- [Expo Android Build Docs](https://docs.expo.dev/build-reference/apk/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)

---

*Generated by TORBIT on ${new Date().toLocaleDateString()}*
`
}

// ============================================
// PLAY-STORE-CHECKLIST.md Generator
// ============================================

function generatePlayStoreChecklist(config: MobileProjectConfig): string {
  const enabledCapabilities = Object.entries(config.capabilities)
    .filter(([_, enabled]) => enabled)
    .map(([cap]) => cap as keyof MobileCapabilities)

  let checklist = `# ${config.appName} - Google Play Submission Checklist

## App Information

- **Application ID:** ${config.bundleId}
- **Version:** ${config.version}
- **Version Code:** ${config.buildNumber}

---

## Play Console Setup

- [ ] Play Console app created
- [ ] App content form completed
- [ ] Data safety form completed
- [ ] Privacy policy URL configured
- [ ] Contact details configured

---

## Assets

- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Minimum 2 phone screenshots
- [ ] Optional tablet screenshots

---

## Quality Gates

- [ ] Internal testing track validated
- [ ] Crash-free smoke test completed
- [ ] No placeholder text or test endpoints
- [ ] Release notes prepared

`

  if (enabledCapabilities.includes('camera')) {
    checklist += `### Camera
- [ ] Camera permission rationale is clear in-app
- [ ] Privacy policy explains media usage

`
  }

  if (enabledCapabilities.includes('location')) {
    checklist += `### Location
- [ ] Location usage is justified in Play Console declarations
- [ ] Foreground/background behavior is documented

`
  }

  if (enabledCapabilities.includes('payments')) {
    checklist += `### Payments
- [ ] Google Play Billing used for digital goods
- [ ] External payment links comply with regional policies

`
  }

  checklist += `---

## Release

1. Build with \`npx eas build --platform android --profile production\`
2. Submit with \`npx eas submit --platform android --latest --profile android-internal\`
3. Promote track after QA approval

---

*Generated by TORBIT on ${new Date().toLocaleDateString()}*
`

  return checklist
}

// ============================================
// README-MOBILE-PIPELINE.md Generator
// ============================================

function generateMobilePipelineReadme(config: MobileProjectConfig): string {
  const hasAndroid = config.platforms.includes('android')

  return `# ${config.appName} - Mobile Release Pipeline

This export includes a complete store pipeline:
- iOS TestFlight queueing
- iOS App Store Connect submission
${hasAndroid ? '- Android Play Console submission' : '- Android support can be enabled in project settings'}

---

## Environment Variables

- \`EXPO_TOKEN\` (required)
- \`APPLE_APP_SPECIFIC_PASSWORD\` (for iOS submit)
- \`ASC_API_KEY_PATH\`, \`ASC_API_KEY_ID\`, \`ASC_API_KEY_ISSUER_ID\` (optional App Store Connect API auth)
- \`GOOGLE_SERVICE_ACCOUNT_JSON\` (for Android submit)

---

## Quick Commands

\`\`\`bash
# Queue iOS build and auto-submit to TestFlight
npx eas build --platform ios --profile production --auto-submit-with-profile testflight --non-interactive

# Queue iOS build and auto-submit to App Store Connect
npx eas build --platform ios --profile production --auto-submit-with-profile appstore --non-interactive

${hasAndroid ? `# Queue Android build and auto-submit to internal track
npx eas build --platform android --profile production --auto-submit-with-profile android-internal --non-interactive` : '# Enable Android platform to unlock Play Console pipeline'}
\`\`\`

---

## Pipeline Files

- \`eas.json\` -> Build + submit profiles
- \`README-SIGNING.md\` -> iOS signing path
- \`SUBMISSION-CHECKLIST.md\` -> iOS submission quality gates
${hasAndroid ? '- `README-ANDROID.md` -> Android build/release guide\n- `PLAY-STORE-CHECKLIST.md` -> Android release quality gates' : ''}

---

*Generated by TORBIT on ${new Date().toLocaleDateString()}*
`
}

// ============================================
// eas.json Generator
// ============================================

function generateEasConfig(config: MobileProjectConfig): string {
  const easConfig: Record<string, unknown> = {
    cli: {
      version: '>= 10.0.0',
    },
    build: {
      preview: {
        distribution: 'internal',
      },
      production: {
        autoIncrement: true,
      },
    },
    submit: {
      testflight: {
        ios: {},
      },
      appstore: {
        ios: {},
      },
      'android-internal': {
        android: {
          track: 'internal',
          releaseStatus: 'draft',
        },
      },
      'android-alpha': {
        android: {
          track: 'alpha',
          releaseStatus: 'draft',
        },
      },
      'android-beta': {
        android: {
          track: 'beta',
          releaseStatus: 'draft',
        },
      },
      'android-production': {
        android: {
          track: 'production',
        },
      },
    },
  }

  if (!config.platforms.includes('android')) {
    const submit = easConfig.submit as Record<string, unknown>
    delete submit['android-internal']
    delete submit['android-alpha']
    delete submit['android-beta']
    delete submit['android-production']
  }

  return `${JSON.stringify(easConfig, null, 2)}\n`
}

// ============================================
// .env.example Generator
// ============================================

function generateEnvExample(config: MobileProjectConfig): string {
  let env = `# ${config.appName} - Environment Variables
# Copy this file to .env and fill in your values

# App Configuration
EXPO_PUBLIC_APP_NAME="${config.appName}"
EXPO_PUBLIC_BUNDLE_ID="${config.bundleId}"

# Mobile Release Pipeline
# EXPO_TOKEN=your_expo_access_token
# APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
# ASC_API_KEY_ID=AB12C3D4E5
# ASC_API_KEY_ISSUER_ID=00000000-0000-0000-0000-000000000000
# ASC_API_KEY_PATH=./AuthKey_AB12C3D4E5.p8
# GOOGLE_SERVICE_ACCOUNT_JSON=./google-service-account.json

`

  const capabilities = config.capabilities

  if (capabilities.auth) {
    env += `# Authentication
# EXPO_PUBLIC_AUTH_PROVIDER=clerk|auth0|supabase
# EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
# EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx

`
  }

  if (capabilities.push) {
    env += `# Push Notifications
# EXPO_PUBLIC_PUSH_PROJECT_ID=xxx

`
  }

  if (capabilities.payments) {
    env += `# In-App Purchases
# Revenue Cat, or native StoreKit
# EXPO_PUBLIC_REVENUECAT_API_KEY=xxx

`
  }

  if (capabilities.storage) {
    env += `# Cloud Storage
# EXPO_PUBLIC_STORAGE_BUCKET=xxx

`
  }

  env += `# API Configuration
# EXPO_PUBLIC_API_URL=https://api.example.com
`

  return env
}

// ============================================
// Create ZIP (Browser-compatible)
// ============================================

export async function createExportZip(bundle: ExportBundle): Promise<Blob> {
  // We'll use JSZip for this - it works in both browser and Node
  const { default: JSZip } = await import('jszip')
  
  const zip = new JSZip()
  
  // Add all files to the zip
  bundle.files.forEach(file => {
    zip.file(file.path, file.content)
  })
  
  // Generate the zip blob
  const blob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  })
  
  return blob
}

// ============================================
// Trigger Download
// ============================================

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
