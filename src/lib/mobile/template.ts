/**
 * TORBIT Mobile - Expo Template
 * Production-ready Expo + React Native scaffold
 */

import type { ProjectFile } from '@/store/builder'
import type { MobileCapabilities, MobileProjectConfig } from './types'
import { CAPABILITY_PACKAGES } from './types'

// ============================================
// Generate Expo Project Files
// ============================================

export function generateExpoTemplate(config: MobileProjectConfig): Omit<ProjectFile, 'id'>[] {
  const files: Omit<ProjectFile, 'id'>[] = []

  // App config
  files.push({
    path: 'app.config.ts',
    name: 'app.config.ts',
    language: 'typescript',
    content: generateAppConfig(config),
  })

  // Package.json
  files.push({
    path: 'package.json',
    name: 'package.json',
    language: 'json',
    content: generatePackageJson(config),
  })

  // TypeScript config
  files.push({
    path: 'tsconfig.json',
    name: 'tsconfig.json',
    language: 'json',
    content: generateTsConfig(),
  })

  // Theme files
  files.push({
    path: 'theme/colors.ts',
    name: 'colors.ts',
    language: 'typescript',
    content: generateColors(),
  })

  files.push({
    path: 'theme/spacing.ts',
    name: 'spacing.ts',
    language: 'typescript',
    content: generateSpacing(),
  })

  files.push({
    path: 'theme/typography.ts',
    name: 'typography.ts',
    language: 'typescript',
    content: generateTypography(),
  })

  files.push({
    path: 'theme/index.ts',
    name: 'index.ts',
    language: 'typescript',
    content: `export * from './colors'\nexport * from './spacing'\nexport * from './typography'\n`,
  })

  // Root layout
  files.push({
    path: 'app/_layout.tsx',
    name: '_layout.tsx',
    language: 'typescript',
    content: generateRootLayout(),
  })

  // Tabs layout
  files.push({
    path: 'app/(tabs)/_layout.tsx',
    name: '_layout.tsx',
    language: 'typescript',
    content: generateTabsLayout(),
  })

  // Home screen
  files.push({
    path: 'app/(tabs)/index.tsx',
    name: 'index.tsx',
    language: 'typescript',
    content: generateHomeScreen(config),
  })

  // Explore screen
  files.push({
    path: 'app/(tabs)/explore.tsx',
    name: 'explore.tsx',
    language: 'typescript',
    content: generateExploreScreen(),
  })

  // Profile screen
  files.push({
    path: 'app/(tabs)/profile.tsx',
    name: 'profile.tsx',
    language: 'typescript',
    content: generateProfileScreen(),
  })

  // Components
  files.push({
    path: 'components/Button.tsx',
    name: 'Button.tsx',
    language: 'typescript',
    content: generateButton(),
  })

  files.push({
    path: 'components/Card.tsx',
    name: 'Card.tsx',
    language: 'typescript',
    content: generateCard(),
  })

  files.push({
    path: 'components/Screen.tsx',
    name: 'Screen.tsx',
    language: 'typescript',
    content: generateScreen(),
  })

  // Capabilities config
  files.push({
    path: 'capabilities.json',
    name: 'capabilities.json',
    language: 'json',
    content: JSON.stringify(config.capabilities, null, 2),
  })

  return files
}

// ============================================
// File Generators
// ============================================

function generateAppConfig(config: MobileProjectConfig): string {
  return `import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '${config.appName}',
  slug: '${config.bundleId.split('.').pop() || 'app'}',
  version: '${config.version}',
  orientation: '${config.orientation}',
  icon: './assets/icon.png',
  scheme: '${config.bundleId.split('.').pop() || 'app'}',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: '${config.bundleId}',
    buildNumber: '${config.buildNumber}',
    infoPlist: {
      // Permissions will be added based on capabilities
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#000000',
    },
    package: '${config.bundleId}',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
})
`
}

