"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  LayoutMode,
  LayoutContextValue,
  LayoutMetadata,
  LayoutPermissions,
  SidebarState,
  SidebarVariant,
  DashboardMetadata,
  ShareMetadata,
  TempMetadata,
} from "@/types/layout";
import type { VaultFile } from "@/types";

// Default sidebar widths
const DEFAULT_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;

// Create context with undefined default
const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

// Provider props for each mode
interface DashboardProviderProps {
  mode: "dashboard";
  metadata: DashboardMetadata;
  permissions: LayoutPermissions;
  tree: VaultFile[];
  currentPath?: string;
  sidebarOpen?: boolean;
  sidebarWidth?: number;
  isLoading?: boolean;
  error?: string | null;
  children: ReactNode;
}

interface ShareProviderProps {
  mode: "share";
  metadata: ShareMetadata;
  permissions: LayoutPermissions;
  tree: VaultFile[];
  currentPath?: string;
  sidebarOpen?: boolean;
  isLoading?: boolean;
  error?: string | null;
  children: ReactNode;
}

interface TempProviderProps {
  mode: "temp";
  metadata: TempMetadata;
  permissions: LayoutPermissions;
  tree: VaultFile[];
  currentPath?: string;
  sidebarOpen?: boolean;
  isLoading?: boolean;
  error?: string | null;
  children: ReactNode;
}

export type LayoutProviderProps =
  | DashboardProviderProps
  | ShareProviderProps
  | TempProviderProps;

// Get sidebar variant based on mode
function getSidebarVariant(mode: LayoutMode): SidebarVariant {
  return mode === "dashboard" ? "resizable" : "collapsible";
}

// Layout Provider component
export function LayoutProvider(props: LayoutProviderProps) {
  const {
    mode,
    metadata: rawMetadata,
    permissions,
    tree,
    currentPath: initialPath = "",
    sidebarOpen: initialOpen = true,
    isLoading = false,
    error = null,
    children,
  } = props;

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(initialOpen);
  const [sidebarWidth, setSidebarWidthState] = useState(
    mode === "dashboard"
      ? (props as DashboardProviderProps).sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH
      : DEFAULT_SIDEBAR_WIDTH
  );
  const [currentPath, setCurrentPath] = useState(initialPath);

  // Sidebar actions
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const setSidebarWidth = useCallback((width: number) => {
    const clampedWidth = Math.min(
      Math.max(width, MIN_SIDEBAR_WIDTH),
      MAX_SIDEBAR_WIDTH
    );
    setSidebarWidthState(clampedWidth);
  }, []);

  // Build typed metadata
  const metadata: LayoutMetadata = useMemo(() => {
    switch (mode) {
      case "dashboard":
        return { mode: "dashboard", data: rawMetadata as DashboardMetadata };
      case "share":
        return { mode: "share", data: rawMetadata as ShareMetadata };
      case "temp":
        return { mode: "temp", data: rawMetadata as TempMetadata };
    }
  }, [mode, rawMetadata]);

  // Build sidebar state
  const sidebar: SidebarState = useMemo(
    () => ({
      open: sidebarOpen,
      width: sidebarWidth,
      variant: getSidebarVariant(mode),
    }),
    [sidebarOpen, sidebarWidth, mode]
  );

  // Context value
  const value: LayoutContextValue = useMemo(
    () => ({
      mode,
      permissions,
      metadata,
      sidebar,
      toggleSidebar,
      setSidebarWidth,
      tree,
      currentPath,
      setCurrentPath,
      isLoading,
      error,
    }),
    [
      mode,
      permissions,
      metadata,
      sidebar,
      toggleSidebar,
      setSidebarWidth,
      tree,
      currentPath,
      isLoading,
      error,
    ]
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

// Hook to use layout context
export function useLayoutContext(): LayoutContextValue {
  const context = useContext(LayoutContext);

  if (context === undefined) {
    throw new Error("useLayoutContext must be used within a LayoutProvider");
  }

  return context;
}

// Hook to check if inside layout provider (for optional usage)
export function useOptionalLayoutContext(): LayoutContextValue | undefined {
  return useContext(LayoutContext);
}

// Type guard helpers
export function isDashboardMode(
  metadata: LayoutMetadata
): metadata is { mode: "dashboard"; data: DashboardMetadata } {
  return metadata.mode === "dashboard";
}

export function isShareMode(
  metadata: LayoutMetadata
): metadata is { mode: "share"; data: ShareMetadata } {
  return metadata.mode === "share";
}

export function isTempMode(
  metadata: LayoutMetadata
): metadata is { mode: "temp"; data: TempMetadata } {
  return metadata.mode === "temp";
}

// Convenience hooks for mode-specific data
export function useDashboardMetadata(): DashboardMetadata | null {
  const { metadata } = useLayoutContext();
  return isDashboardMode(metadata) ? metadata.data : null;
}

export function useShareMetadata(): ShareMetadata | null {
  const { metadata } = useLayoutContext();
  return isShareMode(metadata) ? metadata.data : null;
}

export function useTempMetadata(): TempMetadata | null {
  const { metadata } = useLayoutContext();
  return isTempMode(metadata) ? metadata.data : null;
}

// Hook for sidebar state
export function useSidebar() {
  const { sidebar, toggleSidebar, setSidebarWidth } = useLayoutContext();
  return { ...sidebar, toggle: toggleSidebar, setWidth: setSidebarWidth };
}

// Hook for permissions
export function usePermissions() {
  const { permissions } = useLayoutContext();
  return permissions;
}

// Hook for features (derived from mode)
export function useLayoutFeatures() {
  const { mode } = useLayoutContext();

  return useMemo(() => {
    // Import dynamically to avoid circular deps
    const { LAYOUT_FEATURES } = require("@/types/layout");
    return LAYOUT_FEATURES[mode];
  }, [mode]);
}
