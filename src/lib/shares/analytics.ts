import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { db, shareAccessLogs, shares, type NewShareAccessLog } from "@/lib/db";

/**
 * Parse user agent string to extract device, browser, and OS info
 */
export function parseUserAgent(ua: string | null): {
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  os: string;
} {
  if (!ua) {
    return { device: "desktop", browser: "Unknown", os: "Unknown" };
  }

  // Device detection
  let device: "mobile" | "tablet" | "desktop" = "desktop";
  if (/iPad|Android(?!.*Mobile)/i.test(ua)) {
    device = "tablet";
  } else if (/Mobile|Android|iPhone|iPod/i.test(ua)) {
    device = "mobile";
  }

  // Browser detection
  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Opera|OPR/i.test(ua)) browser = "Opera";

  // OS detection
  let os = "Unknown";
  if (/Windows NT 10/i.test(ua)) os = "Windows 10/11";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua) && !/Android/i.test(ua)) os = "Linux";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";

  return { device, browser, os };
}

/**
 * Log a share access with metadata
 */
export async function logShareAccess(params: {
  shareId: string;
  userAgent?: string;
  country?: string;
  city?: string;
  referer?: string;
}): Promise<void> {
  const { device, browser, os } = parseUserAgent(params.userAgent || null);

  const log: NewShareAccessLog = {
    shareId: params.shareId,
    userAgent: params.userAgent?.slice(0, 512),
    country: params.country,
    city: params.city,
    referer: params.referer?.slice(0, 512),
    device,
    browser,
    os,
  };

  await db.insert(shareAccessLogs).values(log);
}

/**
 * Get analytics for a specific share
 */
export async function getShareAnalytics(
  shareId: string,
  days: number = 30
): Promise<{
  totalViews: number;
  uniqueDays: number;
  byDay: { date: string; count: number }[];
  byDevice: { device: string; count: number }[];
  byBrowser: { browser: string; count: number }[];
  byCountry: { country: string; count: number }[];
  recentAccess: { accessedAt: Date; country: string | null; device: string | null }[];
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Total views
  const [totalResult] = await db
    .select({ count: count() })
    .from(shareAccessLogs)
    .where(
      and(
        eq(shareAccessLogs.shareId, shareId),
        gte(shareAccessLogs.accessedAt, startDate)
      )
    );
  const totalViews = totalResult?.count || 0;

  // Views by day
  const byDayResult = await db
    .select({
      date: sql<string>`DATE(${shareAccessLogs.accessedAt})::text`,
      count: count(),
    })
    .from(shareAccessLogs)
    .where(
      and(
        eq(shareAccessLogs.shareId, shareId),
        gte(shareAccessLogs.accessedAt, startDate)
      )
    )
    .groupBy(sql`DATE(${shareAccessLogs.accessedAt})`)
    .orderBy(sql`DATE(${shareAccessLogs.accessedAt})`);

  // Views by device
  const byDeviceResult = await db
    .select({
      device: shareAccessLogs.device,
      count: count(),
    })
    .from(shareAccessLogs)
    .where(
      and(
        eq(shareAccessLogs.shareId, shareId),
        gte(shareAccessLogs.accessedAt, startDate)
      )
    )
    .groupBy(shareAccessLogs.device)
    .orderBy(desc(count()));

  // Views by browser
  const byBrowserResult = await db
    .select({
      browser: shareAccessLogs.browser,
      count: count(),
    })
    .from(shareAccessLogs)
    .where(
      and(
        eq(shareAccessLogs.shareId, shareId),
        gte(shareAccessLogs.accessedAt, startDate)
      )
    )
    .groupBy(shareAccessLogs.browser)
    .orderBy(desc(count()));

  // Views by country
  const byCountryResult = await db
    .select({
      country: shareAccessLogs.country,
      count: count(),
    })
    .from(shareAccessLogs)
    .where(
      and(
        eq(shareAccessLogs.shareId, shareId),
        gte(shareAccessLogs.accessedAt, startDate)
      )
    )
    .groupBy(shareAccessLogs.country)
    .orderBy(desc(count()));

  // Recent access (last 10)
  const recentResult = await db
    .select({
      accessedAt: shareAccessLogs.accessedAt,
      country: shareAccessLogs.country,
      device: shareAccessLogs.device,
    })
    .from(shareAccessLogs)
    .where(eq(shareAccessLogs.shareId, shareId))
    .orderBy(desc(shareAccessLogs.accessedAt))
    .limit(10);

  return {
    totalViews,
    uniqueDays: byDayResult.length,
    byDay: byDayResult.map((r) => ({ date: r.date, count: r.count })),
    byDevice: byDeviceResult.map((r) => ({ device: r.device || "Unknown", count: r.count })),
    byBrowser: byBrowserResult.map((r) => ({ browser: r.browser || "Unknown", count: r.count })),
    byCountry: byCountryResult.map((r) => ({ country: r.country || "Unknown", count: r.count })),
    recentAccess: recentResult,
  };
}

/**
 * Get aggregated analytics for all user's shares
 */
export async function getUserSharesAnalytics(
  userId: string,
  days: number = 30
): Promise<{
  totalViews: number;
  shareCount: number;
  byDay: { date: string; count: number }[];
  topShares: { token: string; name: string | null; folderPath: string; views: number }[];
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get user's share IDs
  const userShares = await db
    .select({ id: shares.id, token: shares.token, name: shares.name, folderPath: shares.folderPath })
    .from(shares)
    .where(eq(shares.userId, userId));

  if (userShares.length === 0) {
    return { totalViews: 0, shareCount: 0, byDay: [], topShares: [] };
  }

  const shareIds = userShares.map((s) => s.id);

  // Total views across all shares
  const [totalResult] = await db
    .select({ count: count() })
    .from(shareAccessLogs)
    .where(
      and(
        sql`${shareAccessLogs.shareId} = ANY(${shareIds})`,
        gte(shareAccessLogs.accessedAt, startDate)
      )
    );

  // Views by day across all shares
  const byDayResult = await db
    .select({
      date: sql<string>`DATE(${shareAccessLogs.accessedAt})::text`,
      count: count(),
    })
    .from(shareAccessLogs)
    .where(
      and(
        sql`${shareAccessLogs.shareId} = ANY(${shareIds})`,
        gte(shareAccessLogs.accessedAt, startDate)
      )
    )
    .groupBy(sql`DATE(${shareAccessLogs.accessedAt})`)
    .orderBy(sql`DATE(${shareAccessLogs.accessedAt})`);

  // Top shares by views
  const topSharesResult = await db
    .select({
      shareId: shareAccessLogs.shareId,
      count: count(),
    })
    .from(shareAccessLogs)
    .where(
      and(
        sql`${shareAccessLogs.shareId} = ANY(${shareIds})`,
        gte(shareAccessLogs.accessedAt, startDate)
      )
    )
    .groupBy(shareAccessLogs.shareId)
    .orderBy(desc(count()))
    .limit(10);

  const topShares = topSharesResult.map((r) => {
    const share = userShares.find((s) => s.id === r.shareId);
    return {
      token: share?.token || "",
      name: share?.name || null,
      folderPath: share?.folderPath || "",
      views: r.count,
    };
  });

  return {
    totalViews: totalResult?.count || 0,
    shareCount: userShares.length,
    byDay: byDayResult.map((r) => ({ date: r.date, count: r.count })),
    topShares,
  };
}
