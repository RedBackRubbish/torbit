/**
 * Sentry Integration Manifest
 * 
 * Category: Analytics (Error Tracking)
 * Requires: User consent (data sent off-platform)
 * Secrets: Client-safe (DSN)
 */

import type { IntegrationManifest } from "../types";

export const sentryManifest: IntegrationManifest = {
  id: "sentry",
  name: "Sentry Error Tracking",
  category: "analytics",
  platforms: ["web", "mobile"],
  version: "1.0.0",

  permissions: {
    network: [
      "*.sentry.io",
      "*.ingest.sentry.io",
    ],
    secrets: [
      "SENTRY_DSN",
      "SENTRY_AUTH_TOKEN",
      "SENTRY_ORG",
      "SENTRY_PROJECT",
    ],
    storage: false,
  },

  packages: {
    frontend: {
      "@sentry/nextjs": "7.100.1",
    },
    mobile: {
      "@sentry/react-native": "5.18.0",
    },
  },

  files: {
    frontend: [
      "sentry.client.config.ts",
      "sentry.server.config.ts",
      "sentry.edge.config.ts",
      "src/app/global-error.tsx",
    ],
    backend: [
      "next.config.ts",
    ],
    mobile: [
      "src/lib/sentry/native.ts",
    ],
  },

  secretPolicy: "client-safe",
  requiresUserConsent: true,
  requiresStrategistReview: true,
  requiresAuditorReview: false,

  docs: {
    setupSteps: [
      "Create a Sentry account at sentry.io",
      "Create a new project for Next.js or React Native",
      "Get your DSN from the project settings",
      "Add SENTRY_DSN to environment (client-safe)",
      "Add SENTRY_AUTH_TOKEN for source map uploads",
      "Run: npx @sentry/wizard@latest -i nextjs",
    ],
  },
};
