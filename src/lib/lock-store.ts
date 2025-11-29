/**
 * Lock system for private notes (Apple Notes style)
 * - PIN stored hashed in localStorage
 * - Session-based unlock (stays unlocked for X minutes)
 */

import { create } from "zustand";

const PIN_HASH_KEY = "obsidian-web-pin-hash";
const UNLOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

interface LockState {
  // Is a PIN configured?
  hasPinConfigured: boolean;
  // Is session currently unlocked?
  isUnlocked: boolean;
  // Unlock expiry timestamp
  unlockExpiry: number | null;

  // Actions
  initializeLockState: () => void;
  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  removePin: () => void;
  checkUnlockExpiry: () => void;
}

// Hash PIN using SHA-256
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "obsidian-web-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Get stored hash from localStorage
function getStoredHash(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PIN_HASH_KEY);
}

// Store hash in localStorage
function setStoredHash(hash: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PIN_HASH_KEY, hash);
}

// Remove hash from localStorage
function removeStoredHash(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PIN_HASH_KEY);
}

export const useLockStore = create<LockState>((set, get) => ({
  hasPinConfigured: false,
  isUnlocked: false,
  unlockExpiry: null,

  initializeLockState: () => {
    const hash = getStoredHash();
    set({
      hasPinConfigured: !!hash,
      isUnlocked: false,
      unlockExpiry: null,
    });
  },

  setupPin: async (pin: string) => {
    const hash = await hashPin(pin);
    setStoredHash(hash);
    set({ hasPinConfigured: true, isUnlocked: true, unlockExpiry: Date.now() + UNLOCK_TIMEOUT });
  },

  verifyPin: async (pin: string) => {
    const storedHash = getStoredHash();
    if (!storedHash) return false;
    const inputHash = await hashPin(pin);
    return inputHash === storedHash;
  },

  unlock: async (pin: string) => {
    const isValid = await get().verifyPin(pin);
    if (isValid) {
      set({ isUnlocked: true, unlockExpiry: Date.now() + UNLOCK_TIMEOUT });
      return true;
    }
    return false;
  },

  lock: () => {
    set({ isUnlocked: false, unlockExpiry: null });
  },

  removePin: () => {
    removeStoredHash();
    set({ hasPinConfigured: false, isUnlocked: false, unlockExpiry: null });
  },

  checkUnlockExpiry: () => {
    const { unlockExpiry, isUnlocked } = get();
    if (isUnlocked && unlockExpiry && Date.now() > unlockExpiry) {
      set({ isUnlocked: false, unlockExpiry: null });
    }
  },
}));

// Check if path is in a private folder
export function isPathLocked(path: string): boolean {
  const segments = path.toLowerCase().split("/");
  return segments.some(
    (segment) =>
      segment === "_private" ||
      segment.startsWith("_private.") ||
      segment === "private"
  );
}

// Check if note is locked based on frontmatter
export function isFrontmatterLocked(frontmatter: Record<string, unknown> | null): boolean {
  if (!frontmatter) return false;

  // Check private: true
  if (frontmatter.private === true) return true;
  if (frontmatter.lock === true) return true;
  if (frontmatter.locked === true) return true;

  // Check tags for #private or #lock
  const tags = frontmatter.tags;
  if (Array.isArray(tags)) {
    const lockTags = ["private", "lock", "locked"];
    return tags.some(tag =>
      lockTags.includes(String(tag).toLowerCase().replace("#", ""))
    );
  }

  return false;
}

// Combined check: path OR frontmatter
export function isNoteLocked(path: string, frontmatter: Record<string, unknown> | null): boolean {
  return isPathLocked(path) || isFrontmatterLocked(frontmatter);
}
