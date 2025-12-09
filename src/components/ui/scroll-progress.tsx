"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const [progress, setProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Find the main content element that actually scrolls
    const mainElement = document.getElementById("main-content");
    if (!mainElement) return;

    const handleScroll = () => {
      const scrollTop = mainElement.scrollTop;
      const scrollHeight = mainElement.scrollHeight - mainElement.clientHeight;
      const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, scrollPercent)));

      // Show the progress bar
      setIsScrolling(true);

      // Clear any existing timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      // Hide after 1.5s of no scrolling
      hideTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1500);
    };

    // Check if scrollable
    const checkScrollable = () => {
      setIsScrollable(mainElement.scrollHeight > mainElement.clientHeight);
    };

    // Initial checks
    checkScrollable();
    handleScroll();

    // Listen to scroll events
    mainElement.addEventListener("scroll", handleScroll, { passive: true });

    // Re-check scrollability on resize
    const resizeObserver = new ResizeObserver(checkScrollable);
    resizeObserver.observe(mainElement);

    return () => {
      mainElement.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Don't render if not scrollable
  if (!isScrollable) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-14 left-0 right-0 h-1 bg-transparent z-40 pointer-events-none transition-opacity duration-300",
        isScrolling ? "opacity-100" : "opacity-0",
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
