"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilePlus, LayoutTemplate, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/dialogs";
import { githubClient } from "@/services/github-client";
import { useVaultStore } from "@/lib/store";
import { useDialogAction } from "@/hooks/use-dialog-action";
import { FolderTreePicker } from "./folder-tree-picker";
import {
  processTemplate,
  templateUsesClipboard,
  getClipboardContent,
} from "@/lib/template-engine";
import { TemplateVariablesHelp } from "./template-variables-help";

interface Template {
  name: string;
  path: string;
  preview?: string;
}

interface CreateNoteDialogProps {
  currentFolder?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ROOT_VALUE = "__root__";

const NO_TEMPLATE = "__none__";

export function CreateNoteDialog({
  currentFolder,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateNoteDialogProps) {
  const { tree } = useVaultStore();
  const { setError } = useDialogAction();

  const [title, setTitle] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(currentFolder || ROOT_VALUE);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(NO_TEMPLATE);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  // Sync selectedFolder when dialog opens in controlled mode
  useEffect(() => {
    if (controlledOpen) {
      setTitle("");
      setSelectedFolder(currentFolder || ROOT_VALUE);
      setSelectedTemplate(NO_TEMPLATE);
      setTemplateContent(null);
    }
  }, [controlledOpen, currentFolder]);

  const actualFolder = selectedFolder === ROOT_VALUE ? "" : selectedFolder;

  // Fetch templates on mount
  useEffect(() => {
    async function fetchTemplates() {
      setLoadingTemplates(true);
      try {
        const res = await fetch("/api/github/templates");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch {
        // Silently fail - templates are optional
      } finally {
        setLoadingTemplates(false);
      }
    }
    fetchTemplates();
  }, []);

  // Fetch template content when selected
  useEffect(() => {
    if (selectedTemplate === NO_TEMPLATE) {
      setTemplateContent(null);
      return;
    }

    async function fetchContent() {
      setLoadingContent(true);
      try {
        const res = await fetch(
          `/api/github/read?path=${encodeURIComponent(selectedTemplate)}`
        );
        if (res.ok) {
          const data = await res.json();
          setTemplateContent(data.content || "");
        }
      } catch {
        setTemplateContent(null);
      } finally {
        setLoadingContent(false);
      }
    }
    fetchContent();
  }, [selectedTemplate]);

  const validate = useCallback((): string | null => {
    if (!title.trim()) return "Le titre est requis";
    return null;
  }, [title]);

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      setError(error);
      throw new Error(error);
    }

    const path = actualFolder
      ? `${actualFolder}/${title.trim()}.md`
      : `${title.trim()}.md`;

    // Use template content or default
    let content: string;
    if (templateContent) {
      // Get clipboard if template uses it
      let clipboard = "";
      if (templateUsesClipboard(templateContent)) {
        clipboard = await getClipboardContent();
      }

      // Process template with all variables
      content = processTemplate(templateContent, {
        title: title.trim(),
        folder: actualFolder,
        clipboard,
      });
    } else {
      content = `# ${title.trim()}\n\n`;
    }

    await githubClient.createNote(path, content);
  };

  const getNavigateTo = () => {
    const path = actualFolder
      ? `${actualFolder}/${title.trim()}.md`
      : `${title.trim()}.md`;
    const notePath = path.replace(".md", "");
    return `/note/${notePath.split("/").map(encodeURIComponent).join("/")}`;
  };

  const handleOpen = () => {
    setSelectedFolder(currentFolder || ROOT_VALUE);
    setTitle("");
    setSelectedTemplate(NO_TEMPLATE);
    setTemplateContent(null);
  };

  return (
    <FormDialog
      trigger={
        trigger || (
          <Button variant="outline" size="sm">
            <FilePlus className="h-4 w-4 mr-2" />
            Nouvelle note
          </Button>
        )
      }
      title="Créer une nouvelle note"
      description="Choisissez un emplacement et un titre pour votre note"
      submitLabel="Créer"
      submitLoadingLabel="Création..."
      submitIcon={<FilePlus className="h-4 w-4" />}
      onSubmit={handleSubmit}
      navigateTo={validate() ? undefined : getNavigateTo()}
      open={controlledOpen}
      onOpenChange={controlledOnOpenChange}
      onOpen={handleOpen}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Titre de la note</Label>
        <Input
          id="title"
          placeholder="Ma nouvelle note"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            // Prevent arrow keys from being captured by dialog
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
              e.stopPropagation();
            }
          }}
          autoFocus
        />
      </div>

      {/* Template selector - always visible */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Template (optionnel)
          <TemplateVariablesHelp />
        </Label>
        {loadingTemplates ? (
          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Chargement des templates...</span>
          </div>
        ) : templates.length > 0 ? (
          <>
            <Select
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
            >
              <SelectTrigger>
                {loadingContent ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <SelectValue />
                  </div>
                ) : (
                  <SelectValue placeholder="Aucun template" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEMPLATE}>Aucun template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.path} value={template.path}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate !== NO_TEMPLATE && templateContent && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {templates.find(t => t.path === selectedTemplate)?.preview}
              </p>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
            💡 Créez un dossier <code className="bg-muted px-1 rounded">Templates/</code> dans votre vault pour utiliser des templates.
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Dossier de destination</Label>
        <FolderTreePicker
          tree={tree}
          selectedPath={selectedFolder}
          onSelect={setSelectedFolder}
        />
      </div>

      {title && (
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
          Chemin: <code>{actualFolder ? `${actualFolder}/` : ""}{title.trim()}.md</code>
        </div>
      )}
    </FormDialog>
  );
}
