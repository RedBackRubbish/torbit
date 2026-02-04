import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ============================================================================
  // WEBCONTAINER SECURITY HEADERS (MANDATORY)
  // ============================================================================
  // WebContainers require SharedArrayBuffer which needs these COOP/COEP headers.
  // Without these, the browser will refuse to boot the container.
  // ============================================================================
  async headers() {
    return [
      {
        source: '/(.*)',
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

export default nextConfig;
