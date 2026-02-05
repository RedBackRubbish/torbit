/**
 * Mapbox Integration Manifest
 * 
 * Category: Maps
 * Requires: Strategist review
 * Secrets: Client-safe (API key)
 */

import type { IntegrationManifest } from "../types";

export const mapboxManifest: IntegrationManifest = {
  id: "mapbox",
  name: "Mapbox",
  category: "maps",
  platforms: ["web", "mobile"],
  version: "1.0.0",

  permissions: {
    network: [
      "api.mapbox.com",
      "*.tiles.mapbox.com",
      "events.mapbox.com",
    ],
    secrets: [
      "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
    ],
    storage: false,
  },

  packages: {
    frontend: {
      "mapbox-gl": "3.2.0",
      "react-map-gl": "7.1.7",
    },
    mobile: {
      "@rnmapbox/maps": "10.1.11",
    },
  },

  files: {
    frontend: [
      "src/lib/mapbox/client.ts",
      "src/components/maps/MapboxMap.tsx",
    ],
    mobile: [
      "src/components/maps/NativeMapbox.tsx",
    ],
  },

  secretPolicy: "client-safe",
  requiresUserConsent: true,
  requiresStrategistReview: true,
  requiresAuditorReview: false,

  docs: {
    setupSteps: [
      "Create a Mapbox account at mapbox.com",
      "Get your default public access token",
      "Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to environment",
      "Configure URL restrictions in Mapbox dashboard (recommended)",
    ],
  },
};
