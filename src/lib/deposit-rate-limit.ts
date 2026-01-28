/**
 * In-memory rate limiter for deposit uploads
 * Tracks uploads per IP per share and per share total
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory stores with TTL
const ipMinuteStore = new Map<string, RateLimitEntry>();
const shareHourStore = new Map<string, RateLimitEntry>();

// Rate limit configuration
const LIMITS = {
  filesPerMinutePerIP: 10,
  filesPerHourPerShare: 100,
  minuteWindowMs: 60 * 1000, // 1 minute
  hourWindowMs: 60 * 60 * 1000, // 1 hour
};

// Cleanup interval (run every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Clean up expired entries from the stores
 */
function cleanupExpiredEntries() {
  const now = Date.now();

  // Clean IP minute store
  for (const [key, entry] of ipMinuteStore.entries()) {
    if (now - entry.windowStart > LIMITS.minuteWindowMs) {
      ipMinuteStore.delete(key);
    }
  }

  // Clean share hour store
  for (const [key, entry] of shareHourStore.entries()) {
    if (now - entry.windowStart > LIMITS.hourWindowMs) {
      shareHourStore.delete(key);
    }
  }
}

// Start cleanup interval (only in Node.js runtime)
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number; // seconds until reset
  reason?: "ip_limit" | "share_limit";
}

/**
 * Check if an upload is allowed based on rate limits
 */
export function checkRateLimit(ip: string, token: string): RateLimitResult {
  const now = Date.now();

  // Check IP minute limit
  const ipKey = `${ip}:${token}`;
  const ipEntry = ipMinuteStore.get(ipKey);

  if (ipEntry) {
    const elapsed = now - ipEntry.windowStart;

    if (elapsed < LIMITS.minuteWindowMs) {
      if (ipEntry.count >= LIMITS.filesPerMinutePerIP) {
        const retryAfter = Math.ceil((LIMITS.minuteWindowMs - elapsed) / 1000);
        return {
          allowed: false,
          remaining: 0,
          retryAfter,
          reason: "ip_limit",
        };
      }
      return {
        allowed: true,
        remaining: LIMITS.filesPerMinutePerIP - ipEntry.count,
      };
    }
    // Window expired, will be reset on record
  }

  // Check share hour limit
  const shareEntry = shareHourStore.get(token);

  if (shareEntry) {
    const elapsed = now - shareEntry.windowStart;

    if (elapsed < LIMITS.hourWindowMs) {
      if (shareEntry.count >= LIMITS.filesPerHourPerShare) {
        const retryAfter = Math.ceil((LIMITS.hourWindowMs - elapsed) / 1000);
        return {
          allowed: false,
          remaining: 0,
          retryAfter,
          reason: "share_limit",
        };
      }
    }
  }

  // Calculate remaining for IP (default to max if no entry)
  const ipRemaining = ipEntry
    ? Math.max(0, LIMITS.filesPerMinutePerIP - ipEntry.count)
    : LIMITS.filesPerMinutePerIP;

  return {
    allowed: true,
    remaining: ipRemaining,
  };
}

/**
 * Record an upload for rate limiting purposes
 * Call this AFTER a successful upload
 */
export function recordUpload(ip: string, token: string): void {
  const now = Date.now();

  // Update IP minute counter
  const ipKey = `${ip}:${token}`;
  const ipEntry = ipMinuteStore.get(ipKey);

  if (ipEntry && now - ipEntry.windowStart < LIMITS.minuteWindowMs) {
    ipEntry.count++;
  } else {
    ipMinuteStore.set(ipKey, { count: 1, windowStart: now });
  }

  // Update share hour counter
  const shareEntry = shareHourStore.get(token);

  if (shareEntry && now - shareEntry.windowStart < LIMITS.hourWindowMs) {
    shareEntry.count++;
  } else {
    shareHourStore.set(token, { count: 1, windowStart: now });
  }
}

/**
 * Get current rate limit status for debugging/display
 */
export function getRateLimitStatus(ip: string, token: string): {
  ipUploadsThisMinute: number;
  shareUploadsThisHour: number;
  ipLimit: number;
  shareLimit: number;
} {
  const now = Date.now();

  const ipKey = `${ip}:${token}`;
  const ipEntry = ipMinuteStore.get(ipKey);
  const shareEntry = shareHourStore.get(token);

  let ipCount = 0;
  if (ipEntry && now - ipEntry.windowStart < LIMITS.minuteWindowMs) {
    ipCount = ipEntry.count;
  }

  let shareCount = 0;
  if (shareEntry && now - shareEntry.windowStart < LIMITS.hourWindowMs) {
    shareCount = shareEntry.count;
  }

  return {
    ipUploadsThisMinute: ipCount,
    shareUploadsThisHour: shareCount,
    ipLimit: LIMITS.filesPerMinutePerIP,
    shareLimit: LIMITS.filesPerHourPerShare,
  };
}
