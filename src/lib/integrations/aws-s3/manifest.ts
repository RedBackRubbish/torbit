/**
 * AWS S3 Integration Manifest
 * 
 * Category: Storage
 * Requires: Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const s3Manifest: IntegrationManifest = {
  id: "aws-s3",
  name: "AWS S3 Storage",
  category: "storage",
  platforms: ["web"],
  version: "1.0.0",

  permissions: {
    network: [
      "*.s3.amazonaws.com",
      "*.s3.*.amazonaws.com",
      "s3.amazonaws.com",
    ],
    secrets: [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
      "AWS_S3_BUCKET",
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
      "src/lib/storage/s3.ts",
      "src/lib/storage/presigned-urls.ts",
      "src/app/api/upload/presign/route.ts",
      "src/app/api/upload/complete/route.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: false,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create an AWS account and S3 bucket",
      "Create an IAM user with S3 access",
      "Configure CORS on your bucket for uploads",
      "Add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY to environment",
      "Add AWS_REGION and AWS_S3_BUCKET",
      "Consider using IAM roles in production",
    ],
  },
};
