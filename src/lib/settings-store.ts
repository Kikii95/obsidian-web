import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserSettings {
  // Dashboard
  recentNotesCount: number;
  showMiniGraph: boolean;

  // Sidebar
  defaultExpandedFolders: string[]; // Folders to expand by default
  sidebarWidth: number;

  // Lock system
  lockTimeout: number; // Minutes before auto-lock (0 = never)
  requirePinOnDelete: boolean;
  requirePinOnPrivateFolder: boolean;

  // Graph
  showOrphanNotes: boolean;
  graphForceStrength: number; // -100 to -500
  graphLinkDistance: number; // 30 to 150
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

  // Sidebar
  defaultExpandedFolders: [],
  sidebarWidth: 256,

  // Lock system
  lockTimeout: 5, // 5 minutes
  requirePinOnDelete: true,
  requirePinOnPrivateFolder: true,

  // Graph
  showOrphanNotes: false,
  graphForceStrength: -300,
  graphLinkDistance: 80,
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
