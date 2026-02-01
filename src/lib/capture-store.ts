"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CaptureItem {
  id: string;
  content: string;
  targetFolder: string;
  appendToDaily: boolean;
  createdAt: number;
  synced: boolean;
}

interface CaptureStore {
  // Queue for offline captures
  queue: CaptureItem[];

  // Current draft
  draft: string;
  targetFolder: string;
  appendToDaily: boolean;

  // UI state
  isOpen: boolean;
  isVoiceActive: boolean;

  // Actions
  setDraft: (content: string) => void;
  setTargetFolder: (folder: string) => void;
  setAppendToDaily: (value: boolean) => void;
  setIsOpen: (open: boolean) => void;
  setIsVoiceActive: (active: boolean) => void;

  // Queue management
  addToQueue: (item: Omit<CaptureItem, "id" | "createdAt" | "synced">) => void;
  markSynced: (id: string) => void;
  removeFromQueue: (id: string) => void;
  clearSyncedItems: () => void;

  // Helpers
  clearDraft: () => void;
  getPendingCount: () => number;
}

export const useCaptureStore = create<CaptureStore>()(
  persist(
    (set, get) => ({
      queue: [],
      draft: "",
      targetFolder: "",
      appendToDaily: false,
      isOpen: false,
      isVoiceActive: false,

      setDraft: (content) => set({ draft: content }),
      setTargetFolder: (folder) => set({ targetFolder: folder }),
      setAppendToDaily: (value) => set({ appendToDaily: value }),
      setIsOpen: (open) => set({ isOpen: open }),
      setIsVoiceActive: (active) => set({ isVoiceActive: active }),

      addToQueue: (item) => {
        const newItem: CaptureItem = {
          ...item,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          synced: false,
        };
        set((state) => ({ queue: [...state.queue, newItem] }));
      },

      markSynced: (id) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, synced: true } : item
          ),
        }));
      },

      removeFromQueue: (id) => {
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        }));
      },

      clearSyncedItems: () => {
        set((state) => ({
          queue: state.queue.filter((item) => !item.synced),
        }));
      },

      clearDraft: () => {
        set({ draft: "", appendToDaily: false });
      },

      getPendingCount: () => {
        return get().queue.filter((item) => !item.synced).length;
      },
    }),
    {
      name: "obsidian-web-capture",
      partialize: (state) => ({
        queue: state.queue,
        targetFolder: state.targetFolder,
        appendToDaily: state.appendToDaily,
      }),
    }
  )
);
