import { create } from "zustand";
import type { VaultFile } from "@/types";

interface VaultState {
  // Tree
  tree: VaultFile[];
  isLoadingTree: boolean;
  treeError: string | null;

  // Current note
  currentPath: string | null;
  currentContent: string | null;
  currentSha: string | null;
  currentFrontmatter: Record<string, unknown> | null;
  isLoadingNote: boolean;
  noteError: string | null;

  // Sidebar
  sidebarOpen: boolean;
  expandedFolders: Set<string>;

  // Actions
  setTree: (tree: VaultFile[]) => void;
  setTreeLoading: (loading: boolean) => void;
  setTreeError: (error: string | null) => void;

  setCurrentNote: (data: {
    path: string;
    content: string;
    sha: string;
    frontmatter: Record<string, unknown>;
  }) => void;
  clearCurrentNote: () => void;
  setNoteLoading: (loading: boolean) => void;
  setNoteError: (error: string | null) => void;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  // Initial state
  tree: [],
  isLoadingTree: false,
  treeError: null,

  currentPath: null,
  currentContent: null,
  currentSha: null,
  currentFrontmatter: null,
  isLoadingNote: false,
  noteError: null,

  sidebarOpen: true,
  expandedFolders: new Set(["Stats", "Projects", "Learning"]),

  // Actions
  setTree: (tree) => set({ tree }),
  setTreeLoading: (isLoadingTree) => set({ isLoadingTree }),
  setTreeError: (treeError) => set({ treeError }),

  setCurrentNote: ({ path, content, sha, frontmatter }) =>
    set({
      currentPath: path,
      currentContent: content,
      currentSha: sha,
      currentFrontmatter: frontmatter,
      noteError: null,
    }),
  clearCurrentNote: () =>
    set({
      currentPath: null,
      currentContent: null,
      currentSha: null,
      currentFrontmatter: null,
    }),
  setNoteLoading: (isLoadingNote) => set({ isLoadingNote }),
  setNoteError: (noteError) => set({ noteError }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleFolder: (path) =>
    set((state) => {
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return { expandedFolders: newExpanded };
    }),
  expandFolder: (path) =>
    set((state) => {
      const newExpanded = new Set(state.expandedFolders);
      newExpanded.add(path);
      return { expandedFolders: newExpanded };
    }),
}));
