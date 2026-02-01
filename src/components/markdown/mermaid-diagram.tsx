"use client";

import { useState, useEffect, useRef, useId, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, Copy, Check, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

// Get computed CSS color value (resolves CSS variables)
function getCssColor(varName: string, fallback: string = "#888888"): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!value) return fallback;
  // Convert HSL value to full hsl() format if needed
  if (value.match(/^\d+\s+[\d.]+%\s+[\d.]+%$/)) {
    return `hsl(${value})`;
  }
  return value;
}

interface MermaidDiagramProps {
  code: string;
  className?: string;
}

export function MermaidDiagram({ code, className }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId().replace(/:/g, "_");
  const { resolvedTheme } = useTheme();

  // Build theme variables with resolved CSS colors
  const getThemeVariables = useCallback(() => {
    const isDark = resolvedTheme === "dark";
    return {
      primaryColor: getCssColor("--primary", isDark ? "#3b82f6" : "#2563eb"),
      primaryTextColor: getCssColor("--primary-foreground", isDark ? "#ffffff" : "#ffffff"),
      primaryBorderColor: getCssColor("--border", isDark ? "#374151" : "#e5e7eb"),
      lineColor: getCssColor("--muted-foreground", isDark ? "#9ca3af" : "#6b7280"),
      secondaryColor: getCssColor("--secondary", isDark ? "#1f2937" : "#f3f4f6"),
      tertiaryColor: getCssColor("--muted", isDark ? "#374151" : "#f3f4f6"),
      background: getCssColor("--background", isDark ? "#111827" : "#ffffff"),
      mainBkg: getCssColor("--card", isDark ? "#1f2937" : "#ffffff"),
      secondBkg: getCssColor("--muted", isDark ? "#374151" : "#f3f4f6"),
      nodeTextColor: getCssColor("--foreground", isDark ? "#f9fafb" : "#111827"),
      textColor: getCssColor("--foreground", isDark ? "#f9fafb" : "#111827"),
    };
  }, [resolvedTheme]);

  useEffect(() => {
    let mounted = true;

    const renderDiagram = async () => {
      setLoading(true);
      setError(null);

      try {
        const mermaid = (await import("mermaid")).default;
        const isDark = resolvedTheme === "dark";

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          darkMode: isDark,
          securityLevel: "loose",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          themeVariables: getThemeVariables(),
        });

        const { svg: renderedSvg } = await mermaid.render(
          `mermaid-${uniqueId}`,
          code.trim()
        );

        if (mounted) {
          setSvg(renderedSvg);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      mounted = false;
    };
  }, [code, uniqueId, resolvedTheme, getThemeVariables]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center min-h-[200px] bg-muted/30 rounded-lg border border-border/50 my-4",
          className
        )}
      >
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Rendering diagram...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "p-4 rounded-lg bg-destructive/10 border border-destructive/30 my-4",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive text-sm">Mermaid Error</p>
            <p className="text-xs text-muted-foreground mt-1 break-words">{error}</p>
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Show code
              </summary>
              <pre className="mt-2 p-2 text-xs bg-muted/50 rounded overflow-x-auto">
                <code>{code}</code>
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 overflow-hidden bg-card/50 my-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/50">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          Mermaid Diagram
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <div className="w-px h-4 bg-border/50 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy code"}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Diagram */}
      <div
        ref={containerRef}
        className="p-4 overflow-auto flex items-center justify-center min-h-[150px]"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <div
          className="mermaid-diagram [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
