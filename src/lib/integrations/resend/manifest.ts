/**
 * Resend Integration Manifest
 * 
 * Category: Email
 * Requires: Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const resendManifest: IntegrationManifest = {
  id: "resend",
  name: "Resend Email",
  category: "email",
  platforms: ["web"],
  version: "1.0.0",

  permissions: {
    network: [
      "api.resend.com",
    ],
    secrets: [
      "RESEND_API_KEY",
      "RESEND_FROM_EMAIL",
    ],
    storage: false,
  },

  packages: {
    backend: {
      "resend": "3.2.0",
      "@react-email/components": "0.0.15",
    },
  },

  files: {
    backend: [
      "src/lib/email/resend.ts",
      "src/emails/WelcomeEmail.tsx",
      "src/app/api/email/send/route.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: false,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a Resend account at resend.com",
      "Add and verify your domain",
      "Create an API key",
      "Add RESEND_API_KEY to environment",
      "Add RESEND_FROM_EMAIL with your verified domain",
    ],
  },
};
