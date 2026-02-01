"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  Quote,
  ListTodo,
  Bug,
  HelpCircle,
  Flame,
  Zap,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type CalloutType =
  | "note"
  | "info"
  | "tip"
  | "hint"
  | "warning"
  | "caution"
  | "danger"
  | "error"
  | "bug"
  | "success"
  | "check"
  | "question"
  | "help"
  | "quote"
  | "cite"
  | "todo"
  | "example"
  | "abstract"
  | "summary"
  | "tldr"
  | "important"
  | "attention";

interface CalloutConfig {
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  titleColor: string;
}

const calloutConfigs: Record<CalloutType, CalloutConfig> = {
  note: {
    icon: FileText,
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/50",
    iconColor: "text-blue-500",
    titleColor: "text-blue-500",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/50",
    iconColor: "text-blue-500",
    titleColor: "text-blue-500",
  },
  tip: {
    icon: Lightbulb,
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/50",
    iconColor: "text-cyan-500",
    titleColor: "text-cyan-500",
  },
  hint: {
    icon: Lightbulb,
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/50",
    iconColor: "text-cyan-500",
    titleColor: "text-cyan-500",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/50",
    iconColor: "text-amber-500",
    titleColor: "text-amber-500",
  },
  caution: {
    icon: AlertTriangle,
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/50",
    iconColor: "text-amber-500",
    titleColor: "text-amber-500",
  },
  danger: {
    icon: Flame,
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/50",
    iconColor: "text-red-500",
    titleColor: "text-red-500",
  },
  error: {
    icon: XCircle,
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/50",
    iconColor: "text-red-500",
    titleColor: "text-red-500",
  },
  bug: {
    icon: Bug,
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/50",
    iconColor: "text-red-500",
    titleColor: "text-red-500",
  },
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/50",
    iconColor: "text-green-500",
    titleColor: "text-green-500",
  },
  check: {
    icon: CheckCircle,
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/50",
    iconColor: "text-green-500",
    titleColor: "text-green-500",
  },
  question: {
    icon: HelpCircle,
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/50",
    iconColor: "text-purple-500",
    titleColor: "text-purple-500",
  },
  help: {
    icon: HelpCircle,
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/50",
    iconColor: "text-purple-500",
    titleColor: "text-purple-500",
  },
  quote: {
    icon: Quote,
    bgColor: "bg-muted/50",
    borderColor: "border-muted-foreground/30",
    iconColor: "text-muted-foreground",
    titleColor: "text-muted-foreground",
  },
  cite: {
    icon: Quote,
    bgColor: "bg-muted/50",
    borderColor: "border-muted-foreground/30",
    iconColor: "text-muted-foreground",
    titleColor: "text-muted-foreground",
  },
  todo: {
    icon: ListTodo,
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/50",
    iconColor: "text-indigo-500",
    titleColor: "text-indigo-500",
  },
  example: {
    icon: Zap,
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/50",
    iconColor: "text-violet-500",
    titleColor: "text-violet-500",
  },
  abstract: {
    icon: FileText,
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/50",
    iconColor: "text-teal-500",
    titleColor: "text-teal-500",
  },
  summary: {
    icon: FileText,
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/50",
    iconColor: "text-teal-500",
    titleColor: "text-teal-500",
  },
  tldr: {
    icon: FileText,
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/50",
    iconColor: "text-teal-500",
    titleColor: "text-teal-500",
  },
  important: {
    icon: Flame,
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/50",
    iconColor: "text-orange-500",
    titleColor: "text-orange-500",
  },
  attention: {
    icon: AlertTriangle,
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/50",
    iconColor: "text-orange-500",
    titleColor: "text-orange-500",
  },
};

interface CalloutProps {
  type: string;
  title?: string;
  foldable?: boolean;
  defaultFolded?: boolean;
  children: React.ReactNode;
}

export function Callout({
  type,
  title,
  foldable = false,
  defaultFolded = false,
  children,
}: CalloutProps) {
  const [isOpen, setIsOpen] = useState(!defaultFolded);

  const calloutType = type.toLowerCase() as CalloutType;
  const config = calloutConfigs[calloutType] || calloutConfigs.note;
  const Icon = config.icon;

  const displayTitle = title || type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div
      className={cn(
        "my-4 rounded-lg border-l-4 overflow-hidden",
        config.bgColor,
        config.borderColor
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2",
          foldable && "cursor-pointer hover:opacity-80 select-none"
        )}
        onClick={foldable ? () => setIsOpen(!isOpen) : undefined}
      >
        {foldable && (
          <span className={config.iconColor}>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
        <Icon className={cn("h-5 w-5", config.iconColor)} />
        <span className={cn("font-semibold", config.titleColor)}>
          {displayTitle}
        </span>
      </div>
      {(!foldable || isOpen) && (
        <div className="px-4 pb-3 pt-0 text-foreground/90 prose prose-sm prose-invert max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Parse callout syntax from blockquote first line
 * Supports: [!type], [!type|title], [!type]+ (unfold), [!type]- (fold)
 */
export function parseCalloutSyntax(firstLine: string): {
  isCallout: boolean;
  type?: string;
  title?: string;
  foldable?: boolean;
  defaultFolded?: boolean;
} {
  // Match [!type] or [!type|title] with optional +/- suffix
  const match = firstLine.match(/^\[!(\w+)\]([+-])?\s*(.*)$/i);

  if (!match) {
    return { isCallout: false };
  }

  const [, type, foldModifier, title] = match;

  return {
    isCallout: true,
    type,
    title: title || undefined,
    foldable: !!foldModifier,
    defaultFolded: foldModifier === "-",
  };
}
