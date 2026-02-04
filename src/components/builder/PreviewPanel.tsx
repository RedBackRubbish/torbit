'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useBuilderStore } from '@/store/builder'

// Dynamic import Monaco to avoid SSR issues
const CodeEditor = dynamic(() => import('./CodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
        <span className="text-white/40 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Loading editor...
        </span>
      </div>
    </div>
  ),
})

/**
 * PreviewPanel - Live preview or code editor (real Monaco)
 */
export default function PreviewPanel() {
  const { previewTab, previewDevice, setPreviewDevice, files } = useBuilderStore()

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }

  // Generate preview HTML from files
  const previewContent = useMemo(() => {
    if (files.length === 0) return null
    
    // Find the main page file
    const pageFile = files.find(f => f.path.includes('page.tsx') || f.path.includes('index.tsx'))
    const cssFile = files.find(f => f.path.includes('.css'))
    
    // For now, we'll use a placeholder - in production this would compile and render
    return { pageFile, cssFile }
  }, [files])

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
      {previewTab === 'preview' ? (
        <>
          {/* Device Switcher */}
          <div className="h-10 border-b border-white/5 flex items-center justify-center gap-2 px-4 bg-[#0f0f0f]">
            {(['desktop', 'tablet', 'mobile'] as const).map((device) => (
              <button
                key={device}
                onClick={() => setPreviewDevice(device)}
                className={`px-3 py-1 rounded text-xs transition-all ${
                  previewDevice === device
                    ? 'bg-white/10 text-white/80'
                    : 'text-white/30 hover:text-white/50'
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {device === 'desktop' && '🖥️'}
                {device === 'tablet' && '📱'}
                {device === 'mobile' && '📲'}
              </button>
            ))}
            
            <div className="ml-4 text-white/20 text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {deviceWidths[previewDevice]}
            </div>
          </div>
          
          {/* Preview Frame */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            {files.length > 0 ? (
              <motion.div
                className="bg-white rounded-lg shadow-2xl overflow-hidden"
                style={{ 
                  width: previewDevice === 'desktop' ? '100%' : deviceWidths[previewDevice],
                  maxWidth: '100%',
                  height: previewDevice === 'mobile' ? '667px' : '100%',
                }}
                layout
                transition={{ duration: 0.3 }}
              >
                {/* Real iframe preview would go here */}
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                          body { margin: 0; font-family: system-ui, sans-serif; }
                        </style>
                      </head>
                      <body>
                        <div id="root" class="min-h-screen bg-gray-900 text-white p-8">
                          <div class="max-w-4xl mx-auto">
                            <h1 class="text-3xl font-bold mb-4">Preview</h1>
                            <p class="text-gray-400">
                              ${files.length} files generated. Compiling preview...
                            </p>
                          </div>
                        </div>
                      </body>
                    </html>
                  `}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                  title="Preview"
                />
              </motion.div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
                  <span className="text-2xl opacity-30">⚡</span>
                </div>
                <h3 
                  className="text-white/40 text-lg font-light mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  No preview yet
                </h3>
                <p 
                  className="text-white/20 text-sm max-w-md"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Enter a prompt in the chat to start building. The preview will appear here as agents generate code.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Code View - Real Monaco Editor */
        <CodeEditor />
      )}
    </div>
  )
}
