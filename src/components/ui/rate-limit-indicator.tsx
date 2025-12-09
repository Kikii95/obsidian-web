"use client";

import { useState } from "react";
import { useRateLimitStore } from "@/lib/rate-limit-store";
import { Activity, AlertTriangle, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function RateLimitIndicator() {
  const { rateLimit, getRemainingTime, getUsagePercent, isLow, isCritical } =
    useRateLimitStore();
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Don't show if no rate limit data yet
  if (!rateLimit) {
    return null;
  }

  const usagePercent = getUsagePercent();
  const remainingMinutes = getRemainingTime();
  const low = isLow();
  const critical = isCritical();

  // Format remaining time
  const formatTime = (minutes: number) => {
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  // Color based on usage
  const getColor = () => {
    if (critical) return "text-destructive";
    if (low) return "text-yellow-500";
    return "text-muted-foreground";
  };

  // Progress bar color
  const getProgressColor = () => {
    if (critical) return "bg-destructive";
    if (low) return "bg-yellow-500";
    return "bg-primary";
  };

  // Shared content for both tooltip and popover
  const detailsContent = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">GitHub API</span>
        <span className="font-medium">{usagePercent}% utilisé</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full transition-all", getProgressColor())}
          style={{ width: `${usagePercent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Restant</span>
          <p className="font-medium">
            {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Reset dans</span>
          <p className="font-medium flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(remainingMinutes)}
          </p>
        </div>
      </div>

      {critical && (
        <p className="text-xs text-destructive font-medium">
          ⚠️ Rate limit critique ! Réduis les actions.
        </p>
      )}
      {low && !critical && (
        <p className="text-xs text-yellow-600 font-medium">
          ⚡ Rate limit bas. Reset bientôt.
        </p>
      )}
    </div>
  );

  // Trigger button
  const triggerButton = (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors",
        low && "bg-yellow-500/10",
        critical && "bg-destructive/10"
      )}
    >
      {critical ? (
        <AlertTriangle className={cn("h-3.5 w-3.5", getColor())} />
      ) : (
        <Activity className={cn("h-3.5 w-3.5", getColor())} />
      )}
      <span className={cn("font-mono", getColor())}>
        {rateLimit.remaining.toLocaleString()}
      </span>
    </div>
  );

  return (
    <>
      {/* Mobile: Popover (click) */}
      <div className="md:hidden">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            {triggerButton}
          </PopoverTrigger>
          <PopoverContent side="bottom" className="w-56">
            {detailsContent}
          </PopoverContent>
        </Popover>
      </div>

      {/* Desktop: Tooltip (hover) */}
      <div className="hidden md:block">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {triggerButton}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="w-56">
              {detailsContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );
}
