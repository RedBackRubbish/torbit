/**
 * Google Maps Integration Manifest
 * 
 * Category: Maps
 * Requires: Strategist review
 * Secrets: Client-safe (API key)
 */

import type { IntegrationManifest } from "../types";

export const googleMapsManifest: IntegrationManifest = {
  id: "google-maps",
  name: "Google Maps",
  category: "maps",
  platforms: ["web", "mobile"],
  version: "1.0.0",

  permissions: {
    network: [
      "maps.googleapis.com",
      "maps.google.com",
    ],
    secrets: [
      "GOOGLE_MAPS_API_KEY",
    ],
    storage: false,
  },

  packages: {
    frontend: {
      "@googlemaps/js-api-loader": "1.16.2",
      "@react-google-maps/api": "2.19.3",
    },
    mobile: {
      "react-native-maps": "1.10.3",
    },
  },

  files: {
    frontend: [
      "src/lib/maps/google.ts",
      "src/components/maps/GoogleMap.tsx",
    ],
    mobile: [
      "src/components/maps/NativeMap.tsx",
    ],
  },

  secretPolicy: "client-safe",
  requiresUserConsent: true,
  requiresStrategistReview: true,
  requiresAuditorReview: false,

  docs: {
    setupSteps: [
      "Create a Google Cloud project",
      "Enable Maps JavaScript API",
      "Create an API key with appropriate restrictions",
      "Add GOOGLE_MAPS_API_KEY to your environment",
    ],
  },
};
