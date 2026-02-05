/**
 * Supabase Integration Manifest
 * 
 * Category: Storage
 * Requires: Auditor review
 * Secrets: Server-only
 */

import type { IntegrationManifest } from "../types";

export const supabaseManifest: IntegrationManifest = {
  id: "supabase",
  name: "Supabase Database",
  category: "storage",
  platforms: ["web"],
  version: "1.0.0",

  permissions: {
    network: [
      "*.supabase.co",
      "supabase.com",
    ],
    secrets: [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
    storage: true,
  },

  packages: {
    frontend: {
      "@supabase/supabase-js": "2.39.7",
      "@supabase/ssr": "0.1.0",
    },
    backend: {
      "@supabase/supabase-js": "2.39.7",
    },
  },

  files: {
    frontend: [
      "src/lib/supabase/client.ts",
      "src/lib/supabase/middleware.ts",
    ],
    backend: [
      "src/lib/supabase/server.ts",
      "src/lib/supabase/admin.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: false,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a Supabase account at supabase.com",
      "Create a new project",
      "Copy your project URL and API keys",
      "Add SUPABASE_URL to your environment",
      "Add SUPABASE_ANON_KEY for client-side access",
      "Add SUPABASE_SERVICE_ROLE_KEY for server-side admin access",
    ],
  },
};