function generatePackageJson(config: MobileProjectConfig): string {
  const dependencies: Record<string, string> = {
    'expo': '~52.0.0',
    'expo-router': '~4.0.0',
    'expo-status-bar': '~2.0.0',
    'expo-system-ui': '~4.0.0',
    'expo-web-browser': '~14.0.0',
    'react': '18.3.1',
    'react-native': '0.76.0',
    'react-native-web': '~0.19.12',
    'react-native-safe-area-context': '4.12.0',
    'react-native-screens': '~4.0.0',
    '@expo/vector-icons': '^14.0.0',
    'react-native-reanimated': '~3.16.0',
    'react-native-gesture-handler': '~2.20.0',
  }

  // Add capability-specific packages
  Object.entries(config.capabilities).forEach(([capability, enabled]) => {
    if (enabled) {
      const packages = CAPABILITY_PACKAGES[capability as keyof MobileCapabilities]
      packages.forEach(pkg => {
        dependencies[pkg] = '*'
      })
    }
  })

  return JSON.stringify({
    name: config.bundleId.split('.').pop() || 'app',
    version: config.version,
    main: 'expo-router/entry',
    scripts: {
      'start': 'expo start',
      'android': 'expo start --android',
      'ios': 'expo start --ios',
      'web': 'expo start --web',
      'prebuild': 'expo prebuild',
      'prebuild:ios': 'expo prebuild --platform ios',
      'export:ios': 'expo prebuild --platform ios --clean',
    },
    dependencies,
    devDependencies: {
      '@babel/core': '^7.24.0',
      '@types/react': '~18.3.0',
      'typescript': '^5.3.0',
    },
    private: true,
  }, null, 2)
}

function generateTsConfig(): string {
  return JSON.stringify({
    extends: 'expo/tsconfig.base',
    compilerOptions: {
      strict: true,
      paths: {
        '@/*': ['./*'],
      },
    },
    include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'],
  }, null, 2)
}

function generateColors(): string {
  return `/**
 * Design Tokens - Colors
 * iOS-optimized color palette
 */

export const colors = {
  // Backgrounds
  background: '#000000',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#48484A',
  
  // Accent
  primary: '#0A84FF',
  primaryLight: '#409CFF',
  
  // Semantic
  success: '#30D158',
  warning: '#FFD60A',
  error: '#FF453A',
  
  // System
  separator: '#38383A',
  fill: '#787880',
  
  // iOS System Colors
  systemGray: '#8E8E93',
  systemGray2: '#636366',
  systemGray3: '#48484A',
  systemGray4: '#3A3A3C',
  systemGray5: '#2C2C2E',
  systemGray6: '#1C1C1E',
} as const

export type ColorToken = keyof typeof colors
`
}

function generateSpacing(): string {
  return `/**
 * Design Tokens - Spacing
 * iOS HIG-compliant spacing scale
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const

export type SpacingToken = keyof typeof spacing
export type RadiusToken = keyof typeof radius
`
}

function generateTypography(): string {
  return `/**
 * Design Tokens - Typography
 * iOS SF Pro-based type scale
 */

import { Platform } from 'react-native'

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
})

export const typography = {
  largeTitle: {
    fontFamily,
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  title1: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  title2: {
    fontFamily,
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  title3: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  headline: {
    fontFamily,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  body: {
    fontFamily,
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  callout: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  subhead: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  footnote: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  caption1: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  caption2: {
    fontFamily,
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 13,
    letterSpacing: 0.07,
  },
} as const

export type TypographyToken = keyof typeof typography
`
}

function generateRootLayout(): string {
  return `import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'react-native'

export default function RootLayout() {
  const colorScheme = useColorScheme()

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}
`
}

function generateTabsLayout(): string {
  return `import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/theme'

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? colors.textSecondary : '#8E8E93',
        tabBarStyle: {
          backgroundColor: isDark ? colors.surface : '#F2F2F7',
          borderTopColor: isDark ? colors.separator : '#C6C6C8',
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
`
}

function generateHomeScreen(config: MobileProjectConfig): string {
  return `import { View, Text, StyleSheet, useColorScheme } from 'react-native'
import { Screen } from '@/components/Screen'
import { Card } from '@/components/Card'
import { colors, typography, spacing } from '@/theme'

export default function HomeScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[styles.title, { color: isDark ? colors.text : '#000' }]}>
          ${config.appName}
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? colors.textSecondary : '#666' }]}>
          Built with TORBIT
        </Text>
        
        <View style={styles.cards}>
          <Card
            title="Get Started"
            description="Start building your amazing app"
            icon="rocket"
          />
          <Card
            title="Explore Features"
            description="Discover what's possible"
            icon="sparkles"
          />
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    ...typography.largeTitle,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.subhead,
    marginBottom: spacing.xl,
  },
  cards: {
    gap: spacing.md,
  },
})
`
}

