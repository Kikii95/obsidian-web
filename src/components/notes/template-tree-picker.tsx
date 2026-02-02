"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Template {
  name: string;
  path: string;
  preview?: string;
  content?: string;
}

interface TemplateFolder {
  name: string;
  path: string;
  templates: Template[];
  subfolders: TemplateFolder[];
}

interface TemplateTreePickerProps {
  selectedTemplate: string;
  onSelect: (path: string) => void;
  builtInTemplates: Template[];
  className?: string;
}

const NO_TEMPLATE = "__none__";

// Built-in folder as a virtual folder
function createBuiltInFolder(templates: Template[]): TemplateFolder {
  return {
    name: "Built-In",
    path: "_builtin",
    templates: templates.map(t => ({ ...t, path: t.path })),
    subfolders: [],
  };
}

// Folder component (recursive)
function FolderItem({
  folder,
  selectedTemplate,
  onSelect,
  depth = 0,
  defaultOpen = false,
  isBuiltIn = false,
}: {
  folder: TemplateFolder;
  selectedTemplate: string;
  onSelect: (path: string) => void;
  depth?: number;
  defaultOpen?: boolean;
  isBuiltIn?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Auto-open if a template inside is selected
  useEffect(() => {
    const hasSelectedTemplate =
      folder.templates.some((t) => t.path === selectedTemplate) ||
      folder.subfolders.some((sub) => {
        const check = (f: TemplateFolder): boolean =>
          f.templates.some((t) => t.path === selectedTemplate) ||
          f.subfolders.some(check);
        return check(sub);
      });
    if (hasSelectedTemplate) {
      setIsOpen(true);
    }
  }, [selectedTemplate, folder]);

  const hasContent = folder.templates.length > 0 || folder.subfolders.length > 0;
  if (!hasContent) return null;

  const templateCount =
    folder.templates.length +
    folder.subfolders.reduce((acc, sub) => {
      const count = (f: TemplateFolder): number =>
        f.templates.length + f.subfolders.reduce((a, s) => a + count(s), 0);
      return acc + count(sub);
    }, 0);

  return (
    <div className="select-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-1.5 py-1.5 px-2 rounded-md text-left text-sm",
          "hover:bg-muted/50 transition-colors",
          depth > 0 && "ml-3"
        )}
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        {isBuiltIn ? (
          <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
        ) : isOpen ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-primary/70" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-primary/70" />
        )}
        <span className="flex-1 truncate font-medium">{folder.name}</span>
        <span className="text-xs text-muted-foreground shrink-0">{templateCount}</span>
      </button>

      {isOpen && (
        <div className={cn("mt-0.5", depth > 0 && "ml-3")}>
          {/* Templates in this folder */}
          {folder.templates.map((template) => (
            <TemplateItem
              key={template.path}
              template={template}
              isSelected={selectedTemplate === template.path}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}

          {/* Subfolders */}
          {folder.subfolders.map((subfolder) => (
            <FolderItem
              key={subfolder.path}
              folder={subfolder}
              selectedTemplate={selectedTemplate}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Template item component
function TemplateItem({
  template,
  isSelected,
  onSelect,
  depth = 0,
}: {
  template: Template;
  isSelected: boolean;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  return (
    <button
      onClick={() => onSelect(template.path)}
      className={cn(
        "w-full flex items-center gap-1.5 py-1.5 px-2 rounded-md text-left text-sm",
        "hover:bg-muted/50 transition-colors",
        isSelected && "bg-primary/10 text-primary font-medium",
        depth > 0 && "ml-3"
      )}
    >
      <FileText className={cn("h-4 w-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
      <span className="flex-1 truncate">{template.name}</span>
    </button>
  );
}

export function TemplateTreePicker({
  selectedTemplate,
  onSelect,
  builtInTemplates,
  className,
}: TemplateTreePickerProps) {
  const [vaultTree, setVaultTree] = useState<TemplateFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vault templates
  useEffect(() => {
    async function fetchTemplates() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/github/templates");
        if (res.ok) {
          const data = await res.json();
          setVaultTree(data.tree || null);
        } else {
          setError("Erreur de chargement");
        }
      } catch {
        setError("Erreur de connexion");
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  // Built-in folder
  const builtInFolder = useMemo(() => createBuiltInFolder(builtInTemplates), [builtInTemplates]);

  return (
    <div className={cn("border rounded-lg", className)}>
      <ScrollArea className="h-[280px]">
        <div className="p-2 space-y-1">
          {/* None option */}
          <button
            onClick={() => onSelect(NO_TEMPLATE)}
            className={cn(
              "w-full flex items-center gap-1.5 py-1.5 px-2 rounded-md text-left text-sm",
              "hover:bg-muted/50 transition-colors",
              selectedTemplate === NO_TEMPLATE && "bg-primary/10 text-primary font-medium"
            )}
          >
            <span className="flex-1">Aucun template</span>
          </button>

          {/* Built-in folder */}
          <FolderItem
            folder={builtInFolder}
            selectedTemplate={selectedTemplate}
            onSelect={onSelect}
            defaultOpen={selectedTemplate.startsWith("_builtin/")}
            isBuiltIn
          />

          {/* Vault templates */}
          {loading ? (
            <div className="flex items-center gap-2 py-4 px-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : error ? (
            <div className="py-2 px-2 text-destructive text-sm">{error}</div>
          ) : vaultTree ? (
            <FolderItem
              folder={vaultTree}
              selectedTemplate={selectedTemplate}
              onSelect={onSelect}
              defaultOpen={
                !selectedTemplate.startsWith("_builtin/") &&
                selectedTemplate !== NO_TEMPLATE
              }
            />
          ) : null}
        </div>
      </ScrollArea>

      {/* Selected preview */}
      {selectedTemplate && selectedTemplate !== NO_TEMPLATE && (
        <div className="border-t px-3 py-2 bg-muted/30">
          <p className="text-xs text-muted-foreground truncate">
            Sélectionné: <span className="font-medium text-foreground">{
              builtInTemplates.find(t => t.path === selectedTemplate)?.name ||
              selectedTemplate.split("/").pop()?.replace(".md", "") ||
              selectedTemplate
            }</span>
          </p>
        </div>
      )}
    </div>
  );
}
