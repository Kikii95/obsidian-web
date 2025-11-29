"use client";

import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, themes, type Theme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, setTheme, currentTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Palette className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title={`Thème: ${currentTheme.name}`}
        >
          <span className="text-lg">{currentTheme.emoji}</span>
          <span className="sr-only">Changer de thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themes.map((t) => (
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
  );
}
