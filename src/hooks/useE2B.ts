'use client'

import { useE2BContext } from '@/providers/E2BProvider'

// ============================================================================
// useE2B Hook - The Interface to E2B Cloud Sandbox
// ============================================================================
// Exposes E2B functionality to React components.
// Handles file operations and command execution.
// ============================================================================

export interface UseE2BReturn {
  // State
  sandboxId: string | null
  isBooting: boolean
  isReady: boolean
  serverUrl: string | null
  error: string | null
  buildFailure: ReturnType<typeof useE2BContext>['buildFailure']
  
  // Verification metadata
  verification: ReturnType<typeof useE2BContext>['verification']
  
  // File Operations
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string | null>
  
  // Command Execution
  runCommand: (cmd: string, args?: string[], timeoutMs?: number) => Promise<{ exitCode: number; stdout: string; stderr: string }>
  
  // Sync & Lifecycle
  syncFilesToSandbox: () => Promise<void>
  killSandbox: () => Promise<void>
  requestPreviewRebuild: (reason?: string) => void
}

export function useE2B(): UseE2BReturn {
  const context = useE2BContext()
  
  return {
    sandboxId: context.sandboxId,
    isBooting: context.isBooting,
    isReady: context.isReady,
    serverUrl: context.serverUrl,
    error: context.error,
    buildFailure: context.buildFailure,
    verification: context.verification,
    writeFile: context.writeFile,
    readFile: context.readFile,
    runCommand: context.runCommand,
    syncFilesToSandbox: context.syncFilesToSandbox,
    killSandbox: context.killSandbox,
    requestPreviewRebuild: context.requestPreviewRebuild,
  }
}

// ============================================================================
// Default SvelteKit + DaisyUI Template
// ============================================================================
export const SVELTEKIT_TEMPLATE = {
  'package.json': `{
  "name": "torbit-app",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^3.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "autoprefixer": "^10.4.0",
    "daisyui": "^4.0.0",
    "postcss": "^8.4.0",
    "svelte": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}`,
  'svelte.config.js': `import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};

export default config;`,
  'vite.config.ts': `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()]
});`,
  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['dark', 'light', 'cupcake', 'cyberpunk', 'synthwave', 'luxury', 'corporate'],
    darkTheme: 'dark',
  },
}`,
  'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
  'src/app.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
  'src/app.html': `<!DOCTYPE html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>`,
  'src/routes/+layout.svelte': `<script>
  import '../app.css';
</script>

<slot />`,
  'src/routes/+page.svelte': `<script lang="ts">
  let count = $state(0);
  
  function increment() {
    count++;
  }
</script>

<main class="min-h-screen bg-base-200 flex items-center justify-center">
  <div class="card bg-base-100 shadow-xl p-8 text-center">
    <h1 class="text-5xl font-bold text-primary mb-4">Welcome to Torbit</h1>
    <p class="text-base-content/70 mb-8">SvelteKit + DaisyUI powered by E2B</p>
    
    <div class="flex flex-col gap-4 items-center">
      <button class="btn btn-primary btn-lg" onclick={increment}>
        Count: {count}
      </button>
      <p class="text-sm text-base-content/50">Click to increment</p>
    </div>
  </div>
</main>`,
  'tsconfig.json': `{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}`,
}

export type SvelteKitTemplateFile = keyof typeof SVELTEKIT_TEMPLATE
