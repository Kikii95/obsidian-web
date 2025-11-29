"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: { container: "w-8 h-8 rounded-lg", icon: "w-4 h-4" },
  md: { container: "w-12 h-12 rounded-xl", icon: "w-6 h-6" },
  lg: { container: "w-16 h-16 rounded-2xl", icon: "w-8 h-8" },
};

export function Logo({ className, showText = false, size = "sm" }: LogoProps) {
  const sizeClass = sizeClasses[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(sizeClass.container, "flex items-center justify-center glow-soft")}
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 50%, var(--ring) 100%)",
        }}
      >
        <svg
          className={cn(sizeClass.icon, "text-primary-foreground")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>
      {showText && (
        <span className="font-semibold text-lg">Obsidian Web</span>
      )}
    </div>
  );
}
