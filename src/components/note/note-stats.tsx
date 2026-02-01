"use client";

import { useMemo } from "react";
import { Clock, FileText, Type } from "lucide-react";

interface NoteStatsProps {
  content: string;
  className?: string;
}

interface Stats {
  words: number;
  characters: number;
  paragraphs: number;
  readingTime: number; // in minutes
}

function calculateStats(content: string): Stats {
  // Remove frontmatter
  const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "");

  // Remove code blocks for accurate word count
  const cleanContent = contentWithoutFrontmatter
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");

  // Count words (split by whitespace, filter empty)
  const words = cleanContent
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  // Count characters (excluding whitespace)
  const characters = cleanContent.replace(/\s/g, "").length;

  // Count paragraphs (non-empty lines separated by blank lines)
  const paragraphs = cleanContent
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0).length;

  // Reading time: average 200 words per minute
  const readingTime = Math.max(1, Math.ceil(words / 200));

  return { words, characters, paragraphs, readingTime };
}

export function NoteStats({ content, className }: NoteStatsProps) {
  const stats = useMemo(() => calculateStats(content), [content]);

  return (
    <div className={`flex items-center gap-4 text-xs text-muted-foreground ${className}`}>
      <span className="flex items-center gap-1">
        <Type className="h-3 w-3" />
        {stats.words.toLocaleString()} mots
      </span>
      <span className="flex items-center gap-1">
        <FileText className="h-3 w-3" />
        {stats.characters.toLocaleString()} car.
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {stats.readingTime} min de lecture
      </span>
    </div>
  );
}
