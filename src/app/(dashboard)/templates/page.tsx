"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  LayoutTemplate,
  Copy,
  Check,
  Eye,
  Pencil,
  Plus,
  Trash2,
  FolderPlus,
  Info,
  AlertCircle,
  Loader2,
  BookOpen,
  FileText,
} from "lucide-react";
import { TEMPLATE_VARIABLES } from "@/lib/template-engine";
import { githubClient } from "@/services/github-client";

interface Template {
  name: string;
  path: string;
  preview?: string;
  content?: string;
  isBuiltIn?: boolean;
}

// Built-in templates (same as create-note-dialog)
const BUILTIN_TEMPLATES: Template[] = [
  {
    name: "Note vide",
    path: "_builtin/blank",
    preview: "Template minimaliste pour une nouvelle note",
    content: "# {{title}}\n\n",
    isBuiltIn: true,
  },
  {
    name: "Daily Note",
    path: "_builtin/daily",
    preview: "Note journalière avec date et sections structurées",
    content: `---
date: {{date:YYYY-MM-DD}}
tags: [daily]
---

# {{date:dddd DD MMMM YYYY}}

## 📋 Tâches
- [ ]

## 📝 Notes

`,
    isBuiltIn: true,
  },
  {
    name: "Meeting Notes",
    path: "_builtin/meeting",
    preview: "Notes de réunion avec ordre du jour et actions",
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
    isBuiltIn: true,
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesFolder, setTemplatesFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [viewTemplate, setViewTemplate] = useState<Template | null>(null);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Create template states
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Show status message temporarily
  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Fetch templates from vault
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/github/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        setTemplatesFolder(data.folder || null);
      } else {
        setError("Erreur lors du chargement des templates");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Fetch full content for view/edit
  const loadTemplateContent = async (template: Template) => {
    if (template.isBuiltIn || template.content) {
      return template.content || "";
    }
    try {
      const res = await fetch(
        `/api/github/read?path=${encodeURIComponent(template.path)}`
      );
      if (res.ok) {
        const data = await res.json();
        return data.content || "";
      }
    } catch {
      // ignore
    }
    return "";
  };

  // Handle view template
  const handleView = async (template: Template) => {
    const content = await loadTemplateContent(template);
    setViewTemplate({ ...template, content });
  };

  // Handle edit template
  const handleEdit = async (template: Template) => {
    const content = await loadTemplateContent(template);
    setEditTemplate(template);
    setEditContent(content);
  };

  // Save edited template
  const handleSave = async () => {
    if (!editTemplate) return;
    setSaving(true);
    try {
      // Get current SHA first
      const noteData = await githubClient.readNote(editTemplate.path);
      await githubClient.saveNote(editTemplate.path, editContent, noteData.sha);
      showStatus("success", "Template sauvegardé");
      setEditTemplate(null);
      fetchTemplates();
    } catch {
      showStatus("error", "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Create new template
  const handleCreate = async () => {
    if (!newName.trim() || !templatesFolder) return;
    setCreating(true);
    try {
      const path = `${templatesFolder}/${newName.trim()}.md`;
      await githubClient.createNote(path, newContent || `# {{title}}\n\n`);
      showStatus("success", "Template créé");
      setShowCreate(false);
      setNewName("");
      setNewContent("");
      fetchTemplates();
    } catch {
      showStatus("error", "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  // Delete template
  const handleDelete = async (template: Template) => {
    if (!confirm(`Supprimer le template "${template.name}" ?`)) return;
    try {
      // Get current SHA first
      const noteData = await githubClient.readNote(template.path);
      await githubClient.deleteNote(template.path, noteData.sha);
      showStatus("success", "Template supprimé");
      fetchTemplates();
    } catch {
      showStatus("error", "Erreur lors de la suppression");
    }
  };

  // Copy content
  const handleCopy = async (content: string, path: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(path);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      showStatus("error", "Erreur lors de la copie");
    }
  };

  // Render template card
  const TemplateCard = ({ template, showActions = false }: { template: Template; showActions?: boolean }) => (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-medium">
              {template.name}
            </CardTitle>
          </div>
          {template.isBuiltIn && (
            <Badge variant="secondary" className="shrink-0">Built-in</Badge>
          )}
        </div>
        {template.preview && (
          <CardDescription className="line-clamp-2 text-xs">
            {template.preview}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleView(template)}
          >
            <Eye className="h-3 w-3 mr-1" />
            Voir
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={async () => {
              const content = await loadTemplateContent(template);
              handleCopy(content, template.path);
            }}
          >
            {copied === template.path ? (
              <Check className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 mr-1" />
            )}
            Copier
          </Button>
          {showActions && !template.isBuiltIn && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleEdit(template)}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => handleDelete(template)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Supprimer
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Gestionnaire de Templates</h1>
        </div>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            statusMessage.type === "success"
              ? "bg-green-500/10 text-green-600 border border-green-500/30"
              : "bg-destructive/10 text-destructive border border-destructive/30"
          }`}
        >
          {statusMessage.type === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {statusMessage.text}
        </div>
      )}

      <Tabs defaultValue="builtin" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builtin" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Built-in
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-1.5">
            <FolderPlus className="h-3.5 w-3.5" />
            Mes Templates
            {templates.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {templates.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-1.5">
            <Info className="h-3.5 w-3.5" />
            Guide
          </TabsTrigger>
        </TabsList>

        {/* Built-in templates tab */}
        <TabsContent value="builtin" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Templates intégrés disponibles lors de la création d'une note.
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BUILTIN_TEMPLATES.map((template) => (
              <TemplateCard key={template.path} template={template} />
            ))}
          </div>
        </TabsContent>

        {/* Custom templates tab */}
        <TabsContent value="custom" className="space-y-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-7 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="border-destructive/50">
              <CardContent className="flex items-center gap-3 py-6">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={fetchTemplates}>
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center space-y-4">
                <FolderPlus className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-medium mb-1">Aucun template personnalisé</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Créez un dossier <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Templates/</code> dans votre vault
                    et ajoutez-y des fichiers .md pour créer vos propres templates.
                  </p>
                </div>
                {templatesFolder && (
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer mon premier template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Templates depuis <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{templatesFolder}/</code>
                </div>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <TemplateCard key={template.path} template={template} showActions />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Guide tab */}
        <TabsContent value="guide" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Variables de Template
              </CardTitle>
              <CardDescription>
                Utilisez ces variables dans vos templates. Elles seront remplacées automatiquement lors de la création d'une note.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {TEMPLATE_VARIABLES.map(({ variable, description }) => (
                  <div
                    key={variable}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <code className="bg-background px-2 py-1 rounded text-xs font-mono shrink-0 border">
                      {variable}
                    </code>
                    <span className="text-sm text-muted-foreground">
                      {description}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Formats de Date</CardTitle>
              <CardDescription>
                Utilisez des formats personnalisés avec <code className="bg-muted px-1 rounded">{"{{date:FORMAT}}"}</code> ou <code className="bg-muted px-1 rounded">{"{{time:FORMAT}}"}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                {[
                  { token: "YYYY", desc: "Année (2025)" },
                  { token: "YY", desc: "Année courte (25)" },
                  { token: "MM", desc: "Mois avec zéro (01-12)" },
                  { token: "M", desc: "Mois (1-12)" },
                  { token: "DD", desc: "Jour avec zéro (01-31)" },
                  { token: "D", desc: "Jour (1-31)" },
                  { token: "dddd", desc: "Jour de la semaine (Monday)" },
                  { token: "ddd", desc: "Jour court (Mon)" },
                  { token: "HH", desc: "Heure 24h (00-23)" },
                  { token: "hh", desc: "Heure 12h (01-12)" },
                  { token: "mm", desc: "Minutes (00-59)" },
                  { token: "ss", desc: "Secondes (00-59)" },
                  { token: "A", desc: "AM/PM" },
                  { token: "a", desc: "am/pm" },
                ].map(({ token, desc }) => (
                  <div key={token} className="flex items-center gap-2">
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs w-12 text-center">{token}</code>
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium mb-2">Exemples</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><code className="bg-background px-1 rounded">{"{{date:DD/MM/YYYY}}"}</code> → 25/01/2025</p>
                  <p><code className="bg-background px-1 rounded">{"{{date:YYYY-MM-DD}}"}</code> → 2025-01-25</p>
                  <p><code className="bg-background px-1 rounded">{"{{time:HH:mm}}"}</code> → 14:30</p>
                  <p><code className="bg-background px-1 rounded">{"{{date:dddd}}"}</code> → Saturday</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Structure Recommandée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Créez un dossier <code className="bg-muted px-1.5 py-0.5 rounded">Templates/</code> à la racine de votre vault.
                Chaque fichier .md dans ce dossier sera disponible comme template.
              </p>
              <div className="p-3 bg-muted/50 rounded-lg font-mono text-xs">
                <div className="text-muted-foreground">vault/</div>
                <div className="pl-4">
                  <div className="text-primary">📁 Templates/</div>
                  <div className="pl-4 text-muted-foreground">
                    <div>📄 daily-note.md</div>
                    <div>📄 meeting.md</div>
                    <div>📄 project.md</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Les noms de dossier alternatifs reconnus : <code>Templates</code>, <code>_templates</code>, <code>templates</code>, <code>_Templates</code>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Template Dialog */}
      <Dialog open={!!viewTemplate} onOpenChange={() => setViewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {viewTemplate?.name}
              {viewTemplate?.isBuiltIn && (
                <Badge variant="secondary">Built-in</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Contenu du template
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            <pre className="p-4 bg-muted/50 rounded-lg text-sm font-mono whitespace-pre-wrap break-words">
              {viewTemplate?.content}
            </pre>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (viewTemplate?.content) {
                  handleCopy(viewTemplate.content, viewTemplate.path);
                }
              }}
            >
              {copied === viewTemplate?.path ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copier
            </Button>
            <Button onClick={() => setViewTemplate(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Modifier: {editTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Modifiez le contenu du template
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-full min-h-[300px] font-mono text-sm resize-none"
              placeholder="Contenu du template..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Créer un Template
            </DialogTitle>
            <DialogDescription>
              Créez un nouveau template dans votre vault
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du template</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ex: project, weekly-review..."
              />
              {newName && templatesFolder && (
                <p className="text-xs text-muted-foreground">
                  Sera créé dans: <code>{templatesFolder}/{newName.trim()}.md</code>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Contenu</Label>
              <Textarea
                id="content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder={`# {{title}}\n\n## Section\n\n`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
