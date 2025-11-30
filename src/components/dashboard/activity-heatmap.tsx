"use client";

import { useEffect, useState, memo, useMemo } from "react";
import { githubClient } from "@/services/github-client";
import { Flame, Calendar, TrendingUp, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type PeriodOption = "30" | "90" | "180" | "365";

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: "30", label: "30 jours" },
  { value: "90", label: "3 mois" },
  { value: "180", label: "6 mois" },
  { value: "365", label: "1 an" },
];

// Cell size based on period (smaller period = bigger cells)
const CELL_SIZES: Record<PeriodOption, { size: number; gap: number }> = {
  "30": { size: 18, gap: 3 },
  "90": { size: 14, gap: 2 },
  "180": { size: 12, gap: 2 },
  "365": { size: 10, gap: 2 },
};

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function ActivityHeatmapComponent() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodOption>("90");

  const { size: cellSize, gap: cellGap } = CELL_SIZES[period];

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

  // Generate grid of days with month info
  const { grid, monthLabels } = useMemo(() => {
    if (!data) return { grid: [], monthLabels: [] };

    const days = parseInt(period);
    const activityMap = new Map(
      data.activity.map((a) => [a.date, a.count])
    );

    const result: Array<{ date: string; count: number; dayOfWeek: number; month: number }> = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      result.push({
        date: dateStr,
        count: activityMap.get(dateStr) || 0,
        dayOfWeek: date.getDay(),
        month: date.getMonth(),
      });
    }

    // Calculate month labels positions
    const labels: Array<{ month: string; weekIndex: number }> = [];
    let lastMonth = -1;
    let weekIndex = 0;
    let dayInWeek = result[0]?.dayOfWeek || 0;

    for (const day of result) {
      if (day.month !== lastMonth) {
        labels.push({ month: MONTH_NAMES[day.month], weekIndex });
        lastMonth = day.month;
      }
      dayInWeek++;
      if (dayInWeek > 6) {
        dayInWeek = 0;
        weekIndex++;
      }
    }

    return { grid: result, monthLabels: labels };
  }, [data, period]);

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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        {error}
      </div>
    );
  }

  if (!data) return null;

  // Calculate weeks for grid layout
  const weeks: Array<typeof grid> = [];
  let currentWeek: typeof grid = [];

  // Pad the first week if needed
  if (grid.length > 0) {
    const firstDayOfWeek = grid[0].dayOfWeek;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: "", count: -1, dayOfWeek: i, month: -1 });
    }
  }

  for (const day of grid) {
    currentWeek.push(day);
    if (day.dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return (
    <div className="h-full flex flex-col p-3">
      {/* Header with period selector */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Flame className="h-4 w-4 text-primary" />
          <span>Activité</span>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
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

      {/* Month labels */}
      <div className="flex overflow-hidden mb-1" style={{ paddingLeft: 0 }}>
        <div className="flex" style={{ gap: `${cellGap}px` }}>
          {monthLabels.map((label, idx) => (
            <div
              key={idx}
              className="text-[10px] text-muted-foreground"
              style={{
                position: "relative",
                left: `${label.weekIndex * (cellSize + cellGap)}px`,
                marginRight: idx < monthLabels.length - 1
                  ? `${(monthLabels[idx + 1]?.weekIndex - label.weekIndex - 1) * (cellSize + cellGap) - 20}px`
                  : 0,
              }}
            >
              {label.month}
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
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
    </div>
  );
}

export default memo(ActivityHeatmapComponent);
