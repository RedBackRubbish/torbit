/**
 * PostHog Integration Manifest
 * 
 * Category: Analytics
 * Requires: User consent (data sent off-platform)
 * Secrets: Client-safe
 */

import type { IntegrationManifest } from "../types";

export const posthogManifest: IntegrationManifest = {
  id: "posthog",
  name: "PostHog Analytics",
  category: "analytics",
  platforms: ["web", "mobile"],
  version: "1.0.0",

  permissions: {
    network: [
      "app.posthog.com",
      "us.posthog.com",
      "eu.posthog.com",
    ],
    secrets: [
      "NEXT_PUBLIC_POSTHOG_KEY",
      "NEXT_PUBLIC_POSTHOG_HOST",
    ],
    storage: true,
  },

  packages: {
    frontend: {
      "posthog-js": "1.103.1",
    },
    mobile: {
      "posthog-react-native": "3.0.0",
    },
  },

  files: {
    frontend: [
      "src/lib/analytics/posthog.ts",
      "src/components/analytics/PostHogProvider.tsx",
    ],
    mobile: [
      "src/lib/analytics/native-posthog.ts",
    ],
  },

  secretPolicy: "client-safe",
  requiresUserConsent: true,
  requiresStrategistReview: true,
  requiresAuditorReview: false,

  docs: {
    setupSteps: [
      "Create a PostHog account at posthog.com",
      "Create a new project",
      "Get your Project API Key",
      "Add NEXT_PUBLIC_POSTHOG_KEY to environment",
      "Add NEXT_PUBLIC_POSTHOG_HOST (app.posthog.com or your self-hosted URL)",
    ],
  },
};
