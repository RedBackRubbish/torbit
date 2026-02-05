/**
 * TORBIT - SDK Deprecation Registry
 * 
 * Tracks deprecated packages, sunset dates, and migration paths.
 * Updated manually based on vendor announcements.
 * 
 * This is a static registry. In production, this could be fetched
 * from a remote source or npm advisories API.
 */

export interface DeprecatedPackage {
  name: string
  deprecatedVersions: string      // Semver range that's deprecated
  sunsetDate?: string             // ISO date when support ends
  replacement?: string            // Recommended replacement package
  migrationGuide?: string         // URL to migration docs
  reason: string                  // Why it's deprecated
  severity: 'warning' | 'critical'
}

/**
 * Known deprecated packages in our integration ecosystem.
 * Keep this updated based on vendor announcements.
 */
export const DEPRECATED_PACKAGES: DeprecatedPackage[] = [
  // ============================================
  // AUTH
  // ============================================
  {
    name: 'next-auth',
    deprecatedVersions: '<5.0.0',
    replacement: '@auth/nextjs',
    migrationGuide: 'https://authjs.dev/getting-started/migrating-to-v5',
    reason: 'NextAuth v4 is deprecated. Migrate to Auth.js v5.',
    severity: 'warning',
  },

  // ============================================
  // FIREBASE
  // ============================================
  {
    name: 'firebase',
    deprecatedVersions: '<9.0.0',
    migrationGuide: 'https://firebase.google.com/docs/web/modular-upgrade',
    reason: 'Firebase v8 compat mode deprecated. Use modular v9+ imports.',
    severity: 'warning',
  },

  // ============================================
  // AWS
  // ============================================
  {
    name: 'aws-sdk',
    deprecatedVersions: '*',
    replacement: '@aws-sdk/client-s3',
    migrationGuide: 'https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating-to-v3.html',
    reason: 'AWS SDK v2 is deprecated. Use AWS SDK v3 modular clients.',
    severity: 'warning',
  },

  // ============================================
  // ANALYTICS
  // ============================================
  {
    name: 'analytics.js',
    deprecatedVersions: '*',
    replacement: '@segment/analytics-next',
    migrationGuide: 'https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/migration/',
    reason: 'Analytics.js classic is deprecated. Use Analytics.js 2.0.',
    severity: 'warning',
  },
  {
    name: 'universal-analytics',
    deprecatedVersions: '*',
    sunsetDate: '2024-07-01',
    replacement: '@google-analytics/data',
    migrationGuide: 'https://developers.google.com/analytics/devguides/migration',
    reason: 'Universal Analytics sunset. Migrate to GA4.',
    severity: 'critical',
  },

  // ============================================
  // PAYMENTS
  // ============================================
  {
    name: 'stripe',
    deprecatedVersions: '<12.0.0',
    migrationGuide: 'https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md',
    reason: 'Stripe SDK versions below 12 lack important security updates.',
    severity: 'warning',
  },

  // ============================================
  // EMAIL
  // ============================================
  {
    name: '@sendgrid/mail',
    deprecatedVersions: '<7.0.0',
    migrationGuide: 'https://github.com/sendgrid/sendgrid-nodejs/blob/main/CHANGELOG.md',
    reason: 'SendGrid v6 and below are unsupported.',
    severity: 'warning',
  },
  {
    name: 'nodemailer',
    deprecatedVersions: '<6.0.0',
    migrationGuide: 'https://nodemailer.com/about/changelog/',
    reason: 'Nodemailer v5 and below have known security issues.',
    severity: 'critical',
  },

  // ============================================
  // MAPS
  // ============================================
  {
    name: '@googlemaps/js-api-loader',
    deprecatedVersions: '<1.14.0',
    reason: 'Older versions have CSP compatibility issues.',
    severity: 'warning',
  },

  // ============================================
  // DATABASES
  // ============================================
  {
    name: 'pg',
    deprecatedVersions: '<8.0.0',
    migrationGuide: 'https://node-postgres.com/guides/upgrading',
    reason: 'pg v7 and below lack modern features and security patches.',
    severity: 'warning',
  },
  {
    name: 'mongodb',
    deprecatedVersions: '<5.0.0',
    migrationGuide: 'https://www.mongodb.com/docs/drivers/node/current/upgrade/',
    reason: 'MongoDB driver v4 and below are deprecated.',
    severity: 'warning',
  },

  // ============================================
  // MESSAGING
  // ============================================
  {
    name: 'twilio',
    deprecatedVersions: '<4.0.0',
    migrationGuide: 'https://www.twilio.com/docs/libraries/node#migration-guides',
    reason: 'Twilio SDK v3 is deprecated. Use v4+.',
    severity: 'warning',
  },

  // ============================================
  // MONITORING
  // ============================================
  {
    name: 'raven-js',
    deprecatedVersions: '*',
    replacement: '@sentry/browser',
    migrationGuide: 'https://docs.sentry.io/platforms/javascript/migration/',
    reason: 'Raven.js is deprecated. Use @sentry/browser.',
    severity: 'critical',
  },
  {
    name: 'raven',
    deprecatedVersions: '*',
    replacement: '@sentry/node',
    migrationGuide: 'https://docs.sentry.io/platforms/node/migration/',
    reason: 'Raven for Node is deprecated. Use @sentry/node.',
    severity: 'critical',
  },
]

/**
 * Check if a package version is deprecated
 */
export function checkDeprecation(
  packageName: string,
  version: string
): DeprecatedPackage | null {
  const deprecated = DEPRECATED_PACKAGES.find(
    (pkg) => pkg.name === packageName
  )
  
  if (!deprecated) return null
  
  // For simplicity, we do a basic version check
  // In production, use semver.satisfies()
  if (deprecated.deprecatedVersions === '*') {
    return deprecated
  }
  
  // Basic semver check for < ranges
  const match = deprecated.deprecatedVersions.match(/^<(\d+)\./)
  if (match) {
    const deprecatedMajor = parseInt(match[1], 10)
    const installedMajor = parseInt(version.split('.')[0], 10)
    if (installedMajor < deprecatedMajor) {
      return deprecated
    }
  }
  
  return null
}

/**
 * Get all deprecations for a list of packages
 */
export function getDeprecations(
  packages: { name: string; version: string }[]
): Array<{ package: string; version: string; deprecation: DeprecatedPackage }> {
  const deprecations: Array<{
    package: string
    version: string
    deprecation: DeprecatedPackage
  }> = []
  
  for (const pkg of packages) {
    const deprecation = checkDeprecation(pkg.name, pkg.version)
    if (deprecation) {
      deprecations.push({
        package: pkg.name,
        version: pkg.version,
        deprecation,
      })
    }
  }
  
  return deprecations
}
