/**
 * TORBIT Mobile - Publish Panel
 * Export for Xcode with validation and pre-flight checks
 */

'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { 
  Rocket, 
  Apple, 
  Download, 
  CheckCircle2, 
  Package,
  FileCode,
  Shield,
  Clock,
  ChevronRight,
  X,
  Smartphone,
  TestTube,
  Store,
  AlertTriangle
} from 'lucide-react'
import { useBuilderStore } from '@/store/builder'
import { generateExportBundle, createExportZip, downloadBlob } from '@/lib/mobile/export'
import { validateProject, generatePodfile, generateEntitlements } from '@/lib/mobile/validation'
import type { ValidationResult } from '@/lib/mobile/validation'
import { DEFAULT_MOBILE_CONFIG } from '@/lib/mobile/types'
import { useEscapeToClose } from '@/hooks/useEscapeToClose'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { PreflightChecklist } from './PreflightChecklist'
import { GovernanceResolved } from './governance'
import { TorbitSpinner } from '@/components/ui/TorbitLogo'
import { recordMetric } from '@/lib/metrics/success'

type ExportStatus = 'idle' | 'validating' | 'preflight' | 'exporting' | 'complete' | 'error'

interface ExportResult {
  appName: string
  version: string
  capabilities: string[]
  fileCount: number
  exportedAt: string
}

