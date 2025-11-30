"use client";

import { useEffect, useState, memo, useMemo, useRef } from "react";
import { githubClient } from "@/services/github-client";
import { Flame, Calendar, TrendingUp, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore, type ActivityPeriod } from "@/lib/settings-store";

interface ActivityData {
  activity: Array<{ date: string; count: number }>;
  stats: {
    totalCommits: number;
    activeDays: number;
    maxCommitsPerDay: number;
    avgCommitsPerDay: number;
    currentStreak: number;
    longestStreak: number;
    period: number;
  };
}

const PERIOD_OPTIONS: { value: ActivityPeriod; label: string }[] = [
  { value: "30", label: "30 jours" },
  { value: "90", label: "3 mois" },
  { value: "180", label: "6 mois" },
  { value: "365", label: "1 an" },
];

const MONTH_NAMES_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES_FULL = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function ActivityHeatmapComponent() {
  const { settings } = useSettingsStore();
  const [data, setData] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<ActivityPeriod>(settings.activityDefaultPeriod ?? "90");
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await githubClient.getActivity(parseInt(period));
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivity();
  }, [period]);

  // Generate weeks grid with month labels
  const { weeks, monthLabels, cellSize, cellGap } = useMemo(() => {
    if (!data || containerWidth === 0) return { weeks: [], monthLabels: [], cellSize: 10, cellGap: 2 };

    const days = parseInt(period);
    const activityMap = new Map(
      data.activity.map((a) => [a.date, a.count])
    );

    // Build days array
    const allDays: Array<{ date: string; count: number; dayOfWeek: number; month: number }> = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      allDays.push({
        date: dateStr,
        count: activityMap.get(dateStr) || 0,
        dayOfWeek: date.getDay(),
        month: date.getMonth(),
      });
    }

    // Build weeks array (with padding for first week)
    const weeksArr: Array<Array<{ date: string; count: number; dayOfWeek: number; month: number }>> = [];
    let currentWeek: typeof allDays = [];

    // Pad first week
    if (allDays.length > 0) {
      const firstDayOfWeek = allDays[0].dayOfWeek;
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({ date: "", count: -1, dayOfWeek: i, month: -1 });
      }
    }

    for (const day of allDays) {
      currentWeek.push(day);
      if (day.dayOfWeek === 6) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      weeksArr.push(currentWeek);
    }

    // Calculate cell size to fit container
    const numWeeks = weeksArr.length;
    const availableWidth = containerWidth - 12; // padding
    const gap = 2;
    const calculatedSize = Math.floor((availableWidth - (numWeeks - 1) * gap) / numWeeks);
    const finalSize = Math.min(Math.max(calculatedSize, 6), 14); // min 6, max 14

    // Calculate month labels (at week boundaries)
    const labels: Array<{ month: string; weekIndex: number }> = [];
    let lastMonth = -1;

    weeksArr.forEach((week, weekIdx) => {
      // Find first valid day in this week
      const firstValidDay = week.find(d => d.month >= 0);
      if (firstValidDay && firstValidDay.month !== lastMonth) {
        // Only add label if it's not too close to previous (at least 3 weeks apart for short periods)
        const minGap = period === "30" ? 2 : period === "90" ? 3 : 4;
        const lastLabel = labels[labels.length - 1];
        if (!lastLabel || weekIdx - lastLabel.weekIndex >= minGap) {
          labels.push({
            month: period === "30" ? MONTH_NAMES_FULL[firstValidDay.month] : MONTH_NAMES_SHORT[firstValidDay.month],
            weekIndex: weekIdx
          });
        }
        lastMonth = firstValidDay.month;
      }
    });

    return { weeks: weeksArr, monthLabels: labels, cellSize: finalSize, cellGap: gap };
  }, [data, period, containerWidth]);

  // Get intensity level (0-4)
  const getIntensity = (count: number): number => {
    if (!data || count === 0) return 0;
    const max = data.stats.maxCommitsPerDay;
    if (count >= max * 0.75) return 4;
    if (count >= max * 0.5) return 3;
    if (count >= max * 0.25) return 2;
    return 1;
  };

  // Intensity colors using CSS variables
  const getColor = (intensity: number): string => {
    switch (intensity) {
      case 0:
        return "bg-muted/50";
      case 1:
        return "bg-primary/25";
      case 2:
        return "bg-primary/50";
      case 3:
        return "bg-primary/75";
      case 4:
        return "bg-primary";
      default:
        return "bg-muted/50";
    }
  };

  // Total grid width for positioning
  const totalGridWidth = weeks.length * cellSize + (weeks.length - 1) * cellGap;

  // Always render container for measurement
  return (
    <div className="h-full flex flex-col p-3" ref={containerRef}>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {error}
        </div>
      ) : !data || weeks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Chargement...
        </div>
      ) : (
        <>
      {/* Header with period selector */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Flame className="h-4 w-4 text-primary" />
          <span>Activité</span>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as ActivityPeriod)}>
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Heatmap container - centered */}
      <div className="flex-1 flex flex-col justify-center items-center overflow-hidden">
        <div>
          {/* Month labels - positioned above grid */}
          <div className="relative h-4 mb-1" style={{ width: `${totalGridWidth}px` }}>
            {monthLabels.map((label, idx) => (
              <span
                key={idx}
                className="absolute text-[9px] text-muted-foreground whitespace-nowrap"
                style={{
                  left: `${label.weekIndex * (cellSize + cellGap)}px`,
                }}
              >
                {label.month}
              </span>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex" style={{ gap: `${cellGap}px` }}>
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col" style={{ gap: `${cellGap}px` }}>
              {week.map((day, dayIdx) => (
                <div
                  key={`${weekIdx}-${dayIdx}`}
                  className={`rounded-[2px] ${
                    day.count === -1 ? "bg-transparent" : getColor(getIntensity(day.count))
                  }`}
                  style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                  title={
                    day.count >= 0
                      ? `${day.date}: ${day.count} commit${day.count !== 1 ? "s" : ""}`
                      : ""
                  }
                />
              ))}
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2">
        <span>Moins</span>
        <div className="flex" style={{ gap: `${cellGap}px` }}>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`rounded-[2px] ${getColor(level)}`}
              style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
            />
          ))}
        </div>
        <span>Plus</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Flame className="h-3 w-3" />
            <span className="text-[10px]">Streak</span>
          </div>
          <p className="text-sm font-semibold">{data.stats.currentStreak}j</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Calendar className="h-3 w-3" />
            <span className="text-[10px]">Jours actifs</span>
          </div>
          <p className="text-sm font-semibold">{data.stats.activeDays}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" />
            <span className="text-[10px]">Total</span>
          </div>
          <p className="text-sm font-semibold">{data.stats.totalCommits}</p>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default memo(ActivityHeatmapComponent);
