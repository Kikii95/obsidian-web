import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivityPeriod = "30" | "90" | "180" | "365";
export type DashboardLayout = "compact" | "spacious" | "minimal";
export type SidebarSortBy = "name" | "type";
export type DateFormat = "fr" | "en" | "iso";

export interface UserSettings {
  // Dashboard
  recentNotesCount: number;
  showMiniGraph: boolean;
  showActivityHeatmap: boolean;
  activityDefaultPeriod: ActivityPeriod;
  dashboardLayout: DashboardLayout;

  // Editor
  editorFontSize: number; // 14-20px
  editorLineHeight: number; // 1.4-2.0
  editorMaxWidth: number; // 600-1200px
  showFrontmatter: boolean; // Show/hide frontmatter badges
  enableKeyboardShortcuts: boolean; // Ctrl+S to save, Esc to cancel

  // Sidebar
  defaultExpandedFolders: string[]; // Folders to expand by default
  sidebarWidth: number;
  sidebarSortBy: SidebarSortBy; // Sort files by name or type
  showFileIcons: boolean; // Show colored icons by file type
  hidePatterns: string[]; // Patterns to hide (e.g. [".gitkeep", "_private"])
  customFolderOrders: Record<string, string[]>; // Custom order per folder path ("" = root)

  // Lock system
  lockTimeout: number; // Minutes before auto-lock (0 = never)
  requirePinOnDelete: boolean; // Require PIN to delete any file (when PIN configured)

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
  autoSaveDelay: number; // Auto-save delay in seconds (0 = disabled)

  // Daily Notes
  dailyNotesFolder: string; // Folder path for daily notes (e.g. "Daily", "Journal/Daily")
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
}

const defaultSettings: UserSettings = {
  // Dashboard
  recentNotesCount: 5,
  showMiniGraph: true,
  showActivityHeatmap: true,
  activityDefaultPeriod: "90",
  dashboardLayout: "spacious",

  // Editor
  editorFontSize: 16,
  editorLineHeight: 1.6,
  editorMaxWidth: 800,
  showFrontmatter: true,
  enableKeyboardShortcuts: true,

  // Sidebar
  defaultExpandedFolders: [],
  sidebarWidth: 256,
  sidebarSortBy: "name",
  showFileIcons: true,
  hidePatterns: [".gitkeep"],
  customFolderOrders: {},

  // Lock system
  lockTimeout: 5, // 5 minutes
  requirePinOnDelete: true,

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
  autoSaveDelay: 0, // Disabled by default

  // Daily Notes
  dailyNotesFolder: "Daily",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

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
    }),
    {
      name: "obsidian-web-settings",
    }
  )
);
