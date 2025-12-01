"use client";

import { Sun, Moon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme, type ThemeOption } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

// Mini logo icon colored by theme (exported for Settings page)
export function ThemeLogo({ themeOption, size = "md" }: { themeOption?: ThemeOption; size?: "sm" | "md" | "lg" }) {
  const isMono = themeOption?.id === "mono" || themeOption?.id === "mono-light";
  const isMonoLight = themeOption?.id === "mono-light";

  const sizeClasses = {
    sm: { container: "w-5 h-5", icon: "w-3 h-3" },
    md: { container: "w-6 h-6", icon: "w-3.5 h-3.5" },
    lg: { container: "w-8 h-8", icon: "w-4 h-4" },
  };
  const { container: sizeClass, icon: iconSize } = sizeClasses[size];

  // For mono themes: invert colors (white bg + black icon for mono, black bg + white icon for mono-light)
  const bgStyle = isMono
    ? { background: isMonoLight ? "#1a1a1a" : "#f5f5f5" }
    : { background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)" };

  const iconColor = isMono
    ? (isMonoLight ? "text-white" : "text-black")
    : "text-primary-foreground";

  return (
    <div
      className={cn(sizeClass, "flex items-center justify-center rounded-md flex-shrink-0")}
      style={bgStyle}
    >
      <svg
        className={cn(iconSize, iconColor)}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    </div>
  );
}

export function ThemeSwitcher() {
  const { theme, setTheme, mode, toggleMode, currentTheme, themesForCurrentMode, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled>
          <Moon className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" disabled>
          <div className="w-6 h-6 rounded-md bg-muted animate-pulse" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* Mode Toggle (Dark/Light) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMode}
        title={mode === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      >
        {mode === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
        <span className="sr-only">
          {mode === "dark" ? "Mode clair" : "Mode sombre"}
        </span>
      </Button>

      {/* Theme Color Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            title={`Thème: ${currentTheme.name}`}
          >
            <ThemeLogo themeOption={currentTheme} />
            <span className="sr-only">Changer de couleur</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {mode === "dark" ? "🌙 Thèmes sombres" : "☀️ Thèmes clairs"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {themesForCurrentMode.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => setTheme(t.id as Theme)}
              className={cn(
                "flex items-center justify-between cursor-pointer",
                theme === t.id && "bg-accent"
              )}
            >
              <div className="flex items-center gap-2">
                <ThemeLogo themeOption={t} size="sm" />
                <div className="flex flex-col">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.description}
                  </span>
                </div>
              </div>
              {theme === t.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
