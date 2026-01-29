"use client";

import { memo, useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableSidebar } from "@/components/ui/resizable-sidebar";
import { UnifiedFileTree, useFolderExpansionState } from "@/components/tree";
import { FloatingSidebarToggle } from "./sidebar-toggle";
import { cn } from "@/lib/utils";
import { useLayoutContext, useLayoutFeatures } from "@/contexts/layout-context";
import type { VaultFile } from "@/types";
import type { UnifiedSidebarProps } from "@/types/layout";

/**
 * Unified sidebar component for all layout modes
 * Supports resizable (dashboard) and collapsible (share/temp) variants
 */
export const UnifiedSidebar = memo(function UnifiedSidebar({
  variant,
  defaultWidth = 280,
  minWidth = 200,
  maxWidth = 500,
  header,
  search = true,
  tree,
  actions,
  buildHref,
  showIcons = true,
  enableSelection = false,
  className,
}: UnifiedSidebarProps) {
  const { sidebar, toggleSidebar, currentPath } = useLayoutContext();
  const features = useLayoutFeatures();
  const [searchQuery, setSearchQuery] = useState("");

  // Folder expansion state
  const {
    expandedFolders,
    toggleFolder,
    expandToPath,
  } = useFolderExpansionState();

  // Expand to current path on mount
  // useEffect(() => {
  //   if (currentPath) {
  //     expandToPath(currentPath);
  //   }
  // }, []);

  // Filter tree by search
  const filteredTree = searchQuery
    ? filterTreeBySearch(tree, searchQuery.toLowerCase())
    : tree;

  // Resizable variant (dashboard)
  if (variant === "resizable") {
    if (!sidebar.open) {
      return (
        <FloatingSidebarToggle
          isOpen={false}
          onToggle={toggleSidebar}
          position="top-left"
        />
      );
    }

    return (
      <aside
        className={cn(
          "hidden md:flex flex-shrink-0 border-r border-border/50 bg-sidebar",
          "sticky top-0 h-full",
          className
        )}
        role="navigation"
        aria-label="File explorer"
      >
        <ResizableSidebar
          defaultWidth={defaultWidth}
          minWidth={minWidth}
          maxWidth={maxWidth}
        >
          <div className="flex flex-col h-full">
            {/* Custom header */}
            {header}

            {/* Search */}
            {search && features.sidebar.showSearch && (
              <div className="p-3 border-b border-border/50">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>
            )}

            {/* Actions slot */}
            {actions && (
              <div className="p-2 border-b border-border/50">
                {actions}
              </div>
            )}

            {/* File tree */}
            <ScrollArea className="flex-1">
              <UnifiedFileTree
                tree={filteredTree}
                currentPath={currentPath}
                buildHref={buildHref}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                showIcons={showIcons}
                showFileExtensions={false}
                filterViewable={true}
              />
            </ScrollArea>
          </div>
        </ResizableSidebar>
      </aside>
    );
  }

  // Collapsible variant (share/temp)
  return (
    <>
      {/* Floating toggle when closed */}
      <FloatingSidebarToggle
        isOpen={sidebar.open}
        onToggle={toggleSidebar}
        position="top-left"
      />

      {/* Overlay */}
      {sidebar.open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:bg-black/20"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar panel - positioned below header */}
      <aside
        className={cn(
          "fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-72",
          "bg-background border-r border-border shadow-xl",
          "transform transition-transform duration-200 ease-in-out",
          sidebar.open ? "translate-x-0" : "-translate-x-full",
          className
        )}
        role="navigation"
        aria-label="File explorer"
      >
        <div className="flex flex-col h-full">
          {/* Custom header */}
          {header}

          {/* Search */}
          {search && features.sidebar.showSearch && (
            <div className="p-3 border-b border-border/50">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          )}

          {/* Actions slot */}
          {actions && (
            <div className="p-2 border-b border-border/50">
              {actions}
            </div>
          )}

          {/* File tree */}
          <ScrollArea className="flex-1">
            <UnifiedFileTree
              tree={filteredTree}
              currentPath={currentPath}
              buildHref={buildHref}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              showIcons={showIcons}
              showFileExtensions={true}
              filterViewable={true}
            />
          </ScrollArea>
        </div>
      </aside>
    </>
  );
});

/**
 * Search input component
 */
function SearchInput({
  value,
  onChange,
  placeholder = "Search files...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 h-9 text-sm"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
          onClick={() => onChange("")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

/**
 * Filter tree items by search query
 */
function filterTreeBySearch(items: VaultFile[], query: string): VaultFile[] {
  return items
    .map((item) => {
      if (item.type === "dir") {
        const filteredChildren = filterTreeBySearch(item.children || [], query);
        const dirMatches = item.name.toLowerCase().includes(query);

        if (filteredChildren.length > 0 || dirMatches) {
          return { ...item, children: filteredChildren };
        }
        return null;
      }

      if (item.name.toLowerCase().includes(query)) {
        return item;
      }
      return null;
    })
    .filter(Boolean) as VaultFile[];
}

/**
 * Sidebar header component for different modes
 */
interface SidebarHeaderProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function SidebarHeader({
  title,
  icon,
  actions,
  className,
}: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        "h-14 flex items-center justify-between px-4 border-b border-border/50",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="font-medium text-sm truncate">{title}</span>
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}
