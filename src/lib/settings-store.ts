import { create } from "zustand";
import { persist } from "zustand/middleware";

// Detect if running on mobile device
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export type ActivityPeriod = "30" | "90" | "180" | "365";
export type DashboardLayout = "compact" | "spacious" | "minimal";
export type SidebarSortBy = "name" | "type";
export type DateFormat = "fr" | "en" | "iso";

export type FeedbackFilter = "bug" | "idea" | "question";

export interface UserSettings {
  // Dashboard
  recentNotesCount: number;
  showMiniGraph: boolean;
  showActivityHeatmap: boolean;
  activityDefaultPeriod: ActivityPeriod;
  dashboardLayout: DashboardLayout;
  showCommunityFeedback: boolean;
  feedbackCount: number; // 3-10
  feedbackFilters: FeedbackFilter[]; // Which types to show

  // Editor
  editorFontSize: number; // 10-32px
  editorLineHeight: number; // 1.4-2.0
  editorMaxWidth: number; // 600-1200px
  showFrontmatter: boolean; // Show/hide frontmatter badges
  enableKeyboardShortcuts: boolean; // Ctrl+S to save, Esc to cancel
  vimMode: boolean; // Enable vim keybindings in editor
  codeSyntaxTheme: string; // Syntax highlighting theme for code blocks

  // Mobile
  enableGestures: boolean; // Enable swipe/pinch gestures on mobile

  // Sidebar
  vaultRootPath: string; // Custom vault root path (e.g. "MonVault" if repo is root/MonVault/...)
  defaultExpandedFolders: string[]; // Folders to expand by default (relative to vaultRootPath)
  sidebarWidth: number;
  sidebarSortBy: SidebarSortBy; // Sort files by name or type
  showFileIcons: boolean; // Show colored icons by file type
  hidePatterns: string[]; // Patterns to hide (e.g. [".gitkeep", "_private"])
  customFolderOrders: Record<string, string[]>; // Custom order per folder path ("" = root)
  folderIcons: Record<string, string>; // Custom icons per folder path

  // Lock system
  lockTimeout: number; // Minutes before auto-lock (0 = never)
  requirePinOnDelete: boolean; // Require PIN to delete any file (when PIN configured)
  requirePinOnPrivateFolder: boolean; // Require PIN to see children of _private folders
  pinHash: string | null; // SHA-256 hash of PIN (shared across devices)

  // Graph
  showOrphanNotes: boolean;
  graphForceStrength: number; // -1 to -500
  graphLinkDistance: number; // 10 to 200
  graphGravityStrength: number; // 0 to 0.2 (pull toward center)
  graphDefaultZoom: number; // 0.1 to 2 (saved zoom level)

  // Header
  showDateTime: boolean; // Show date/time in header

  // General
  dateFormat: DateFormat; // Date format (fr, en, iso)

  // Daily Notes
  dailyNotesFolder: string; // Folder path for daily notes (e.g. "Daily", "Journal/Daily")

  // Cloud Sync
  syncToCloud: boolean; // Sync settings to GitHub (disabled on mobile by default)
  theme: string; // Current theme ID (synced with cloud)

  // Index
  autoRefreshIndex: boolean; // Auto-refresh index when opening dashboard
  autoRefreshIntervalDays: number; // Refresh if index is older than X days (1-30)
}

interface SettingsState {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
  // Folder order helpers
  getFolderOrder: (parentPath: string) => string[];
  setFolderOrder: (parentPath: string, order: string[]) => void;
  moveFolderInOrder: (parentPath: string, folderName: string, direction: "up" | "down") => void;
  clearFolderOrder: (parentPath: string) => void;
  // Cloud sync
  cloudSha: string | null; // SHA of settings file in GitHub
  isSyncing: boolean;
  hasLoadedFromCloud: boolean; // True after first successful cloud load
  lastSyncError: string | null;
  loadFromCloud: () => Promise<void>;
  saveToCloud: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  // Dashboard
  recentNotesCount: 5,
  showMiniGraph: true,
  showActivityHeatmap: true,
  activityDefaultPeriod: "90",
  dashboardLayout: "spacious",
  showCommunityFeedback: true,
  feedbackCount: 5,
  feedbackFilters: ["bug", "idea", "question"], // Show all by default

  // Editor
  editorFontSize: 16,
  editorLineHeight: 1.6,
  editorMaxWidth: 800,
  showFrontmatter: true,
  enableKeyboardShortcuts: true,
  vimMode: false, // Disabled by default
  codeSyntaxTheme: "auto", // Default code theme (follows global theme)

  // Mobile
  enableGestures: true, // Gestures enabled by default

  // Sidebar
  vaultRootPath: "", // Empty = repo root
  defaultExpandedFolders: [],
  sidebarWidth: 256,
  sidebarSortBy: "name",
  showFileIcons: true,
  hidePatterns: [".gitkeep"],
  customFolderOrders: {},
  folderIcons: {}, // No custom icons by default

