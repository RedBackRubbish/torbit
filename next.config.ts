import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // ============================================================================
  // WEBCONTAINER SECURITY HEADERS
  // ============================================================================
  // WebContainers require SharedArrayBuffer which needs COOP/COEP headers.
  // BUT these headers break Stripe.js and other cross-origin resources.
  // So we ONLY apply them to the /builder route where WebContainers run.
  // ============================================================================
  async headers() {
    return [
      {
        // Apply COOP/COEP headers to /builder exactly
        source: '/builder',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        // Apply COOP/COEP headers to /builder sub-paths
        source: '/builder/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
  
  // Allow "Vibe Coding" - don't break build on type errors during development
  typescript: { ignoreBuildErrors: process.env.NODE_ENV === 'development' },
};

export default withBundleAnalyzer(nextConfig);
