/**
 * SendGrid Integration Manifest
 * 
 * Category: Email
 * Requires: Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const sendgridManifest: IntegrationManifest = {
  id: "sendgrid",
  name: "SendGrid Email",
  category: "email",
  platforms: ["web"],
  version: "1.0.0",

  permissions: {
    network: [
      "api.sendgrid.com",
    ],
    secrets: [
      "SENDGRID_API_KEY",
      "SENDGRID_FROM_EMAIL",
    ],
    storage: false,
  },

  packages: {
    backend: {
      "@sendgrid/mail": "8.1.1",
    },
  },

  files: {
    backend: [
      "src/lib/email/sendgrid.ts",
      "src/lib/email/templates.ts",
      "src/app/api/email/send/route.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: false,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a SendGrid account at sendgrid.com",
      "Verify your sender identity (email or domain)",
      "Create an API key with Mail Send permissions",
      "Add SENDGRID_API_KEY to environment",
      "Add SENDGRID_FROM_EMAIL with your verified sender",
    ],
  },
};
