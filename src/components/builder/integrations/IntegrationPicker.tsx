"use client";

/**
 * Integration Picker
 * 
 * Displays available integrations and allows users to select one.
 * Shows category, platform support, and governance requirements.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Map, 
  User, 
  Database, 
  Shield, 
  Smartphone, 
  Globe,
  ChevronRight,
  Search,
} from "lucide-react";
import { getAllIntegrations, type IntegrationManifest, type IntegrationCategory } from "@/lib/integrations";

interface IntegrationPickerProps {
  onSelect: (manifest: IntegrationManifest) => void;
  platform?: "web" | "mobile";
}

const CATEGORY_ICONS: Record<IntegrationCategory, typeof CreditCard> = {
  payments: CreditCard,
  auth: User,
  maps: Map,
  analytics: Database,
  storage: Database,
  email: Globe,
};

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  payments: "Payments",
  auth: "Authentication",
  maps: "Maps & Location",
  analytics: "Analytics",
  storage: "Database & Storage",
  email: "Email",
};

export function IntegrationPicker({ onSelect, platform }: IntegrationPickerProps) {
  const [search, setSearch] = useState("");
  
  const allIntegrations = getAllIntegrations();
  
  const filteredIntegrations = allIntegrations.filter(m => {
    // Platform filter
    if (platform && !m.platforms.includes(platform)) return false;
    
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      return m.id.includes(q) || m.name.toLowerCase().includes(q);
    }
    
    return true;
  });

  // Group by category
  const grouped = filteredIntegrations.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {} as Record<IntegrationCategory, IntegrationManifest[]>);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search integrations..."
          className="w-full pl-9 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
        />
      </div>

      {/* Integration List */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, integrations]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide px-1">
              {CATEGORY_LABELS[category as IntegrationCategory]}
            </h3>
            <div className="space-y-1">
              {integrations.map((manifest) => (
                <IntegrationCard
                  key={manifest.id}
                  manifest={manifest}
                  onClick={() => onSelect(manifest)}
                />
              ))}
            </div>
          </div>
        ))}

        {filteredIntegrations.length === 0 && (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No integrations found
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Integration Card
// ============================================================================

interface IntegrationCardProps {
  manifest: IntegrationManifest;
  onClick: () => void;
}

function IntegrationCard({ manifest, onClick }: IntegrationCardProps) {
  const Icon = CATEGORY_ICONS[manifest.category];
  const hasGovernance = manifest.requiresStrategistReview || manifest.requiresAuditorReview;

  return (
    <motion.button
      onClick={onClick}
      className="w-full p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition-colors text-left group"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-neutral-700/50">
          <Icon className="w-4 h-4 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{manifest.name}</span>
            {hasGovernance && (
              <span title="Requires security review">
                <Shield className="w-3 h-3 text-amber-400" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {manifest.platforms.map((p) => (
              <span key={p} className="flex items-center gap-1 text-xs text-neutral-500">
                {p === "web" ? (
                  <Globe className="w-3 h-3" />
                ) : (
                  <Smartphone className="w-3 h-3" />
                )}
                {p}
              </span>
            ))}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-400 transition-colors" />
      </div>
    </motion.button>
  );
}
