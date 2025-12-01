"use client";

import { Sun, Moon, Check, Palette } from "lucide-react";
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

// Hardcoded theme colors (OKLCH primary colors converted to hex approximations)
const themeColors: Record<Theme, { bg: string; fg: string }> = {
  // Dark themes
  "carmine": { bg: "#dc2626", fg: "#fff" },
  "crimson": { bg: "#e11d48", fg: "#fff" },
  "peach-dark": { bg: "#f97316", fg: "#fff" },
  "brown": { bg: "#a16207", fg: "#fff" },
  "sunset": { bg: "#ea580c", fg: "#fff" },
  "sand-dark": { bg: "#ca8a04", fg: "#000" },
  "cyber": { bg: "#eab308", fg: "#000" },
  "sage-dark": { bg: "#65a30d", fg: "#fff" },
  "forest": { bg: "#16a34a", fg: "#fff" },
  "mint": { bg: "#14b8a6", fg: "#fff" },
  "turquoise": { bg: "#06b6d4", fg: "#fff" },
  "cloud-dark": { bg: "#0ea5e9", fg: "#fff" },
  "ocean": { bg: "#3b82f6", fg: "#fff" },
  "mist-dark": { bg: "#6366f1", fg: "#fff" },
  "lavender": { bg: "#8b5cf6", fg: "#fff" },
  "magenta": { bg: "#d946ef", fg: "#fff" },
  "rose": { bg: "#ec4899", fg: "#fff" },
  "mono": { bg: "#1a1a1a", fg: "#fff" },
  // Light themes
  "carmine-light": { bg: "#dc2626", fg: "#fff" },
  "crimson-light": { bg: "#e11d48", fg: "#fff" },
  "peach": { bg: "#f97316", fg: "#fff" },
  "brown-light": { bg: "#a16207", fg: "#fff" },
  "sunset-light": { bg: "#ea580c", fg: "#fff" },
  "sand": { bg: "#ca8a04", fg: "#000" },
  "cyber-light": { bg: "#eab308", fg: "#000" },
  "sage": { bg: "#65a30d", fg: "#fff" },
  "forest-light": { bg: "#16a34a", fg: "#fff" },
  "mint-light": { bg: "#14b8a6", fg: "#fff" },
  "turquoise-light": { bg: "#06b6d4", fg: "#fff" },
  "cloud": { bg: "#0ea5e9", fg: "#fff" },
  "ocean-light": { bg: "#3b82f6", fg: "#fff" },
  "mist": { bg: "#6366f1", fg: "#fff" },
  "lavender-light": { bg: "#8b5cf6", fg: "#fff" },
  "magenta-light": { bg: "#d946ef", fg: "#fff" },
  "rose-light": { bg: "#ec4899", fg: "#fff" },
  "mono-light": { bg: "#f5f5f5", fg: "#000" },
};

// Mini palette icon colored by theme (exported for Settings page)
export function ThemeLogo({ themeOption, size = "md" }: { themeOption?: ThemeOption; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: { container: "w-5 h-5", icon: "w-3 h-3" },
    md: { container: "w-6 h-6", icon: "w-3.5 h-3.5" },
    lg: { container: "w-8 h-8", icon: "w-4.5 h-4.5" },
  };
  const { container: sizeClass, icon: iconSize } = sizeClasses[size];

  const colors = themeOption?.id ? themeColors[themeOption.id] : { bg: "#d946ef", fg: "#fff" };

  return (
    <div
      className={cn(sizeClass, "flex items-center justify-center rounded-md flex-shrink-0")}
      style={{ background: colors.bg }}
    >
      <Palette className={iconSize} style={{ color: colors.fg }} strokeWidth={2.5} />
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
