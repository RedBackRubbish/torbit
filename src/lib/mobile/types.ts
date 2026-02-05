/**
 * TORBIT Mobile - Type Definitions
 * Core types for mobile app building
 */

// ============================================
// Project Types
// ============================================

export type ProjectType = 'web' | 'mobile'
export type MobileStack = 'expo-rn'  // Future: 'swiftui' | 'flutter'
export type Platform = 'ios' | 'android'

// ============================================
// Capabilities - Feature Flags for Mobile
// ============================================

export interface MobileCapabilities {
  auth: boolean
  camera: boolean
  push: boolean
  payments: boolean
  storage: boolean
  location: boolean
  biometrics: boolean
  haptics: boolean
}

export const DEFAULT_CAPABILITIES: MobileCapabilities = {
  auth: false,
  camera: false,
  push: false,
  payments: false,
  storage: false,
  location: false,
  biometrics: false,
  haptics: false,
}

// ============================================
// Device Presets
// ============================================

export interface DevicePreset {
  id: string
  name: string
  width: number
  height: number
  hasNotch: boolean
  hasDynamicIsland: boolean
  safeAreaTop: number
  safeAreaBottom: number
}

export const DEVICE_PRESETS: Record<string, DevicePreset> = {
  'iphone-se': {
    id: 'iphone-se',
    name: 'iPhone SE',
    width: 375,
    height: 667,
    hasNotch: false,
    hasDynamicIsland: false,
    safeAreaTop: 20,
    safeAreaBottom: 0,
  },
  'iphone-14': {
    id: 'iphone-14',
    name: 'iPhone 14',
    width: 390,
    height: 844,
    hasNotch: true,
    hasDynamicIsland: false,
    safeAreaTop: 47,
    safeAreaBottom: 34,
  },
  'iphone-15-pro': {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    width: 393,
    height: 852,
    hasNotch: false,
    hasDynamicIsland: true,
    safeAreaTop: 59,
    safeAreaBottom: 34,
  },
  'iphone-15-pro-max': {
    id: 'iphone-15-pro-max',
    name: 'iPhone 15 Pro Max',
    width: 430,
    height: 932,
    hasNotch: false,
    hasDynamicIsland: true,
    safeAreaTop: 59,
    safeAreaBottom: 34,
  },
}

export const DEFAULT_DEVICE = 'iphone-15-pro-max'

// ============================================
// Mobile Project Config
// ============================================

export interface MobileProjectConfig {
  stack: MobileStack
  platforms: Platform[]
  capabilities: MobileCapabilities
  bundleId: string
  appName: string
  version: string
  buildNumber: number
  minIosVersion: string
  orientation: 'portrait' | 'landscape' | 'all'
}

export const DEFAULT_MOBILE_CONFIG: MobileProjectConfig = {
  stack: 'expo-rn',
  platforms: ['ios'],
  capabilities: DEFAULT_CAPABILITIES,
  bundleId: 'com.torbit.app',
  appName: 'My App',
  version: '1.0.0',
  buildNumber: 1,
  minIosVersion: '15.0',
  orientation: 'portrait',
}

// ============================================
// Capability → Expo SDK Mapping
// ============================================

export const CAPABILITY_PACKAGES: Record<keyof MobileCapabilities, string[]> = {
  auth: ['expo-auth-session', 'expo-secure-store', 'expo-crypto'],
  camera: ['expo-camera', 'expo-image-picker'],
  push: ['expo-notifications', 'expo-device'],
  payments: ['expo-in-app-purchases'],
  storage: ['expo-file-system', 'expo-secure-store', '@react-native-async-storage/async-storage'],
  location: ['expo-location'],
  biometrics: ['expo-local-authentication'],
  haptics: ['expo-haptics'],
}

export const CAPABILITY_PERMISSIONS: Record<keyof MobileCapabilities, string[]> = {
  auth: [],
  camera: ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription'],
  push: [],
  payments: [],
  storage: [],
  location: ['NSLocationWhenInUseUsageDescription', 'NSLocationAlwaysUsageDescription'],
  biometrics: ['NSFaceIDUsageDescription'],
  haptics: [],
}
