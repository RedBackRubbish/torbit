/**
 * Cloudflare R2 Integration Manifest
 * 
 * Category: Storage
 * Requires: Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const r2Manifest: IntegrationManifest = {
  id: "cloudflare-r2",
  name: "Cloudflare R2 Storage",
  category: "storage",
  platforms: ["web"],
  version: "1.0.0",

  permissions: {
    network: [
      "*.r2.cloudflarestorage.com",
      "*.r2.dev",
    ],
    secrets: [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ],
    storage: true,
  },

  packages: {
    backend: {
      "@aws-sdk/client-s3": "3.525.0",
      "@aws-sdk/s3-request-presigner": "3.525.0",
    },
  },

  files: {
    backend: [
      "src/lib/storage/r2.ts",
      "src/lib/storage/presigned-urls.ts",
      "src/app/api/upload/presign/route.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: false,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a Cloudflare account",
      "Enable R2 and create a bucket",
      "Create R2 API tokens in the dashboard",
      "Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY to environment",
      "Add R2_BUCKET_NAME",
      "Configure CORS rules if needed for direct uploads",
    ],
  },
};
