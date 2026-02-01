"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Bug,
  Zap,
  ChevronDown,
  ChevronRight,
  Gift,
} from "lucide-react";
import { patchNotes, type PatchNote, type PatchNoteItem } from "@/data/patch-notes";
import { useWhatsNewStore } from "@/lib/whats-new-store";
import { cn } from "@/lib/utils";

interface WhatsNewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryConfig = {
  features: {
    icon: Sparkles,
    label: "Nouvelles Features",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  fixes: {
    icon: Bug,
    label: "Corrections",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  improvements: {
    icon: Zap,
    label: "Ameliorations",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
};

export function WhatsNewModal({ open, onOpenChange }: WhatsNewModalProps) {
  const { markAsSeen } = useWhatsNewStore();
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    new Set([patchNotes[0]?.version])
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const versionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      markAsSeen();
    }
    onOpenChange(isOpen);
  };

  // Store ref for each version section
  const setVersionRef = useCallback((version: string, el: HTMLDivElement | null) => {
    if (el) {
      versionRefs.current.set(version, el);
    } else {
      versionRefs.current.delete(version);
    }
  }, []);

  // Accordion mode: only one version open at a time + scroll to top
  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) => {
      if (prev.has(version)) {
        return new Set();
      } else {
        // Scroll to the clicked version after state update
        setTimeout(() => {
          const el = versionRefs.current.get(version);
          if (el && scrollContainerRef.current) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 50);
        return new Set([version]);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-5xl sm:max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Quoi de neuf ?
          </DialogTitle>
          <DialogDescription>
            Dernieres nouveautes d&apos;Obsidian Web
          </DialogDescription>
        </DialogHeader>

        {/* Custom scroll container with visible scrollbar */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "hsl(var(--muted-foreground) / 0.3) transparent",
          }}
        >
          <div className="space-y-3 pb-2">
            {patchNotes.map((release) => (
              <ReleaseSection
                key={release.version}
                ref={(el) => setVersionRef(release.version, el)}
                release={release}
                isExpanded={expandedVersions.has(release.version)}
                isLatest={release.version === patchNotes[0]?.version}
                onToggle={() => toggleVersion(release.version)}
              />
            ))}
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button onClick={() => handleClose(false)}>
            C&apos;est compris !
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { forwardRef } from "react";

const ReleaseSection = forwardRef<HTMLDivElement, {
  release: PatchNote;
  isExpanded: boolean;
  isLatest: boolean;
  onToggle: () => void;
}>(({ release, isExpanded, isLatest, onToggle }, ref) => {
  const hasContent =
    release.features.length > 0 ||
    release.fixes.length > 0 ||
    release.improvements.length > 0;

  return (
    <div ref={ref} className="rounded-lg border">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-3 text-left",
          "hover:bg-muted/50 transition-colors rounded-t-lg",
          "focus:outline-none focus-visible:ring-0",
          !isExpanded && "rounded-b-lg"
        )}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-semibold">v{release.version}</span>
          {isLatest && (
            <Badge variant="default" className="text-xs">
              Nouveau
            </Badge>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {formatDate(release.date)}
        </span>
      </button>

      {isExpanded && hasContent && (
        <div className="px-3 pb-3 space-y-3">
          {release.features.length > 0 && (
            <CategorySection type="features" items={release.features} />
          )}
          {release.improvements.length > 0 && (
            <CategorySection type="improvements" items={release.improvements} />
          )}
          {release.fixes.length > 0 && (
            <CategorySection type="fixes" items={release.fixes} />
          )}
        </div>
      )}
    </div>
  );
});

ReleaseSection.displayName = "ReleaseSection";

function CategorySection({
  type,
  items,
}: {
  type: "features" | "fixes" | "improvements";
  items: PatchNoteItem[];
}) {
  const config = categoryConfig[type];
  const Icon = config.icon;

  return (
    <div>
      <div className={cn("flex items-center gap-2 mb-2", config.color)}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{config.label}</span>
        <Badge variant="secondary" className="text-xs">
          {items.length}
        </Badge>
      </div>
      <ul className="space-y-1.5 ml-6">
        {items.map((item, index) => (
          <li key={index} className="text-sm">
            <span className="font-medium">{item.title}</span>
            {item.description && (
              <span className="text-muted-foreground"> — {item.description}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
