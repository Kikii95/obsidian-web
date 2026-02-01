"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface DataPoint {
  date: string;
  count: number;
}

interface AnalyticsChartProps {
  data: DataPoint[];
  height?: number;
  className?: string;
}

export function AnalyticsChart({ data, height = 200, className }: AnalyticsChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { points: [], maxValue: 0, labels: [] };

    const maxValue = Math.max(...data.map((d) => d.count), 1);
    const width = 100; // percentage
    const padding = 5;

    const points = data.map((d, i) => {
      const x = padding + ((width - padding * 2) * i) / Math.max(data.length - 1, 1);
      const y = 100 - padding - ((100 - padding * 2) * d.count) / maxValue;
      return { x, y, date: d.date, count: d.count };
    });

    // Generate labels (first, middle, last)
    const labels: { x: number; label: string }[] = [];
    if (data.length > 0) {
      labels.push({ x: points[0].x, label: formatDateLabel(data[0].date) });
      if (data.length > 2) {
        const mid = Math.floor(data.length / 2);
        labels.push({ x: points[mid].x, label: formatDateLabel(data[mid].date) });
      }
      if (data.length > 1) {
        labels.push({ x: points[points.length - 1].x, label: formatDateLabel(data[data.length - 1].date) });
      }
    }

    return { points, maxValue, labels };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground", className)} style={{ height }}>
        Aucune donnée
      </div>
    );
  }

  // Generate SVG path for the line
  const linePath = chartData.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Generate area path (fill under the line)
  const areaPath = `${linePath} L ${chartData.points[chartData.points.length - 1].x} 95 L ${chartData.points[0].x} 95 Z`;

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {/* Grid lines */}
        <line x1="5" y1="25" x2="95" y2="25" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
        <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
        <line x1="5" y1="75" x2="95" y2="75" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />

        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#gradient)"
          opacity="0.3"
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Data points */}
        {chartData.points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="1.5"
            fill="hsl(var(--primary))"
            className="hover:r-3 transition-all"
          >
            <title>{`${point.date}: ${point.count} vue(s)`}</title>
          </circle>
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-muted-foreground">
        {chartData.labels.map((label, i) => (
          <span key={i}>{label.label}</span>
        ))}
      </div>

      {/* Y-axis labels */}
      <div className="absolute top-0 left-0 bottom-6 flex flex-col justify-between text-xs text-muted-foreground">
        <span>{chartData.maxValue}</span>
        <span>{Math.round(chartData.maxValue / 2)}</span>
        <span>0</span>
      </div>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
}

// Stat cards
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend && (
          <span
            className={cn(
              "text-sm",
              trend.positive ? "text-green-500" : "text-red-500"
            )}
          >
            {trend.positive ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

// Distribution chart (bar/pie alternative)
interface DistributionItem {
  label: string;
  count: number;
}

interface DistributionChartProps {
  data: DistributionItem[];
  title: string;
  className?: string;
}

export function DistributionChart({ data, title, className }: DistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {data.slice(0, 5).map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>{item.label}</span>
              <span className="text-muted-foreground">
                {item.count} ({total > 0 ? Math.round((item.count / total) * 100) : 0}%)
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
