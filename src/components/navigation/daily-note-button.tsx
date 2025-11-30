"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2 } from "lucide-react";
import { encodePathSegments } from "@/lib/path-utils";
import { useSettingsStore } from "@/lib/settings-store";

// Get today's date formatted as YYYY-MM-DD
function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// Get default daily note template
function getDailyNoteTemplate(date: string): string {
  const dateObj = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const formattedDate = dateObj.toLocaleDateString("fr-FR", options);

  return `---
date: ${date}
type: daily
tags: [daily]
---

# 📅 ${formattedDate}

## 🎯 Objectifs du jour

- [ ]

## 📝 Notes

## ✅ Accompli

## 💭 Réflexions

`;
}

export function DailyNoteButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { settings } = useSettingsStore();

  // Get daily notes folder from settings (default: "Daily")
  const dailyFolder = settings.dailyNotesFolder || "Daily";

  const handleClick = useCallback(async () => {
    setIsLoading(true);

    try {
      const today = getTodayDate();
      const notePath = `${dailyFolder}/${today}.md`;
      const noteRoute = `/note/${encodePathSegments(`${dailyFolder}/${today}`)}`;

      // First, try to read the note (check if it exists)
      const readRes = await fetch(
        `/api/github/read?path=${encodeURIComponent(notePath)}`
      );

      if (readRes.ok) {
        // Note exists, navigate to it
        router.push(noteRoute);
        return;
      }

      // Note doesn't exist, create it
      const content = getDailyNoteTemplate(today);

      const createRes = await fetch("/api/github/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: notePath,
          content,
          message: `📅 Daily note: ${today}`,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || "Failed to create daily note");
      }

      router.push(noteRoute);
    } catch (error) {
      console.error("Daily note error:", error);
      // Silently fail - the user will see the error in the UI
    } finally {
      setIsLoading(false);
    }
  }, [router, dailyFolder]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isLoading}
      title="Note du jour"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Calendar className="h-5 w-5" />
      )}
    </Button>
  );
}
