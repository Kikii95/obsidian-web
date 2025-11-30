"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { usePrefetchNote } from "@/hooks/use-prefetch-note";

interface PrefetchLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  children: React.ReactNode;
}

/**
 * Link component that prefetches note content on hover
 * Uses the note cache system for instant loading
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  function PrefetchLink({ href, children, onMouseEnter, onMouseLeave, ...props }, ref) {
    const { handleMouseEnter, handleMouseLeave } = usePrefetchNote();

    const hrefString = typeof href === "string" ? href : href.pathname || "";

    return (
      <Link
        ref={ref}
        href={href}
        onMouseEnter={(e) => {
          handleMouseEnter(hrefString);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          handleMouseLeave();
          onMouseLeave?.(e);
        }}
        {...props}
      >
        {children}
      </Link>
    );
  }
);
