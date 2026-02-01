"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link2, Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyLinkButtonProps {
  notePath: string;
  noteName: string;
  className?: string;
}

type CopyType = "wikilink" | "url" | "markdown";

export function CopyLinkButton({
  notePath,
  noteName,
  className,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState<CopyType | null>(null);

  const handleCopy = async (type: CopyType) => {
    let textToCopy: string;

    switch (type) {
      case "wikilink":
        // Remove .md extension and get just the note name
        textToCopy = `[[${noteName}]]`;
        break;
      case "url":
        // Full URL to the note
        textToCopy = `${window.location.origin}/note/${encodeURIComponent(notePath.replace(/\.md$/, ""))}`;
        break;
      case "markdown":
        // Markdown link format
        const url = `${window.location.origin}/note/${encodeURIComponent(notePath.replace(/\.md$/, ""))}`;
        textToCopy = `[${noteName}](${url})`;
        break;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", className)}
          title="Copier le lien"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleCopy("wikilink")}>
          <Copy className="h-4 w-4 mr-2" />
          Copier [[wikilink]]
          {copied === "wikilink" && (
            <Check className="h-4 w-4 ml-auto text-green-500" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopy("url")}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Copier URL
          {copied === "url" && (
            <Check className="h-4 w-4 ml-auto text-green-500" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopy("markdown")}>
          <Link2 className="h-4 w-4 mr-2" />
          Copier lien Markdown
          {copied === "markdown" && (
            <Check className="h-4 w-4 ml-auto text-green-500" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
