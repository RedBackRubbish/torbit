/**
 * Firebase (Firestore + Realtime DB) Integration Manifest
 * 
 * Category: Storage
 * Requires: Auditor review
 * Secrets: Server-only (admin SDK)
 */

import type { IntegrationManifest } from "../types";

export const firebaseManifest: IntegrationManifest = {
  id: "firebase",
  name: "Firebase Database",
  category: "storage",
  platforms: ["web", "mobile"],
  version: "1.0.0",

  permissions: {
    network: [
      "*.firebaseio.com",
      "*.firebaseapp.com",
      "*.googleapis.com",
    ],
    secrets: [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
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
      "@react-native-firebase/firestore": "19.0.1",
    },
  },

  files: {
    frontend: [
      "src/lib/firebase/client.ts",
      "src/lib/firebase/firestore.ts",
      "src/hooks/useFirestore.ts",
    ],
    backend: [
      "src/lib/firebase/admin.ts",
      "src/lib/firebase/firestore-admin.ts",
    ],
    mobile: [
      "src/lib/firebase/native-firestore.ts",
    ],
  },

  secretPolicy: "server-only",
  requiresUserConsent: true,
  requiresStrategistReview: false,
  requiresAuditorReview: true,

  docs: {
    setupSteps: [
      "Create a Firebase project at console.firebase.google.com",
      "Enable Firestore or Realtime Database",
      "Download service account key for admin SDK",
      "Copy web app config for client SDK",
      "Configure security rules in Firebase Console",
    ],
  },
};
