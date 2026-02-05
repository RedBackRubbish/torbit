/**
 * Stripe Integration Manifest
 * 
 * Category: Payments
 * Requires: Strategist + Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const stripeManifest: IntegrationManifest = {
  id: "stripe",
  name: "Stripe Payments",
  category: "payments",
  platforms: ["web", "mobile"],
  version: "1.0.0",

  permissions: {
    network: [
      "api.stripe.com",
      "js.stripe.com",
      "m.stripe.network",
    ],
    secrets: [
      "STRIPE_SECRET_KEY",
      "STRIPE_PUBLISHABLE_KEY",
    ],
    storage: false,
  },

  packages: {
    frontend: {
      "@stripe/stripe-js": "3.0.7",
      "@stripe/react-stripe-js": "2.5.1",
    },
    backend: {
      "stripe": "14.21.0",
    },
    mobile: {
      "@stripe/stripe-react-native": "0.35.0",
    },
  },

  files: {
    frontend: [
      "src/lib/stripe/client.ts",
      "src/components/payments/CheckoutForm.tsx",
    ],
    backend: [
      "src/app/api/stripe/create-checkout/route.ts",
      "src/app/api/stripe/webhook/route.ts",
      "src/lib/stripe/server.ts",
    ],
    mobile: [
      "src/lib/stripe/native.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: true,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a Stripe account at stripe.com",
      "Get your API keys from the Stripe Dashboard",
      "Add STRIPE_SECRET_KEY to your server environment",
      "Add STRIPE_PUBLISHABLE_KEY to your client environment",
      "Configure webhook endpoint in Stripe Dashboard",
    ],
  },
};
