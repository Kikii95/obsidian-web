"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, scrollPercent)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Don't show if page is not scrollable
  if (progress === 0 && typeof window !== "undefined") {
    const docHeight = document.documentElement.scrollHeight;
    const viewHeight = window.innerHeight;
    if (docHeight <= viewHeight) {
      return null;
    }
  }

  return (
    <div
      className={cn(
        "fixed top-14 left-0 right-0 h-0.5 bg-transparent z-40 pointer-events-none",
        className
      )}
    >
      <div
        className="h-full bg-primary/60 transition-all duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
