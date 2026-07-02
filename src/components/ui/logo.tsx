"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: { container: "w-8 h-8 rounded-lg", icon: "w-6 h-6" },
  md: { container: "w-12 h-12 rounded-xl", icon: "w-9 h-9" },
  lg: { container: "w-16 h-16 rounded-2xl", icon: "w-12 h-12" },
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
          viewBox="50 75 410 410"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth={36}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M256 149C235 107 171 128 171 171C128 171 107 213 107 235C85 256 85 299 107 320C85 363 128 405 171 405C192 448 235 427 235 405" />
            <path d="M256 149C277 107 341 128 341 171C384 171 405 213 405 235C427 256 427 299 405 320C427 363 384 405 341 405C320 448 277 427 277 405" />
          </g>
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth={30}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M256 171V235M256 235L192 277M256 235L320 277M192 277C192 299 192 320 213 341M320 277C320 299 320 320 299 341" />
          </g>
          <g fill="currentColor">
            <circle cx="256" cy="171" r="31" />
            <circle cx="256" cy="235" r="28" />
            <circle cx="192" cy="277" r="30" />
            <circle cx="320" cy="277" r="30" />
            <circle cx="213" cy="341" r="22" />
            <circle cx="299" cy="341" r="22" />
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