  // Lock system
  lockTimeout: 5, // 5 minutes
  requirePinOnDelete: true,
  requirePinOnPrivateFolder: true, // Hide _private folder children until unlocked
  pinHash: null, // No PIN by default

  // Graph
  showOrphanNotes: false,
  graphForceStrength: -300,
  graphLinkDistance: 80,
  graphGravityStrength: 0.05,
  graphDefaultZoom: 0.8,

  // Header
  showDateTime: false,

  // General
  dateFormat: "fr",

  // Daily Notes
  dailyNotesFolder: "Daily",

  // Cloud Sync
  syncToCloud: true, // Sync to GitHub by default
  theme: "magenta", // Default theme

  // Index
  autoRefreshIndex: true, // Auto-refresh by default
  autoRefreshIntervalDays: 7, // Refresh if older than 7 days
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      cloudSha: null,
      isSyncing: false,
      hasLoadedFromCloud: false,
      lastSyncError: null,

      updateSettings: (partial) => {
        set((state) => ({
          settings: { ...state.settings, ...partial },
        }));
        // Auto-save to cloud if enabled (debounced in component)
      },

      resetSettings: () =>
        set({ settings: defaultSettings }),

      // Get folder order for a specific parent path ("" = root)
      getFolderOrder: (parentPath: string) => {
        try {
          const orders = get().settings?.customFolderOrders;
          if (!orders || typeof orders !== 'object') return [];
          const order = orders[parentPath];
          return Array.isArray(order) ? order : [];
        } catch {
          return [];
        }
      },

      // Set folder order for a specific parent path
      setFolderOrder: (parentPath: string, order: string[]) => {
        if (!Array.isArray(order)) return;
        set((state) => ({
          settings: {
            ...state.settings,
            customFolderOrders: {
              ...((state.settings?.customFolderOrders && typeof state.settings.customFolderOrders === 'object')
                ? state.settings.customFolderOrders
                : {}),
              [parentPath]: order,
            },
          },
        }));
      },

      // Move a folder up or down in the order
      moveFolderInOrder: (parentPath: string, folderName: string, direction: "up" | "down") => {
        const currentOrder = get().getFolderOrder(parentPath);
        const index = currentOrder.indexOf(folderName);

        if (index === -1) {
          // Folder not in order yet, can't move
          return;
        }

        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= currentOrder.length) {
          return; // Can't move beyond bounds
        }

        const newOrder = [...currentOrder];
        [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

        get().setFolderOrder(parentPath, newOrder);
      },

      // Clear folder order for a specific parent path
      clearFolderOrder: (parentPath: string) => {
        set((state) => {
          const existingOrders = state.settings?.customFolderOrders;
          const newOrders = (existingOrders && typeof existingOrders === 'object')
            ? { ...existingOrders }
            : {};
          delete newOrders[parentPath];
          return {
            settings: {
              ...state.settings,
              customFolderOrders: newOrders,
            },
          };
        });
      },

      // Load settings from GitHub cloud
      loadFromCloud: async () => {
        const { settings, isSyncing } = get();
        if (isSyncing) return;

        // If sync disabled, mark as loaded immediately (use localStorage settings)
        if (!settings.syncToCloud) {
          set({ hasLoadedFromCloud: true });
          return;
        }

        set({ isSyncing: true, lastSyncError: null });

        try {
          const mobile = isMobileDevice();
          const response = await fetch(`/api/github/settings?mobile=${mobile}`);

          if (!response.ok) {
            throw new Error("Failed to load settings from cloud");
          }

          const data = await response.json();

          if (data.exists && data.settings) {
            // Merge cloud settings with local (cloud takes priority)
            set((state) => ({
              settings: { ...state.settings, ...data.settings },
              cloudSha: data.sha,
              isSyncing: false,
              hasLoadedFromCloud: true,
            }));
          } else {
            // No cloud settings yet, upload current local settings
            set({ isSyncing: false, hasLoadedFromCloud: true });
            get().saveToCloud();
          }
        } catch (error) {
          console.error("Error loading settings from cloud:", error);
          set({
            isSyncing: false,
            hasLoadedFromCloud: true, // Still mark as loaded so UI isn't blocked
            lastSyncError: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },

      // Save settings to GitHub cloud
      saveToCloud: async () => {
        const { settings, cloudSha, isSyncing } = get();
        if (isSyncing || !settings.syncToCloud) return;

        set({ isSyncing: true, lastSyncError: null });

        try {
          const mobile = isMobileDevice();
          const response = await fetch("/api/github/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              settings,
              sha: cloudSha,
              mobile,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to save settings to cloud");
          }

          const data = await response.json();
          set({
            cloudSha: data.sha,
            isSyncing: false,
          });
        } catch (error) {
          console.error("Error saving settings to cloud:", error);
          set({
            isSyncing: false,
            lastSyncError: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    }),
    {
      name: "obsidian-web-settings",
      // Exclude cloud-related state from persistence (only local)
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);
