"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleContentProps {
  hidden: string;
  visible: string;
}

/**
 * Collapsible content component for (hidden::visible) syntax
 * Shows "visible" text by default, click to reveal "hidden" content
 */
export function CollapsibleContent({ hidden, visible }: CollapsibleContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded",
          "bg-primary/10 hover:bg-primary/20 transition-colors",
          "text-primary cursor-pointer border-none"
        )}
        title={isExpanded ? "Cliquer pour masquer" : "Cliquer pour révéler"}
      >
        <span>{visible}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </button>
      {isExpanded && (
        <span className="ml-1 text-muted-foreground italic">
          {hidden}
        </span>
      )}
    </span>
  );
}