function generateExploreScreen(): string {
  return `import { View, Text, StyleSheet, useColorScheme, ScrollView } from 'react-native'
import { Screen } from '@/components/Screen'
import { colors, typography, spacing } from '@/theme'

export default function ExploreScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: isDark ? colors.text : '#000' }]}>
          Explore
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? colors.textSecondary : '#666' }]}>
          Discover amazing content
        </Text>
        
        <View style={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View 
              key={item}
              style={[
                styles.item, 
                { backgroundColor: isDark ? colors.surfaceElevated : '#F2F2F7' }
              ]}
            >
              <Text style={[styles.itemText, { color: isDark ? colors.text : '#000' }]}>
                Item {item}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    ...typography.largeTitle,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.subhead,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  item: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    ...typography.headline,
  },
})
`
}

function generateProfileScreen(): string {
  return `import { View, Text, StyleSheet, useColorScheme, Image } from 'react-native'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/Button'
import { colors, typography, spacing } from '@/theme'

export default function ProfileScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>T</Text>
          </View>
          <Text style={[styles.name, { color: isDark ? colors.text : '#000' }]}>
            TORBIT User
          </Text>
          <Text style={[styles.email, { color: isDark ? colors.textSecondary : '#666' }]}>
            user@torbit.app
          </Text>
        </View>
        
        <View style={styles.actions}>
          <Button title="Edit Profile" variant="primary" />
          <Button title="Settings" variant="secondary" />
          <Button title="Sign Out" variant="ghost" />
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.largeTitle,
    color: '#FFFFFF',
  },
  name: {
    ...typography.title2,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.subhead,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
})
`
}

function generateButton(): string {
  return `import { Pressable, Text, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native'
import { colors, typography, spacing, radius } from '@/theme'

interface ButtonProps {
  title: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  loading?: boolean
}

export function Button({ 
  title, 
  onPress, 
  variant = 'primary',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const getBackgroundColor = () => {
    if (disabled) return isDark ? colors.systemGray4 : '#E5E5EA'
    switch (variant) {
      case 'primary': return colors.primary
      case 'secondary': return isDark ? colors.surfaceElevated : '#F2F2F7'
      case 'ghost': return 'transparent'
    }
  }

  const getTextColor = () => {
    if (disabled) return isDark ? colors.textSecondary : '#8E8E93'
    switch (variant) {
      case 'primary': return '#FFFFFF'
      case 'secondary': return colors.primary
      case 'ghost': return colors.primary
    }
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === 'ghost' && styles.ghost,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>
          {title}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  ghost: {
    height: 44,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    ...typography.headline,
  },
})
`
}

function generateCard(): string {
  return `import { View, Text, StyleSheet, useColorScheme, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius } from '@/theme'

interface CardProps {
  title: string
  description: string
  icon?: keyof typeof Ionicons.glyphMap
  onPress?: () => void
}

export function Card({ title, description, icon, onPress }: CardProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: isDark ? colors.surfaceElevated : '#F2F2F7' },
        pressed && styles.pressed,
      ]}
    >
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name={icon} size={24} color={colors.primary} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={[styles.title, { color: isDark ? colors.text : '#000' }]}>
          {title}
        </Text>
        <Text style={[styles.description, { color: isDark ? colors.textSecondary : '#666' }]}>
          {description}
        </Text>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={isDark ? colors.textSecondary : '#8E8E93'} 
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.headline,
  },
  description: {
    ...typography.subhead,
  },
})
`
}

function generateScreen(): string {
  return `import { View, StyleSheet, useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/theme'

interface ScreenProps {
  children: React.ReactNode
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
}

export function Screen({ children, edges = ['top'] }: ScreenProps) {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.background : '#FFFFFF' },
        edges.includes('top') && { paddingTop: insets.top },
        edges.includes('bottom') && { paddingBottom: insets.bottom },
        edges.includes('left') && { paddingLeft: insets.left },
        edges.includes('right') && { paddingRight: insets.right },
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
`
}
