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
  defaultEditMode: boolean; // Start notes in edit mode
  enableKeyboardShortcuts: boolean; // Ctrl+S to save, Esc to cancel

  // Sidebar
  defaultExpandedFolders: string[]; // Folders to expand by default
  sidebarWidth: number;
  sidebarSortBy: SidebarSortBy; // Sort files by name or type
  showFileIcons: boolean; // Show colored icons by file type
  hidePatterns: string[]; // Patterns to hide (e.g. [".gitkeep", "_private"])
  customFolderOrder: string[]; // Custom order for top-level folders

  // Lock system
  lockTimeout: number; // Minutes before auto-lock (0 = never)
  requirePinOnDelete: boolean;
  requirePinOnPrivateFolder: boolean;

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
}

interface SettingsState {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
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
  defaultEditMode: false,
  enableKeyboardShortcuts: true,

  // Sidebar
  defaultExpandedFolders: [],
  sidebarWidth: 256,
  sidebarSortBy: "name",
  showFileIcons: true,
  hidePatterns: [".gitkeep"],
  customFolderOrder: [],

  // Lock system
  lockTimeout: 5, // 5 minutes
  requirePinOnDelete: true,
  requirePinOnPrivateFolder: true,

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
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

      resetSettings: () =>
        set({ settings: defaultSettings }),
    }),
    {
      name: "obsidian-web-settings",
    }
  )
);
