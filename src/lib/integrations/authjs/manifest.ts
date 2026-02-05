/**
 * Auth.js Integration Manifest
 * 
 * Category: Auth
 * Requires: Strategist + Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const authJsManifest: IntegrationManifest = {
  id: "authjs",
  name: "Auth.js (NextAuth)",
  category: "auth",
  platforms: ["web"],
  version: "1.0.0",

  permissions: {
    network: [
      "accounts.google.com",
      "github.com",
      "api.github.com",
    ],
    secrets: [
      "AUTH_SECRET",
      "AUTH_GOOGLE_ID",
      "AUTH_GOOGLE_SECRET",
      "AUTH_GITHUB_ID",
      "AUTH_GITHUB_SECRET",
    ],
    storage: true,
  },

  packages: {
    frontend: {
      "next-auth": "5.0.0-beta.25",
    },
    backend: {
      "next-auth": "5.0.0-beta.25",
      "@auth/core": "0.34.2",
    },
  },

  files: {
    frontend: [
      "src/components/auth/SignInButton.tsx",
      "src/components/auth/SignOutButton.tsx",
      "src/components/auth/UserAvatar.tsx",
    ],
    backend: [
      "src/auth.ts",
      "src/app/api/auth/[...nextauth]/route.ts",
      "src/middleware.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: true,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Generate AUTH_SECRET with: openssl rand -base64 32",
      "Create OAuth app in Google Cloud Console (optional)",
      "Create OAuth app in GitHub Settings (optional)",
      "Add credentials to environment variables",
      "Configure allowed callback URLs in OAuth providers",
    ],
  },
};
