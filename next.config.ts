import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const isDevelopment = process.env.NODE_ENV === 'development';
const scriptSrc = isDevelopment
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;"
  : "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;";

const nextConfig: NextConfig = {
  // ============================================================================
  // SECURITY HEADERS
  // ============================================================================
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Keep 'unsafe-inline' for Next.js inline scripts; restrict unsafe-eval to development only.
          { key: 'Content-Security-Policy', value: `default-src 'self'; ${scriptSrc} style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://openrouter.ai https://*.e2b.dev https://*.sentry.io; frame-src 'self' https://*.e2b.dev; worker-src 'self' blob:;` },
        ],
      },
    ];
  },
  
  // Allow "Vibe Coding" - don't break build on type errors during development
  typescript: { ignoreBuildErrors: process.env.NODE_ENV === 'development' },
};

export default withBundleAnalyzer(nextConfig);
