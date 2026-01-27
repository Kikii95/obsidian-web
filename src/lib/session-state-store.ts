"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionState {
  // Last opened note
  lastOpenedNotePath: string | null;
  lastScrollPosition: number;

  // Sidebar state
  sidebarCollapsed: boolean;
  expandedFolders: string[];

  // Actions
  setLastNote: (path: string | null, scrollPosition?: number) => void;
  setScrollPosition: (position: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setExpandedFolders: (folders: string[]) => void;
  addExpandedFolder: (folder: string) => void;
  removeExpandedFolder: (folder: string) => void;
  clearSession: () => void;
}

/**
 * Persistent session state store
 * Stores user's session state across page reloads and browser restarts
 */
export const useSessionStateStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      lastOpenedNotePath: null,
      lastScrollPosition: 0,
      sidebarCollapsed: false,
      expandedFolders: [],

      // Actions
      setLastNote: (path, scrollPosition = 0) =>
        set({
          lastOpenedNotePath: path,
          lastScrollPosition: scrollPosition,
        }),

      setScrollPosition: (position) =>
        set({
          lastScrollPosition: position,
        }),

      setSidebarCollapsed: (collapsed) =>
        set({
          sidebarCollapsed: collapsed,
        }),

      setExpandedFolders: (folders) =>
        set({
          expandedFolders: folders,
        }),

      addExpandedFolder: (folder) => {
        const { expandedFolders } = get();
        if (!expandedFolders.includes(folder)) {
          set({ expandedFolders: [...expandedFolders, folder] });
        }
      },

      removeExpandedFolder: (folder) => {
        const { expandedFolders } = get();
        set({
          expandedFolders: expandedFolders.filter((f) => f !== folder),
        });
      },

      clearSession: () =>
        set({
          lastOpenedNotePath: null,
          lastScrollPosition: 0,
          sidebarCollapsed: false,
          expandedFolders: [],
        }),
    }),
    {
      name: "obsidian-web-session",
      // Only persist specific keys, not the actions
      partialize: (state) => ({
        lastOpenedNotePath: state.lastOpenedNotePath,
        lastScrollPosition: state.lastScrollPosition,
        sidebarCollapsed: state.sidebarCollapsed,
        expandedFolders: state.expandedFolders,
      }),
    }
  )
);
