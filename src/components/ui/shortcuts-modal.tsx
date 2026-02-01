"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Compass,
  Edit,
  Eye,
  File,
  HelpCircle,
  Search,
  Keyboard,
} from "lucide-react";
import {
  shortcutCategories,
  formatShortcut,
  matchesSearch,
  type ShortcutCategory,
} from "@/lib/shortcuts";

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  compass: Compass,
  edit: Edit,
  eye: Eye,
  file: File,
  "help-circle": HelpCircle,
};

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const [search, setSearch] = useState("");

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) {
      return shortcutCategories;
    }

    return shortcutCategories
      .map((category) => ({
        ...category,
        shortcuts: category.shortcuts.filter((s) => matchesSearch(s, search)),
      }))
      .filter((category) => category.shortcuts.length > 0);
  }, [search]);

  // Count total results
  const totalResults = useMemo(
    () => filteredCategories.reduce((acc, cat) => acc + cat.shortcuts.length, 0),
    [filteredCategories]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un raccourci..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Results count when searching */}
        {search && (
          <p className="text-sm text-muted-foreground">
            {totalResults} résultat{totalResults !== 1 ? "s" : ""}
          </p>
        )}

        {/* Categories */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun raccourci trouvé pour &quot;{search}&quot;
            </div>
          ) : (
            filteredCategories.map((category) => (
              <CategorySection key={category.name} category={category} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>Appuyez sur <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">?</kbd> ou <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+/</kbd> pour ouvrir</span>
          <span>Appuyez sur <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Esc</kbd> pour fermer</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategorySection({ category }: { category: ShortcutCategory }) {
  const Icon = categoryIcons[category.icon] || HelpCircle;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {category.name}
      </h3>
      <div className="space-y-1">
        {category.shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
          >
            <span className="text-sm">{shortcut.description}</span>
            <kbd
              className={cn(
                "px-2 py-1 bg-muted rounded text-xs font-mono",
                "text-muted-foreground"
              )}
            >
              {formatShortcut(shortcut)}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