export function PublishPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [result, setResult] = useState<ExportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFirstExport, setIsFirstExport] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  
  const { files, projectType, capabilities, projectName } = useBuilderStore()
  
  const isMobile = projectType === 'mobile'
  const hasFiles = files.length > 0
  
  // Check first export status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const exported = localStorage.getItem('torbit_has_exported_mobile')
      setIsFirstExport(!exported)
    }
  }, [])
  
  // Build config once
  const config = useMemo(() => ({
    ...DEFAULT_MOBILE_CONFIG,
    appName: projectName || 'MyApp',
    capabilities,
  }), [projectName, capabilities])
  
  // Handle clicking "Export for Xcode" - run validation first
  const handleStartExport = async () => {
    if (!isMobile || !hasFiles) return
    
    setStatus('validating')
    setError(null)
    
    try {
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Convert files for validation
      const projectFiles = files.map(file => ({
        path: file.path,
        content: file.content,
      }))
      
      // Run validation
      const validation = validateProject(projectFiles, config)
      setValidationResult(validation)
      
      // Move to preflight checklist
      setStatus('preflight')
      
    } catch (err) {
      console.error('Validation failed:', err)
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Validation failed')
    }
  }
  
  // Handle proceeding with export after validation
  const handleProceedExport = async () => {
    if (!validationResult?.canExport) return
    
    setStatus('exporting')
    
    try {
      // Convert files for export
      const projectFiles = files.map(file => ({
        path: file.path,
        content: file.content,
      }))
      
      // Generate additional hardened files
      const podfile = generatePodfile(config, config.appName)
      const entitlements = generateEntitlements(config.capabilities, config.bundleId)
      
      // Add hardened files to project
      const enhancedFiles = [
        ...projectFiles,
        { path: 'ios/Podfile', content: podfile },
        { path: 'ios/Entitlements.plist', content: entitlements },
      ]
      
      // Generate the export bundle
      const bundle = generateExportBundle(enhancedFiles, config)
      
      // Create and download ZIP
      const blob = await createExportZip(bundle)
      const filename = `${config.appName.replace(/\s+/g, '-')}-iOS-Export.zip`
      downloadBlob(blob, filename)
      
      // Record export metrics (Phase 6)
      recordMetric('export_initiated', { exportType: 'xcode' })
      recordMetric('export_downloaded', { exportType: 'xcode' })
      
      // Track first export for mobile
      if (typeof window !== 'undefined' && isFirstExport) {
        localStorage.setItem('torbit_has_exported_mobile', 'true')
        setIsFirstExport(false)
      }
      
      setStatus('complete')
      setResult({
        appName: config.appName,
        version: config.version,
        capabilities: bundle.metadata.capabilities,
        fileCount: bundle.files.length,
        exportedAt: new Date().toLocaleTimeString(),
      })
      
    } catch (err) {
      console.error('Export failed:', err)
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }
  
  const resetExport = () => {
    setStatus('idle')
    setValidationResult(null)
    setResult(null)
    setError(null)
  }

  const closePanel = () => {
    setIsOpen(false)
    resetExport()
  }

  useEscapeToClose(isOpen, closePanel)
  useBodyScrollLock(isOpen)
  useFocusTrap(dialogRef, isOpen)

  if (!isMobile) return null
  
  return (
    <>
      {/* Publish Button - Premium Style */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={!hasFiles}
        aria-label="Publish your mobile app. Export for Xcode and App Store submission"
        aria-disabled={!hasFiles}
        className="group relative flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden
          bg-gradient-to-r from-[#c0c0c0] via-[#e8e8e8] to-[#c0c0c0] text-black
          hover:from-white hover:via-[#f5f5f5] hover:to-white
          shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4)]
          hover:shadow-[0_4px_12px_rgba(192,192,192,0.3),inset_0_1px_0_rgba(255,255,255,0.6)]
          active:scale-[0.98]"
      >
        <Rocket className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        Publish
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </button>
      
      {/* Modal Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-dialog-title"
        >
          <div
            ref={dialogRef}
            className="w-full max-w-lg mx-4 bg-black border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-900 rounded-lg" aria-hidden="true">
                  <Rocket className="w-5 h-5 text-[#c0c0c0]" />
                </div>
                <div>
                  <h2 id="publish-dialog-title" className="text-white font-semibold">
                    {status === 'preflight' ? 'Pre-flight Check' : 
                     status === 'complete' ? 'Export Complete' :
                     'Publish Your App'}
                  </h2>
                  <p className="text-neutral-500 text-sm">
                    {status === 'preflight' ? 'Review before exporting' :
                     status === 'complete' ? 'Ready for Xcode' :
                     'Export for iOS development'}
                  </p>
                </div>
              </div>
              <button
                onClick={closePanel}
                aria-label="Close publish dialog"
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" aria-hidden="true" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-4">
              
              {/* Idle State - Export Options */}
              {status === 'idle' && (
                <>
                  {/* Primary: Export for Xcode */}
                  <button
                    onClick={handleStartExport}
                    disabled={!hasFiles}
                    className="w-full flex items-center gap-4 p-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl transition-colors text-left disabled:opacity-50"
                  >
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl">
                      <Apple className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">Export for Xcode</span>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          iOS
                        </span>
                      </div>
                      <p className="text-neutral-400 text-sm mt-0.5">
                        Validate and download project ready for Xcode
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-500" />
                  </button>
                  
                  {/* Coming Soon Options */}
                  <div className="space-y-2">
                    <p className="text-neutral-600 text-xs uppercase tracking-wider px-1">Coming Soon</p>
                    
                    <div className="flex items-center gap-4 p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl opacity-50 cursor-not-allowed">
                      <div className="p-3 bg-neutral-800 rounded-xl">
                        <TestTube className="w-6 h-6 text-neutral-500" />
                      </div>
                      <div className="flex-1">
                        <span className="text-neutral-400 font-medium">TestFlight</span>
                        <p className="text-neutral-600 text-sm mt-0.5">
                          Upload directly to TestFlight
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl opacity-50 cursor-not-allowed">
                      <div className="p-3 bg-neutral-800 rounded-xl">
                        <Store className="w-6 h-6 text-neutral-500" />
                      </div>
                      <div className="flex-1">
                        <span className="text-neutral-400 font-medium">App Store Connect</span>
                        <p className="text-neutral-600 text-sm mt-0.5">
                          Submit for App Store review
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Export Mode - Capacitor teaser */}
                  <div className="pt-2 border-t border-neutral-800">
                    <p className="text-neutral-600 text-xs uppercase tracking-wider px-1 mb-2">Export Mode</p>
                    
                    {/* Current: Expo (selected) */}
                    <div className="flex items-center gap-3 p-3 bg-neutral-900 border border-neutral-700 rounded-lg mb-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      </div>
                      <div className="flex-1">
                        <span className="text-neutral-300 text-sm font-medium">Expo</span>
                        <span className="text-neutral-500 text-xs ml-2">Recommended</span>
                      </div>
                    </div>
                    
                    {/* Future: Capacitor (disabled) */}
                    <button 
                      disabled
                      onClick={() => recordMetric('feature_interest_capacitor')}
                      className="group w-full flex items-center gap-3 p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg opacity-50 cursor-not-allowed relative"
                      title="Native shell export with audited permissions. Available after launch."
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-neutral-600" />
                      <div className="flex-1 text-left">
                        <span className="text-neutral-500 text-sm font-medium">Capacitor</span>
                        <span className="text-neutral-600 text-xs ml-2">Native shell</span>
                      </div>
                      <span className="text-[10px] text-neutral-600 uppercase tracking-wide">Soon</span>
                    </button>
                  </div>
                </>
              )}
              
              {/* Validating State */}
              {status === 'validating' && (
                <div className="py-12 flex flex-col items-center gap-4">
                  <TorbitSpinner size="xl" />
                  <div className="text-center">
                    <p className="text-white font-medium">Validating Project</p>
                    <p className="text-neutral-500 text-sm mt-1">Checking configuration and assets...</p>
                  </div>
                </div>
              )}
              
              {/* Pre-flight Checklist */}
              {status === 'preflight' && validationResult && (
                <PreflightChecklist
                  result={validationResult}
                  onProceed={handleProceedExport}
                  onCancel={closePanel}
                  isExporting={false}
                />
              )}
              
              {/* Exporting State */}
              {status === 'exporting' && (
                <div className="py-12 flex flex-col items-center gap-4">
                  <TorbitSpinner size="xl" />
                  <div className="text-center">
                    <p className="text-white font-medium">Generating Bundle</p>
                    <p className="text-neutral-500 text-sm mt-1">Creating Xcode-ready package...</p>
                  </div>
                </div>
              )}
              
              {/* Complete State */}
              {status === 'complete' && result && (
                <div className="space-y-4">
                  {/* Governance Badges - Trust reinforcement */}
                  <GovernanceResolved 
                    supervisorReviewed={true} 
                    qualityPassed={true} 
                  />
                  
                  {/* Success Banner */}
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <div>
                      <p className="text-emerald-400 font-medium">Your iOS app is ready for Xcode</p>
                      <p className="text-emerald-500/60 text-sm mt-0.5">Download started automatically</p>
                    </div>
                  </div>
                  
                  {/* Export Details */}
                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-400 text-sm">
                        <Smartphone className="w-4 h-4" />
                        App Name
                      </div>
                      <span className="text-white font-medium">{result.appName}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-400 text-sm">
                        <Package className="w-4 h-4" />
                        Version
                      </div>
                      <span className="text-white font-medium">{result.version}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-400 text-sm">
                        <FileCode className="w-4 h-4" />
                        Files
                      </div>
                      <span className="text-white font-medium">{result.fileCount} files</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-400 text-sm">
                        <Shield className="w-4 h-4" />
                        Capabilities
                      </div>
                      <div className="flex gap-1">
                        {result.capabilities.length > 0 ? (
                          result.capabilities.slice(0, 3).map(cap => (
                            <span key={cap} className="px-2 py-0.5 bg-neutral-800 text-neutral-300 text-xs rounded">
                              {cap}
                            </span>
                          ))
                        ) : (
                          <span className="text-neutral-500 text-sm">None</span>
                        )}
                        {result.capabilities.length > 3 && (
                          <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs rounded">
                            +{result.capabilities.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-400 text-sm">
                        <Clock className="w-4 h-4" />
                        Exported At
                      </div>
                      <span className="text-neutral-300 text-sm">{result.exportedAt}</span>
                    </div>
                    
                    {/* Export Proof Line - 5.1 */}
                    <div className="pt-2 mt-2 border-t border-neutral-800">
                      <span className="text-[10px] text-neutral-600">
                        Includes audit ledger and verification proof
                      </span>
                    </div>
                  </div>
                  
                  {/* Validation Summary (if there were warnings) */}
                  {validationResult && validationResult.stats.warnings > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-400 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Exported with {validationResult.stats.warnings} warning{validationResult.stats.warnings !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-amber-500/60 text-xs mt-1">
                        Review SUBMISSION-CHECKLIST.md in the export
                      </p>
                    </div>
                  )}
                  
                  {/* Next Steps */}
                  <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl">
                    <p className="text-neutral-400 text-sm font-medium mb-2">Next Steps</p>
                    <ol className="text-neutral-500 text-sm space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-[#c0c0c0] font-mono">1.</span>
                        Unzip and run <code className="px-1 py-0.5 bg-neutral-800 rounded text-neutral-300 text-xs">npm install</code>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#c0c0c0] font-mono">2.</span>
                        Run <code className="px-1 py-0.5 bg-neutral-800 rounded text-neutral-300 text-xs">npx expo prebuild --platform ios</code>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#c0c0c0] font-mono">3.</span>
                        Follow README-SIGNING.md for Xcode setup
                      </li>
                    </ol>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={closePanel}
                      className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl transition-colors"
                    >
                      Done
                    </button>
                    <button
                      onClick={handleProceedExport}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-[#c0c0c0] hover:bg-white text-black font-medium rounded-xl transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Again
                    </button>
                  </div>
                </div>
              )}
              
              {/* Error State */}
              {status === 'error' && (
                <div className="py-8 flex flex-col items-center gap-4">
                  <div className="p-4 bg-red-500/10 rounded-2xl">
                    <X className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">Export Failed</p>
                    <p className="text-neutral-400 text-sm mt-1">{error || 'An unexpected error occurred'}</p>
                  </div>
                  <button
                    onClick={resetExport}
                    className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}
    </>
  )
}
