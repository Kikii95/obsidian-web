import type { RateLimitInfo } from "@/lib/github";
import type { VaultFile } from "@/types";

// Layout modes
export type LayoutMode = "dashboard" | "share" | "temp";

// Sidebar variants
export type SidebarVariant = "resizable" | "collapsible";

// Share modes
export type ShareMode = "reader" | "writer" | "deposit";

// Permissions based on mode and auth state
export interface LayoutPermissions {
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canCopy: boolean;
  canExport: boolean;
  canShare: boolean;
  isAuthenticated: boolean;
}

// Mode-specific metadata
export interface DashboardMetadata {
  userName?: string;
  userImage?: string;
  vaultOwner: string;
  vaultRepo: string;
  vaultBranch: string;
}

export interface ShareMetadata {
  token: string;
  shareMode: ShareMode;
  folderName: string;
  folderPath: string;
  expiresAt: Date | null;
  allowCopy: boolean;
  allowExport: boolean;
  ownerName: string;
}

export interface TempMetadata {
  owner: string;
  repo: string;
  branch: string;
  defaultBranch: string;
  description: string | null;
  stars: number;
  isPrivate: boolean;
  rateLimit: RateLimitInfo | null;
}

// Discriminated union for type-safe metadata
export type LayoutMetadata =
  | { mode: "dashboard"; data: DashboardMetadata }
  | { mode: "share"; data: ShareMetadata }
  | { mode: "temp"; data: TempMetadata };

// Sidebar state
export interface SidebarState {
  open: boolean;
  width: number;
  variant: SidebarVariant;
}

// Layout context value
export interface LayoutContextValue {
  // Mode
  mode: LayoutMode;

  // Permissions
  permissions: LayoutPermissions;

  // Metadata (mode-specific)
  metadata: LayoutMetadata;

  // Sidebar state and actions
  sidebar: SidebarState;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;

  // File tree data
  tree: VaultFile[];
  currentPath: string;
  setCurrentPath: (path: string) => void;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

// Feature flags per mode
export interface LayoutFeatures {
  header: {
    showDateTime: boolean;
    showRateLimit: boolean;
    showExpiration: boolean;
    showGlobalLock: boolean;
    showQuickActions: boolean;
    showUserMenu: boolean;
    showLoginPrompt: boolean;
    showGitHubLink: boolean;
    showBranchBadge: boolean;
    showStars: boolean;
  };
  sidebar: {
    resizable: boolean;
    collapsible: boolean;
    showSearch: boolean;
    showCRUD: boolean;
    showSelection: boolean;
    showCopyToVault: boolean;
    showWriterActions: boolean;
    showCodeFiles: boolean;
  };
  extras: {
    quickSwitcher: boolean;
    scrollProgress: boolean;
    scrollRestoration: boolean;
    pwaMeta: boolean;
    networkStatus: boolean;
  };
}

// Default features per mode
export const LAYOUT_FEATURES: Record<LayoutMode, LayoutFeatures> = {
  dashboard: {
    header: {
      showDateTime: true,
      showRateLimit: true,
      showExpiration: false,
      showGlobalLock: true,
      showQuickActions: true,
      showUserMenu: true,
      showLoginPrompt: false,
      showGitHubLink: false,
      showBranchBadge: false,
      showStars: false,
    },
    sidebar: {
      resizable: true,
      collapsible: false,
      showSearch: true,
      showCRUD: true,
      showSelection: true,
      showCopyToVault: false,
      showWriterActions: false,
      showCodeFiles: false,
    },
    extras: {
      quickSwitcher: true,
      scrollProgress: true,
      scrollRestoration: true,
      pwaMeta: true,
      networkStatus: true,
    },
  },
  share: {
    header: {
      showDateTime: false,
      showRateLimit: false,
      showExpiration: true,
      showGlobalLock: false,
      showQuickActions: false,
      showUserMenu: false,
      showLoginPrompt: true,
      showGitHubLink: false,
      showBranchBadge: false,
      showStars: false,
    },
    sidebar: {
      resizable: false,
      collapsible: true,
      showSearch: false,
      showCRUD: false,
      showSelection: false,
      showCopyToVault: true,
      showWriterActions: true,
      showCodeFiles: false,
    },
    extras: {
      quickSwitcher: false,
      scrollProgress: false,
      scrollRestoration: false,
      pwaMeta: false,
      networkStatus: false,
    },
  },
  temp: {
    header: {
      showDateTime: false,
      showRateLimit: true,
      showExpiration: false,
      showGlobalLock: false,
      showQuickActions: false,
      showUserMenu: false,
      showLoginPrompt: true,
      showGitHubLink: true,
      showBranchBadge: true,
      showStars: true,
    },
    sidebar: {
      resizable: false,
      collapsible: true,
      showSearch: true,
      showCRUD: false,
      showSelection: false,
      showCopyToVault: false,
      showWriterActions: false,
      showCodeFiles: true,
    },
    extras: {
      quickSwitcher: false,
      scrollProgress: false,
      scrollRestoration: false,
      pwaMeta: false,
      networkStatus: false,
    },
  },
};

// Helper to get features for a mode
export function getLayoutFeatures(mode: LayoutMode): LayoutFeatures {
  return LAYOUT_FEATURES[mode];
}

// Default permissions per mode
export function getDefaultPermissions(
  mode: LayoutMode,
  isAuthenticated: boolean,
  shareMode?: ShareMode,
  allowCopy?: boolean,
  allowExport?: boolean
): LayoutPermissions {
  switch (mode) {
    case "dashboard":
      return {
        canEdit: true,
        canCreate: true,
        canDelete: true,
        canCopy: false,
        canExport: true,
        canShare: true,
        isAuthenticated: true,
      };
    case "share":
      const isWriter = shareMode === "writer";
      return {
        canEdit: isWriter,
        canCreate: isWriter,
        canDelete: false,
        canCopy: isAuthenticated && (allowCopy ?? false),
        canExport: allowExport ?? false,
        canShare: false,
        isAuthenticated,
      };
    case "temp":
      return {
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canCopy: false,
        canExport: false,
        canShare: false,
        isAuthenticated,
      };
  }
}

// Breadcrumb item type
export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

// Props for unified components
export interface UnifiedHeaderProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
  sticky?: boolean;
  className?: string;
}

export interface UnifiedSidebarProps {
  variant: SidebarVariant;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  header?: React.ReactNode;
  search?: boolean;
  tree: VaultFile[];
  actions?: React.ReactNode;
  buildHref: (file: VaultFile) => string | null;
  showIcons?: boolean;
  enableSelection?: boolean;
  className?: string;
}

export interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  variant?: "icon" | "button";
  className?: string;
}
