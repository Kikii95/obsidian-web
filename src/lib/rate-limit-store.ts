import { create } from "zustand";

export interface RateLimitInfo {
  limit: number; // Max requests per hour (5000 for authenticated)
  remaining: number; // Requests left
  reset: number; // Unix timestamp when limit resets
  used: number; // Requests used this window
}

interface RateLimitState {
  rateLimit: RateLimitInfo | null;
  lastUpdated: number | null;
  setRateLimit: (info: RateLimitInfo) => void;
  updateRateLimit: (headers: Headers) => void;
  getRemainingTime: () => number; // Minutes until reset
  getUsagePercent: () => number;
  isLow: () => boolean; // Less than 10% remaining
  isCritical: () => boolean; // Less than 5% remaining
}

export const useRateLimitStore = create<RateLimitState>((set, get) => ({
  rateLimit: null,
  lastUpdated: null,

  setRateLimit: (info: RateLimitInfo) => {
    set({
      rateLimit: info,
      lastUpdated: Date.now(),
    });
  },

  updateRateLimit: (headers: Headers) => {
    const limit = headers.get("x-ratelimit-limit");
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");
    const used = headers.get("x-ratelimit-used");

    if (limit && remaining && reset) {
      set({
        rateLimit: {
          limit: parseInt(limit, 10),
          remaining: parseInt(remaining, 10),
          reset: parseInt(reset, 10),
          used: used ? parseInt(used, 10) : 0,
        },
        lastUpdated: Date.now(),
      });
    }
  },

  getRemainingTime: () => {
    const { rateLimit } = get();
    if (!rateLimit) return 0;

    const now = Math.floor(Date.now() / 1000);
    const diff = rateLimit.reset - now;
    return Math.max(0, Math.ceil(diff / 60)); // Minutes
  },

  getUsagePercent: () => {
    const { rateLimit } = get();
    if (!rateLimit || rateLimit.limit === 0) return 0;

    return Math.round(((rateLimit.limit - rateLimit.remaining) / rateLimit.limit) * 100);
  },

  isLow: () => {
    const { rateLimit } = get();
    if (!rateLimit) return false;

    return rateLimit.remaining < rateLimit.limit * 0.1; // Less than 10%
  },

  isCritical: () => {
    const { rateLimit } = get();
    if (!rateLimit) return false;

    return rateLimit.remaining < rateLimit.limit * 0.05; // Less than 5%
  },
}));
