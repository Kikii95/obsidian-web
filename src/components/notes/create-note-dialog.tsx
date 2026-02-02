"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilePlus, LayoutTemplate, Loader2 } from "lucide-react";
import { FormDialog } from "@/components/dialogs";
import { githubClient } from "@/services/github-client";
import { useVaultStore } from "@/lib/store";
import { useDialogAction } from "@/hooks/use-dialog-action";
import { FolderTreePicker } from "./folder-tree-picker";
import { TemplateTreePicker } from "./template-tree-picker";
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
  content?: string; // For built-in templates
}

// Built-in templates when no vault templates are found
const DEFAULT_TEMPLATES: Template[] = [
  {
    name: "Quick Note",
    path: "_builtin/quick",
    preview: "Capture rapide d'idée avec date et tags",
    content: `---
created: {{date:YYYY-MM-DD}}
tags: []
---

# {{title}}

## Idée


## Notes


`,
  },
  {
    name: "Daily Note",
    path: "_builtin/daily",
    preview: "Note journalière avec date et sections",
    content: `---
date: {{date:YYYY-MM-DD}}
tags: [daily]
---

# {{date:dddd DD MMMM YYYY}}

## 📋 Tâches
- [ ]

## 📝 Notes

`,
  },
  {
    name: "Meeting Notes",
    path: "_builtin/meeting",
    preview: "Notes de réunion structurées",
    content: `---
date: {{date:YYYY-MM-DD}}
tags: [meeting]
---

# Meeting: {{title}}

**Date**: {{date:DD/MM/YYYY}} à {{time:HH:mm}}

## 📋 Ordre du jour
1.

## 📝 Notes

## ✅ Actions
- [ ]

`,
  },
  {
    name: "Weekly Review",
    path: "_builtin/weekly",
    preview: "Bilan hebdomadaire avec objectifs",
    content: `---
date: {{date:YYYY-MM-DD}}
week: {{week}}
quarter: {{quarter}}
tags: [weekly, review]
---

# 📅 Semaine {{week}} - {{quarter}} {{date:YYYY}}

## 🎯 Objectifs de la semaine
- [ ]

## ✅ Accompli
-

## 📊 Rétrospective
### Ce qui a bien marché
-

### Ce qui peut être amélioré
-

## 📋 Prochaine semaine
- [ ]

`,
  },
  {
    name: "Project",
    path: "_builtin/project",
    preview: "Structure projet avec objectifs",
    content: `---
created: {{date:YYYY-MM-DD}}
status: active
tags: [project]
---

# 🚀 {{title}}

## 📋 Description


## 🎯 Objectifs
- [ ]

## 📝 Tâches
- [ ]

## 📅 Timeline
- **Début**: {{date:DD/MM/YYYY}}
- **Deadline**:

## 📓 Journal
### {{date:DD/MM/YYYY}}
-

`,
  },
  {
    name: "Book Notes",
    path: "_builtin/book",
    preview: "Fiche de lecture avec citations",
    content: `---
created: {{date:YYYY-MM-DD}}
author:
rating:
tags: [book, reading]
---

# 📚 {{title}}

## 📖 Informations
- **Auteur**:
- **Année**:
- **Genre**:

## 💡 Résumé


## 📝 Notes clés
-

## 💬 Citations
>

## 🤔 Réflexions personnelles


`,
  },
  {
    name: "Recipe",
    path: "_builtin/recipe",
    preview: "Recette avec ingrédients",
    content: `---
created: {{date:YYYY-MM-DD}}
servings:
prep_time:
cook_time:
tags: [recipe, cooking]
---

# 🍳 {{title}}

## 📋 Ingrédients
- [ ]

## 👨‍🍳 Préparation
1.

## 📝 Notes


`,
  },
  {
    name: "Code Snippet",
    path: "_builtin/code",
    preview: "Documentation de code",
    content: `---
created: {{date:YYYY-MM-DD}}
language:
tags: [code, snippet]
---

# 💻 {{title}}

## 📋 Description


## 📝 Code

\`\`\`

\`\`\`

## 🔧 Utilisation

\`\`\`

\`\`\`

## 📚 Références
-

`,
  },
  {
    name: "Brainstorm",
    path: "_builtin/brainstorm",
    preview: "Session brainstorm avec catégories",
    content: `---
created: {{date:YYYY-MM-DD}}
session_id: {{uuid}}
tags: [brainstorm, ideas]
---

# 🧠 Brainstorm: {{title}}

**Date**: {{weekday}} {{date:DD/MM/YYYY}} à {{time:HH:mm}}

## 🎯 Objectif


## 💡 Idées Brutes
> Capture rapide, pas de filtre !

-
-
-

## 🗂️ Catégories

### 🟢 Quick Wins (facile + impact)
-

### 🔵 À Creuser (potentiel)
-

### 🟡 Long Terme
-

### 🔴 Rejeté (et pourquoi)
-

## 🔗 Connexions & Patterns
> Liens entre les idées

-

## ✅ Prochaines Actions
- [ ]

## 📝 Notes de Session


`,
  },
];

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
  const [selectedTemplate, setSelectedTemplate] = useState(NO_TEMPLATE);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
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

  // Fetch template content when selected
  useEffect(() => {
    if (selectedTemplate === NO_TEMPLATE) {
      setTemplateContent(null);
      return;
    }

    // Check if it's a built-in template (path starts with _builtin/)
    const builtinTemplate = DEFAULT_TEMPLATES.find((t) => t.path === selectedTemplate);
    if (builtinTemplate) {
      setTemplateContent(builtinTemplate.content || "");
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

      {/* Template selector with tree view */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Template (optionnel)
          <TemplateVariablesHelp />
          {loadingContent && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </Label>
        <TemplateTreePicker
          selectedTemplate={selectedTemplate}
          onSelect={setSelectedTemplate}
          builtInTemplates={DEFAULT_TEMPLATES}
        />
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
