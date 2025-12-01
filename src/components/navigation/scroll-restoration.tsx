"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Store scroll positions by path
const scrollPositions = new Map<string, number>();

export function ScrollRestoration() {
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);
  const isBackNavigation = useRef(false);

  useEffect(() => {
    const mainElement = document.getElementById("main-content");
    if (!mainElement) return;

    // Detect back/forward navigation
    const handlePopState = () => {
      isBackNavigation.current = true;
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const mainElement = document.getElementById("main-content");
    if (!mainElement) return;

    // Save scroll position of previous page before navigating
    if (prevPathname.current && prevPathname.current !== pathname) {
      scrollPositions.set(prevPathname.current, mainElement.scrollTop);
    }

    // Restore or reset scroll
    if (isBackNavigation.current) {
      // Back/forward: restore previous position
      const savedPosition = scrollPositions.get(pathname) || 0;
      requestAnimationFrame(() => {
        mainElement.scrollTo(0, savedPosition);
      });
      isBackNavigation.current = false;
    } else {
      // New navigation: scroll to top
      requestAnimationFrame(() => {
        mainElement.scrollTo(0, 0);
      });
    }

    prevPathname.current = pathname;
  }, [pathname]);

  return null;
}
