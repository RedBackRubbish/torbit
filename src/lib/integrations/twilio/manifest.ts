/**
 * Twilio Integration Manifest
 * 
 * Category: Email (SMS/Voice)
 * Requires: Strategist + Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const twilioManifest: IntegrationManifest = {
  id: "twilio",
  name: "Twilio SMS & Voice",
  category: "email",
  platforms: ["web", "mobile"],
  version: "1.0.0",

  permissions: {
    network: [
      "api.twilio.com",
      "*.twilio.com",
    ],
    secrets: [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_PHONE_NUMBER",
    ],
    storage: false,
  },

  packages: {
    backend: {
      "twilio": "4.23.0",
    },
  },

  files: {
    backend: [
      "src/lib/twilio/client.ts",
      "src/lib/twilio/sms.ts",
      "src/app/api/sms/send/route.ts",
      "src/app/api/sms/webhook/route.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: true,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a Twilio account at twilio.com",
      "Get your Account SID and Auth Token from the console",
      "Purchase a phone number for SMS/Voice",
      "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to environment",
      "Configure webhook URL for incoming messages",
    ],
  },
};
