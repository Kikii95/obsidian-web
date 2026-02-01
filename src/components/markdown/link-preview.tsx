"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LinkPreviewProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  notePath: string;
}

const PREVIEW_DELAY = 300;
const PREVIEW_MAX_CHARS = 500;

export function LinkPreview({
  href,
  children,
  className,
  notePath,
}: LinkPreviewProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    title: string;
    content: string;
    error?: string;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchedRef = useRef(false);

  const fetchPreview = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);

    try {
      const response = await fetch(
        `/api/notes/preview?path=${encodeURIComponent(notePath)}`
      );

      if (!response.ok) {
        throw new Error("Note not found");
      }

      const data = await response.json();
      const content = data.content || "";
      const truncated =
        content.length > PREVIEW_MAX_CHARS
          ? content.substring(0, PREVIEW_MAX_CHARS) + "..."
          : content;

      setPreview({
        title: data.title || notePath.split("/").pop()?.replace(".md", "") || "Note",
        content: truncated,
      });
    } catch (error) {
      setPreview({
        title: notePath.split("/").pop()?.replace(".md", "") || "Note",
        content: "",
        error: "Unable to load preview",
      });
    } finally {
      setLoading(false);
    }
  }, [notePath]);

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(true);
      if (!fetchedRef.current) {
        fetchPreview();
      }
    }, PREVIEW_DELAY);
  }, [fetchPreview]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpen(false);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <a
          href={href}
          className={cn("transition-colors", className)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleMouseEnter}
          onBlur={handleMouseLeave}
        >
          {children}
        </a>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 overflow-hidden"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={handleMouseLeave}
        sideOffset={8}
      >
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : preview?.error ? (
          <div className="p-4 text-center">
            <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{preview.error}</p>
          </div>
        ) : preview ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium truncate">{preview.title}</span>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto">
              {preview.content ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {preview.content}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Empty note</p>
              )}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
