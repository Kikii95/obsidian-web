"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { X, ArrowLeftRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSplitViewStore } from "@/lib/split-view-store";
import { NotePicker } from "@/components/dialogs/note-picker";

interface SplitViewProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  leftTitle?: string;
  rightTitle?: string;
  leftPath?: string | null;
  rightPath?: string | null;
}

export function SplitView({
  leftContent,
  rightContent,
  leftTitle,
  rightTitle,
  leftPath,
  rightPath,
}: SplitViewProps) {
  const { splitRatio, setSplitRatio, closePane, swapPanes, openInSplit } = useSplitViewStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newRatio = (x / rect.width) * 100;
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, setSplitRatio]);

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* Left Pane */}
      <div
        className="flex flex-col overflow-hidden border-r border-border/50"
        style={{ width: `${splitRatio}%` }}
      >
        <PaneHeader
          title={leftTitle || "Left"}
          side="left"
          currentPath={leftPath}
          onClose={() => closePane("left")}
          onSwap={swapPanes}
          onSelectNote={(path) => openInSplit(path, "left")}
        />
        <div className="flex-1 overflow-auto">{leftContent}</div>
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          "w-1 cursor-col-resize bg-border/30 hover:bg-primary/50 transition-colors shrink-0",
          isDragging && "bg-primary"
        )}
        onMouseDown={handleMouseDown}
      />

      {/* Right Pane */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ width: `${100 - splitRatio}%` }}
      >
        <PaneHeader
          title={rightTitle || "Right"}
          side="right"
          currentPath={rightPath}
          onClose={() => closePane("right")}
          onSwap={swapPanes}
          onSelectNote={(path) => openInSplit(path, "right")}
        />
        <div className="flex-1 overflow-auto">{rightContent}</div>
      </div>
    </div>
  );
}

interface PaneHeaderProps {
  title: string;
  side: "left" | "right";
  currentPath?: string | null;
  onClose: () => void;
  onSwap: () => void;
  onSelectNote: (path: string) => void;
}

function PaneHeader({ title, side, currentPath, onClose, onSwap, onSelectNote }: PaneHeaderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/50 shrink-0">
        <span className="text-sm font-medium truncate">{title}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setPickerOpen(true)}
            title="Changer de note"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onSwap}
            title="Échanger les panneaux"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
            title={`Fermer le panneau ${side === "left" ? "gauche" : "droite"}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <NotePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={onSelectNote}
        currentPath={currentPath}
        title={`Sélectionner une note (${side === "left" ? "gauche" : "droite"})`}
      />
    </>
  );
}
