# Capacitor Export Contract

> Internal specification. Frozen until Phase 8.

## Core Principles

1. **Explicit export mode** — Never default. User must choose.
2. **Capability-aware only** — Permissions generated from declared capabilities.
3. **No runtime claims** — No simulators, no device builds, no "runs on device."
4. **Ledger entry required** — Every native wrap is an auditable event.
5. **Reality banner mandatory** — User sees truth before export.
6. **iOS first** — Android support is Phase 8+.

## Export Behavior

When user selects Capacitor export:

```
1. expo build:web
2. npx cap init <AppName> <BundleID>
3. npx cap add ios
```

Using values already validated:
- Bundle ID from preflight
- Capabilities from builder state
- Permissions from capability mapping

## Generated Artifacts

| File | Source |
|------|--------|
| `capacitor.config.ts` | Deterministic from bundle ID + app name |
| `ios/App/App/Info.plist` | Capability → permission mapping |
| `ios/App/Podfile` | Capability → plugin dependencies |

## Permissions Policy

**Only declared capabilities produce permissions.**

Example: If `camera` capability is not enabled, no `NSCameraUsageDescription` exists.

This prevents the #1 Capacitor rejection reason: unused permissions.

## Ledger Event

```typescript
{
  type: 'export_native_wrapper',
  platform: 'ios',
  wrapper: 'capacitor',
  capabilities: ['payments', 'auth'],
  bundleId: 'com.example.app',
  timestamp: number
}
```

## Reality Banner Copy

```
Native shell generated.
This export includes a Capacitor wrapper.
Final signing and App Store submission occurs in Xcode.
```

## What TORBIT Does NOT Do

- ❌ Run Xcode builds
- ❌ Attempt iOS simulators
- ❌ Promise "runs on device"
- ❌ Automate code signing
- ❌ Submit to App Store

TORBIT: Prepares. Verifies. Exports.

## Phase 8 Build Order

1. **8.1** — Capacitor scaffolding (config files only, no execution)
2. **8.2** — Capability → native permission mapping
3. **8.3** — Export reality banner + ledger event emission

## Status

**LOCKED** — Do not implement until:
- Phase 7 pricing validated
- Expo export battle-tested
- User demand confirmed via metrics
