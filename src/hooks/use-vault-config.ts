"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useVaultConfigStore } from "@/lib/vault-config";

/**
 * Hook to manage vault configuration
 * - Loads config from API on mount
 * - Redirects to /setup if not configured
 * - Provides config to components
 */
export function useVaultConfig() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { config, setConfig, isLoading, setLoading, setError } = useVaultConfigStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Don't do anything if not authenticated or on setup page
    if (status !== "authenticated" || pathname?.startsWith("/setup")) {
      setIsInitialized(true);
      return;
    }

    // If config is already loaded and valid, we're done
    if (config.configured && config.owner && config.repo) {
      setIsInitialized(true);
      return;
    }

    // Load config from API
    const loadConfig = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/vault-config");
        const data = await response.json();

        if (data.exists && data.config) {
          setConfig({
            owner: data.config.owner,
            repo: data.config.repo,
            branch: data.config.branch || "main",
            rootPath: data.config.rootPath || "",
            configured: true,
          });
        } else {
          // Not configured, redirect to setup
          router.push("/setup");
          return;
        }
      } catch (error) {
        console.error("Error loading vault config:", error);
        setError("Erreur lors du chargement de la configuration");
        // On error, try to use env vars as fallback
        const envOwner = process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER;
        const envRepo = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME;
        if (envOwner && envRepo) {
          setConfig({
            owner: envOwner,
            repo: envRepo,
            branch: process.env.NEXT_PUBLIC_GITHUB_BRANCH || "main",
            rootPath: process.env.NEXT_PUBLIC_GITHUB_ROOT_PATH || "",
            configured: true,
          });
        } else {
          router.push("/setup");
          return;
        }
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    loadConfig();
  }, [status, pathname, config.configured, config.owner, config.repo, router, setConfig, setLoading, setError]);

  return {
    config: config.configured ? config : null,
    isLoading: isLoading || !isInitialized,
    isConfigured: config.configured && !!config.owner && !!config.repo,
  };
}

/**
 * Get vault config for API calls (server-side compatible)
 */
export function getVaultConfigForAPI(localConfig?: { owner?: string; repo?: string; branch?: string; rootPath?: string }) {
  // Priority: local config > env vars
  return {
    owner: localConfig?.owner || process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER || "",
    repo: localConfig?.repo || process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || "",
    branch: localConfig?.branch || process.env.NEXT_PUBLIC_GITHUB_BRANCH || "main",
    rootPath: localConfig?.rootPath || process.env.NEXT_PUBLIC_GITHUB_ROOT_PATH || "",
  };
}
