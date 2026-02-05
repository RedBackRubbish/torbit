/**
 * Firebase Auth Integration Manifest
 * 
 * Category: Auth
 * Requires: Strategist + Auditor review
 * Secrets: Server-only (admin SDK)
 */

import type { IntegrationManifest } from "../types";

export const firebaseAuthManifest: IntegrationManifest = {
  id: "firebase-auth",
  name: "Firebase Authentication",
  category: "auth",
  platforms: ["web", "mobile"],
  version: "1.0.0",

  permissions: {
    network: [
      "*.firebaseapp.com",
      "*.googleapis.com",
      "securetoken.googleapis.com",
      "identitytoolkit.googleapis.com",
    ],
    secrets: [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    ],
    storage: true,
  },

  packages: {
    frontend: {
      "firebase": "10.8.1",
    },
    backend: {
      "firebase-admin": "12.0.0",
    },
    mobile: {
      "@react-native-firebase/app": "19.0.1",
      "@react-native-firebase/auth": "19.0.1",
    },
  },

  files: {
    frontend: [
      "src/lib/firebase/client.ts",
      "src/lib/firebase/auth.ts",
      "src/components/auth/FirebaseAuthProvider.tsx",
    ],
    backend: [
      "src/lib/firebase/admin.ts",
      "src/app/api/auth/verify/route.ts",
    ],
    mobile: [
      "src/lib/firebase/native.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: true,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a Firebase project at console.firebase.google.com",
      "Enable Authentication and choose sign-in methods",
      "Download service account key for server-side auth",
      "Copy web app config for client-side SDK",
      "Add all credentials to environment variables",
    ],
  },
};
