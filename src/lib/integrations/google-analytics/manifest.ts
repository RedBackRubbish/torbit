/**
 * Google Analytics Integration Manifest
 * 
 * Category: Analytics
 * Requires: User consent (data sent off-platform)
 * Secrets: Client-safe
 */

import type { IntegrationManifest } from "../types";

export const googleAnalyticsManifest: IntegrationManifest = {
  id: "google-analytics",
  name: "Google Analytics",
  category: "analytics",
  platforms: ["web", "mobile"],
  version: "1.0.0",

  permissions: {
    network: [
      "www.google-analytics.com",
      "analytics.google.com",
      "www.googletagmanager.com",
    ],
    secrets: [
      "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    ],
    storage: true,
  },

  packages: {
    frontend: {
      "@next/third-parties": "14.1.0",
    },
    mobile: {
      "@react-native-firebase/analytics": "19.0.1",
    },
  },

  files: {
    frontend: [
      "src/lib/analytics/google.ts",
      "src/components/analytics/GoogleAnalytics.tsx",
    ],
    mobile: [
      "src/lib/analytics/native-ga.ts",
    ],
  },

  secretPolicy: "client-safe",
  requiresUserConsent: true,
  requiresStrategistReview: true,
  requiresAuditorReview: false,

  docs: {
    setupSteps: [
      "Create a Google Analytics 4 property",
      "Get your Measurement ID (G-XXXXXXXXXX)",
      "Add NEXT_PUBLIC_GA_MEASUREMENT_ID to environment",
      "Ensure privacy policy covers analytics data collection",
      "Consider implementing cookie consent for GDPR compliance",
    ],
  },
};
