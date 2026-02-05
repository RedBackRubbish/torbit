/**
 * Slack Integration Manifest
 * 
 * Category: Email (Messaging)
 * Requires: Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const slackManifest: IntegrationManifest = {
  id: "slack",
  name: "Slack Notifications",
  category: "email",
  platforms: ["web"],
  version: "1.0.0",

  permissions: {
    network: [
      "hooks.slack.com",
      "slack.com",
      "api.slack.com",
    ],
    secrets: [
      "SLACK_WEBHOOK_URL",
      "SLACK_BOT_TOKEN",
    ],
    storage: false,
  },

  packages: {
    backend: {
      "@slack/web-api": "7.0.2",
      "@slack/webhook": "7.0.2",
    },
  },

  files: {
    backend: [
      "src/lib/slack/client.ts",
      "src/lib/slack/notifications.ts",
      "src/app/api/slack/notify/route.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: false,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a Slack app at api.slack.com/apps",
      "Add Incoming Webhooks feature",
      "Create a webhook for your channel",
      "Add SLACK_WEBHOOK_URL to environment",
      "Optionally add SLACK_BOT_TOKEN for advanced features",
    ],
  },
};
