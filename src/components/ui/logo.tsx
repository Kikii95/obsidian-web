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
          viewBox="0 0 24 24"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11.4 4.6C10.6 2.9 8.4 2.7 7.6 4.3C6 3.7 4.4 4.9 5 6.5C3.3 6.5 2.6 8.3 4 9.2C2.5 9.8 2.6 11.6 4.1 12.1C3.1 13.1 3.8 14.9 5.5 14.8C5.3 16.2 6.5 17.3 8 17C8.6 18 10 18.3 10.7 17.6C11.05 18.4 10.95 19 10.5 19.3" />
            <path d="M12.6 4.6C13.4 2.9 15.6 2.7 16.4 4.3C18 3.7 19.6 4.9 19 6.5C20.7 6.5 21.4 8.3 20 9.2C21.5 9.8 21.4 11.6 19.9 12.1C20.9 13.1 20.2 14.9 18.5 14.8C18.7 16.2 17.5 17.3 16 17C15.4 18 14 18.3 13.3 17.6C12.95 18.4 13.05 19 13.5 19.3" />
          </g>
          <g stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M12 5.6 12 9.8" />
            <path d="M12 9.8 7.7 12.7" />
            <path d="M12 9.8 16.3 12.7" />
            <path d="M7.7 12.7 8.5 16.7" />
            <path d="M16.3 12.7 15.5 16.7" />
          </g>
          <g fill="currentColor">
            <circle cx="12" cy="5.6" r="1.55" />
            <circle cx="12" cy="9.8" r="1.95" />
            <circle cx="7.7" cy="12.7" r="1.5" />
            <circle cx="16.3" cy="12.7" r="1.5" />
            <circle cx="8.5" cy="16.7" r="1.5" />
            <circle cx="15.5" cy="16.7" r="1.5" />
          </g>
        </svg>
      </div>
      {showText && (
        <span className="font-semibold text-lg tracking-tight">
          Obsidian <span className="text-primary">Web</span>
        </span>
      )}
    </div>
  );
}
