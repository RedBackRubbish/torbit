/**
 * Neon Database Integration Manifest
 * 
 * Category: Storage
 * Requires: Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const neonManifest: IntegrationManifest = {
  id: "neon",
  name: "Neon Postgres",
  category: "storage",
  platforms: ["web"],
  version: "1.0.0",

  permissions: {
    network: [
      "*.neon.tech",
      "*.neondb.io",
    ],
    secrets: [
      "DATABASE_URL",
      "NEON_DATABASE_URL",
    ],
    storage: true,
  },

  packages: {
    backend: {
      "@neondatabase/serverless": "0.9.0",
      "drizzle-orm": "0.29.4",
      "drizzle-kit": "0.20.14",
    },
  },

  files: {
    backend: [
      "src/lib/db/index.ts",
      "src/lib/db/schema.ts",
      "src/lib/db/migrate.ts",
      "drizzle.config.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: false,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a Neon account at neon.tech",
      "Create a new project and database",
      "Copy the connection string from the dashboard",
      "Add DATABASE_URL to your environment variables",
      "Run migrations with: npx drizzle-kit push",
    ],
  },
};
