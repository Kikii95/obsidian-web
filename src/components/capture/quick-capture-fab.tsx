"use client";

import { useState, useCallback } from "react";
import { Plus, CloudOff } from "lucide-react";
import { useCaptureStore } from "@/lib/capture-store";
import { useVaultStore } from "@/lib/store";
import { QuickCaptureModal } from "./quick-capture-modal";
import { cn } from "@/lib/utils";

interface QuickCaptureFABProps {
  className?: string;
}

export function QuickCaptureFAB({ className }: QuickCaptureFABProps) {
  const { isOpen, setIsOpen, queue, addToQueue } = useCaptureStore();
  const { triggerTreeRefresh } = useVaultStore();
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );

  // Track online status
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => setIsOnline(true));
    window.addEventListener("offline", () => setIsOnline(false));
  }

  // Pending captures count
  const pendingCount = queue.filter((item) => !item.synced).length;

  // Save capture to vault
  const handleSave = useCallback(
    async (content: string, targetFolder: string, appendToDaily: boolean, customFilename: string) => {
      // Check online status
      if (!isOnline) {
        // Queue for later
        addToQueue({ content, targetFolder, appendToDaily, customFilename });
        return;
      }

      // Create the note content
      const timestamp = new Date().toISOString();
      const date = new Date().toISOString().split("T")[0];

      if (appendToDaily) {
        // Append to daily note
        const dailyPath = `Daily/${date}.md`;
        const appendContent = `\n\n---\n\n**${new Date().toLocaleTimeString()}**\n\n${content}`;

        // Try to append
        const response = await fetch("/api/github/append", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: dailyPath,
            content: appendContent,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          // If daily note doesn't exist, create it
          if (data.code === "NOT_FOUND") {
            const createResponse = await fetch("/api/github/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                path: dailyPath,
                content: `# ${date}\n\n**${new Date().toLocaleTimeString()}**\n\n${content}`,
              }),
            });

            if (!createResponse.ok) {
              throw new Error("Failed to create daily note");
            }
            // Refresh sidebar to show new daily note
            triggerTreeRefresh();
          } else {
            throw new Error("Failed to append to daily note");
          }
        }
      } else {
        // Create new capture note
        // Use custom filename if provided, otherwise auto-generate from content
        let fileName: string;
        if (customFilename) {
          // Sanitize custom filename and add .md extension if needed
          fileName = customFilename.replace(/[/\\?%*:|"<>]/g, "-");
          if (!fileName.endsWith(".md")) {
            fileName += ".md";
          }
        } else {
          // Auto-generate from first line of content
          const title = content.split("\n")[0].slice(0, 50).trim() || "Quick Capture";
          const sanitizedTitle = title.replace(/[/\\?%*:|"<>]/g, "-");
          fileName = `${sanitizedTitle}-${timestamp.replace(/[:.]/g, "-")}.md`;
        }

        const folder = targetFolder || "Captures";
        const finalPath = `${folder}/${fileName}`;

        const frontmatter = `---
created: ${timestamp}
tags: [capture]
---

`;
        const finalContent = frontmatter + content;

        const response = await fetch("/api/github/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: finalPath,
            content: finalContent,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save capture");
        }

        // Refresh sidebar to show new capture
        triggerTreeRefresh();
      }
    },
    [isOnline, addToQueue, triggerTreeRefresh]
  );

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40",
          "flex items-center justify-center",
          "w-14 h-14 rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-lg hover:shadow-xl",
          "hover:scale-105 active:scale-95",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
          className
        )}
        title="Quick Capture"
      >
        <Plus className="h-6 w-6" />

        {/* Pending count badge */}
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold bg-amber-500 text-white rounded-full">
            {pendingCount}
          </span>
        )}

        {/* Offline indicator */}
        {!isOnline && (
          <span className="absolute -bottom-1 -left-1 flex items-center justify-center w-5 h-5 bg-muted rounded-full">
            <CloudOff className="h-3 w-3 text-muted-foreground" />
          </span>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <QuickCaptureModal
          onClose={() => setIsOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
