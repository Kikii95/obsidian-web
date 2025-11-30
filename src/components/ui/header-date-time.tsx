"use client";

import { useState, useEffect } from "react";
import { useSettingsStore, type DateFormat } from "@/lib/settings-store";
import { Calendar, Clock } from "lucide-react";

function formatDate(date: Date, format: DateFormat): string {
  switch (format) {
    case "fr":
      return date.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    case "en":
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    case "iso":
      return date.toISOString().split("T")[0];
    default:
      return date.toLocaleDateString();
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HeaderDateTime() {
  const { settings } = useSettingsStore();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial date on client side only
    setNow(new Date());

    // Update every minute
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Don't render if setting is off or not hydrated yet
  if (!settings.showDateTime || !now) {
    return null;
  }

  const dateFormat = settings.dateFormat ?? "fr";

  return (
    <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        <span>{formatDate(now, dateFormat)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        <span>{formatTime(now)}</span>
      </div>
    </div>
  );
}
