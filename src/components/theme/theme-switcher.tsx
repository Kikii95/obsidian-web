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
import { useTheme, type Theme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, setTheme, mode, toggleMode, currentTheme, themesForCurrentMode, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled>
          <Moon className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" disabled>
          <span className="text-lg">💜</span>
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
            <span className="text-lg">{currentTheme.emoji}</span>
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
                <span className="text-base">{t.emoji}</span>
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
