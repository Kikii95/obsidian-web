/**
 * Vault Configuration System
 *
 * Stores vault config (owner, repo, branch) per user.
 * Uses localStorage on client + GitHub settings file as backup.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface VaultConfig {
  owner: string;      // GitHub username (repo owner)
  repo: string;       // Repository name
  branch: string;     // Branch name (default: main)
  configured: boolean; // Whether vault is configured
}

interface VaultConfigState {
  config: VaultConfig;
  isLoading: boolean;
  error: string | null;

  // Actions
  setConfig: (config: Partial<VaultConfig>) => void;
  clearConfig: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ═══════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════

const defaultConfig: VaultConfig = {
  owner: "",
  repo: "",
  branch: "main",
  configured: false,
};

// ═══════════════════════════════════════════════
// ZUSTAND STORE
// ═══════════════════════════════════════════════

export const useVaultConfigStore = create<VaultConfigState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      isLoading: false,
      error: null,

      setConfig: (newConfig) =>
        set((state) => ({
          config: {
            ...state.config,
            ...newConfig,
            configured: !!(newConfig.owner || state.config.owner) &&
                        !!(newConfig.repo || state.config.repo),
          },
          error: null,
        })),

      clearConfig: () =>
        set({
          config: defaultConfig,
          error: null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: "obsidian-web-vault-config",
      partialize: (state) => ({ config: state.config }),
    }
  )
);

// ═══════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════

const VAULT_CONFIG_PATH = ".obsidian-web/vault-config.json";

/**
 * Save vault config to GitHub (as a file in the configured vault)
 */
export async function saveVaultConfigToGitHub(config: VaultConfig): Promise<void> {
  const response = await fetch("/api/vault-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save vault config");
  }
}

/**
 * Load vault config from GitHub
 */
export async function loadVaultConfigFromGitHub(): Promise<VaultConfig | null> {
  const response = await fetch("/api/vault-config");

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error("Failed to load vault config");
  }

  const data = await response.json();
  return data.config || null;
}

/**
 * Validate vault config by checking if repo exists and is accessible
 */
export async function validateVaultConfig(config: VaultConfig): Promise<{ valid: boolean; error?: string }> {
  const response = await fetch("/api/vault-config/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  const data = await response.json();
  return data;
}

// ═══════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════

/**
 * Get current vault config or null if not configured
 */
export function getVaultConfig(): VaultConfig | null {
  const { config } = useVaultConfigStore.getState();
  return config.configured ? config : null;
}

/**
 * Check if vault is configured
 */
export function isVaultConfigured(): boolean {
  const { config } = useVaultConfigStore.getState();
  return config.configured && !!config.owner && !!config.repo;
}
