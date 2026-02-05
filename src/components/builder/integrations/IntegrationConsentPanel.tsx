"use client";

/**
 * Integration Consent Panel
 * 
 * Displays integration details and requests user consent before installation.
 * 
 * UX Rules:
 * - No agent names
 * - No model names
 * - Clear, structured consent text
 * - Slide-in panel (same pattern as SupervisorReviewPanel)
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Key, Globe, HardDrive, AlertTriangle } from "lucide-react";
import type { IntegrationManifest } from "@/lib/integrations/types";

interface IntegrationConsentPanelProps {
  manifest: IntegrationManifest;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function IntegrationConsentPanel({
  manifest,
  isOpen,
  onConfirm,
  onCancel,
}: IntegrationConsentPanelProps) {
  const { name, category, permissions, secretPolicy, docs } = manifest;

  const hasSecrets = (permissions.secrets?.length ?? 0) > 0;
  const hasNetwork = (permissions.network?.length ?? 0) > 0;
  const hasStorage = permissions.storage === true;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onCancel}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-neutral-900 border-l border-neutral-800 z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-800">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Add Integration</h2>
                  <p className="text-sm text-neutral-400">{name}</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Category Badge */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium rounded bg-neutral-800 text-neutral-300 capitalize">
                  {category}
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded bg-neutral-800 text-neutral-300">
                  v{manifest.version}
                </span>
              </div>

              {/* Permissions Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-white">This integration will:</h3>
                
                <div className="space-y-2">
                  {hasNetwork && (
                    <PermissionItem
                      icon={<Globe className="w-4 h-4" />}
                      label="Connect to external services"
                      details={permissions.network?.join(", ")}
                    />
                  )}

                  {hasSecrets && (
                    <PermissionItem
                      icon={<Key className="w-4 h-4" />}
                      label="Require API credentials"
                      details={permissions.secrets?.join(", ")}
                      isSecure={secretPolicy === "server-only"}
                    />
                  )}

                  {hasStorage && (
                    <PermissionItem
                      icon={<HardDrive className="w-4 h-4" />}
                      label="Use local storage"
                    />
                  )}
                </div>
              </div>

              {/* Security Notice */}
              {secretPolicy === "server-only" && hasSecrets && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-green-300">
                      Credentials are stored securely and never written to files or exposed to the client.
                    </p>
                  </div>
                </div>
              )}

              {/* Setup Steps */}
              {docs.setupSteps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white">Setup required:</h3>
                  <ol className="space-y-2">
                    {docs.setupSteps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm text-neutral-400">
                        <span className="text-neutral-500 shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Governance Notice */}
              {(manifest.requiresStrategistReview || manifest.requiresAuditorReview) && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-300">
                      This integration requires additional security review before activation.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-4 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-300 text-sm font-medium hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors"
              >
                Add Integration
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

interface PermissionItemProps {
  icon: React.ReactNode;
  label: string;
  details?: string;
  isSecure?: boolean;
}

function PermissionItem({ icon, label, details, isSecure }: PermissionItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-800/50">
      <div className="text-neutral-400 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-white">{label}</p>
        {details && (
          <p className="text-xs text-neutral-500 mt-0.5 break-all">{details}</p>
        )}
        {isSecure && (
          <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Server-only
          </p>
        )}
      </div>
    </div>
  );
}
