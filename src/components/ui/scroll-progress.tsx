"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mainElementRef = useRef<HTMLElement | null>(null);

  const showProgressBar = useCallback(() => {
    setIsVisible(true);

    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // Hide after 1.5s of no scrolling
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 1500);
  }, []);

  useEffect(() => {
    // Find the main content element that actually scrolls
    const mainElement = document.getElementById("main-content");
    if (!mainElement) return;
    mainElementRef.current = mainElement;

    const handleScroll = () => {
      const scrollTop = mainElement.scrollTop;
      const scrollHeight = mainElement.scrollHeight - mainElement.clientHeight;

      // Only show if page is scrollable
      if (scrollHeight <= 0) return;

      const scrollPercent = (scrollTop / scrollHeight) * 100;
      setProgress(Math.min(100, Math.max(0, scrollPercent)));
      showProgressBar();
    };

    // Listen to scroll events
    mainElement.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      mainElement.removeEventListener("scroll", handleScroll);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [showProgressBar]);

  return (
    <div
      className={cn(
        "fixed top-14 left-0 right-0 h-1 bg-transparent z-40 pointer-events-none transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <div
        className="h-full bg-primary/70 transition-all duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
