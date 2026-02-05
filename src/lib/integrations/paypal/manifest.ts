/**
 * PayPal Integration Manifest
 * 
 * Category: Payments
 * Requires: Strategist + Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const paypalManifest: IntegrationManifest = {
  id: "paypal",
  name: "PayPal Payments",
  category: "payments",
  platforms: ["web", "mobile"],
  version: "1.0.0",

  permissions: {
    network: [
      "api.paypal.com",
      "api-m.paypal.com",
      "api.sandbox.paypal.com",
      "www.paypal.com",
    ],
    secrets: [
      "PAYPAL_CLIENT_ID",
      "PAYPAL_CLIENT_SECRET",
    ],
    storage: false,
  },

  packages: {
    frontend: {
      "@paypal/react-paypal-js": "8.1.3",
    },
    backend: {
      "@paypal/checkout-server-sdk": "1.0.3",
    },
    mobile: {
      "@paypal/react-paypal-js": "8.1.3",
    },
  },

  files: {
    frontend: [
      "src/lib/paypal/client.ts",
      "src/components/payments/PayPalButton.tsx",
      "src/components/payments/PayPalProvider.tsx",
    ],
    backend: [
      "src/lib/paypal/server.ts",
      "src/app/api/paypal/create-order/route.ts",
      "src/app/api/paypal/capture-order/route.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: true,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a PayPal Developer account",
      "Create an app in the PayPal Developer Dashboard",
      "Get your Client ID and Secret from the app credentials",
      "Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to environment",
      "Use sandbox credentials for testing",
    ],
  },
};
