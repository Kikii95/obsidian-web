/**
 * Lock system for private notes (Apple Notes style)
 * - PIN stored hashed in localStorage
 * - Session-based unlock (stays unlocked for X minutes)
 */

import { create } from "zustand";

const PIN_HASH_KEY = "obsidian-web-pin-hash";
const UNLOCK_EXPIRY_KEY = "obsidian-web-unlock-expiry";
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

// Get stored unlock expiry from sessionStorage
function getStoredUnlockExpiry(): number | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(UNLOCK_EXPIRY_KEY);
  if (!stored) return null;
  const expiry = parseInt(stored, 10);
  // Check if still valid
  if (Date.now() > expiry) {
    sessionStorage.removeItem(UNLOCK_EXPIRY_KEY);
    return null;
  }
  return expiry;
}

// Store unlock expiry in sessionStorage
function setStoredUnlockExpiry(expiry: number): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(UNLOCK_EXPIRY_KEY, expiry.toString());
}

// Remove unlock expiry from sessionStorage
function removeStoredUnlockExpiry(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(UNLOCK_EXPIRY_KEY);
}

export const useLockStore = create<LockState>((set, get) => ({
  hasPinConfigured: false,
  isUnlocked: false,
  unlockExpiry: null,

  initializeLockState: () => {
    const hash = getStoredHash();
    const storedExpiry = getStoredUnlockExpiry();
    const isStillUnlocked = storedExpiry !== null && Date.now() < storedExpiry;

    set({
      hasPinConfigured: !!hash,
      isUnlocked: isStillUnlocked,
      unlockExpiry: isStillUnlocked ? storedExpiry : null,
    });
  },

  setupPin: async (pin: string) => {
    const hash = await hashPin(pin);
    const expiry = Date.now() + UNLOCK_TIMEOUT;
    setStoredHash(hash);
    setStoredUnlockExpiry(expiry);
    set({ hasPinConfigured: true, isUnlocked: true, unlockExpiry: expiry });
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
      const expiry = Date.now() + UNLOCK_TIMEOUT;
      setStoredUnlockExpiry(expiry);
      set({ isUnlocked: true, unlockExpiry: expiry });
      return true;
    }
    return false;
  },

  lock: () => {
    removeStoredUnlockExpiry();
    set({ isUnlocked: false, unlockExpiry: null });
  },

  removePin: () => {
    removeStoredHash();
    removeStoredUnlockExpiry();
    set({ hasPinConfigured: false, isUnlocked: false, unlockExpiry: null });
  },

  checkUnlockExpiry: () => {
    const { unlockExpiry, isUnlocked } = get();
    if (isUnlocked && unlockExpiry && Date.now() > unlockExpiry) {
      removeStoredUnlockExpiry();
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
