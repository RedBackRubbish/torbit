/**
 * Clerk Authentication Integration Manifest
 * 
 * Category: Auth
 * Requires: Strategist + Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const clerkManifest: IntegrationManifest = {
  id: "clerk",
  name: "Clerk Authentication",
  category: "auth",
  platforms: ["web", "mobile"],
  version: "1.0.0",

  permissions: {
    network: [
      "clerk.com",
      "*.clerk.accounts.dev",
      "api.clerk.com",
    ],
    secrets: [
      "CLERK_SECRET_KEY",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    ],
    storage: true,
  },

  packages: {
    frontend: {
      "@clerk/nextjs": "4.29.9",
    },
    backend: {
      "@clerk/backend": "0.38.4",
    },
    mobile: {
      "@clerk/clerk-expo": "0.20.8",
    },
  },

  files: {
    frontend: [
      "src/middleware.ts",
      "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx",
      "src/app/(auth)/sign-up/[[...sign-up]]/page.tsx",
      "src/components/auth/UserButton.tsx",
    ],
    backend: [
      "src/lib/auth/clerk.ts",
    ],
    mobile: [
      "src/lib/auth/clerk-expo.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: true,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a Clerk account at clerk.com",
      "Create an application in the Clerk Dashboard",
      "Copy your API keys from the Dashboard",
      "Add CLERK_SECRET_KEY to your server environment",
      "Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to your client environment",
      "Configure OAuth providers in Clerk Dashboard (optional)",
    ],
  },
};
