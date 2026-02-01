"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { folderIcons, type FolderIcon } from "@/data/folder-icons";
import { Search, X } from "lucide-react";

interface FolderIconPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderPath: string;
  currentIcon?: string;
  onSelect: (iconId: string) => void;
  onRemove: () => void;
}

export function FolderIconPicker({
  open,
  onOpenChange,
  folderPath,
  currentIcon,
  onSelect,
  onRemove,
}: FolderIconPickerProps) {
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return folderIcons;
    const query = search.toLowerCase();
    return folderIcons.filter(
      (icon) =>
        icon.name.toLowerCase().includes(query) ||
        icon.id.toLowerCase().includes(query)
    );
  }, [search]);

  const folderName = folderPath.split("/").pop() || folderPath;

  const handleSelect = (icon: FolderIcon) => {
    onSelect(icon.id);
    onOpenChange(false);
    setSearch("");
  };

  const handleRemove = () => {
    onRemove();
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Choose icon for</span>
            <span className="text-primary font-mono text-sm">{folderName}/</span>
          </DialogTitle>
          <DialogDescription>
            Select an icon to customize this folder&apos;s appearance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Icon grid */}
          <ScrollArea className="h-64">
            <div className="grid grid-cols-6 gap-2 p-1">
              {filteredIcons.map((icon) => {
                const Icon = icon.icon;
                const isSelected = currentIcon === icon.id;
                return (
                  <button
                    key={icon.id}
                    onClick={() => handleSelect(icon)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg border transition-all",
                      "hover:bg-muted hover:border-primary/50",
                      isSelected
                        ? "bg-primary/10 border-primary"
                        : "border-transparent"
                    )}
                    title={icon.name}
                  >
                    <Icon className={cn("h-5 w-5", icon.color || "text-muted-foreground")} />
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Remove button if icon is set */}
          {currentIcon && currentIcon !== "default" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-2" />
              Remove custom icon
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
