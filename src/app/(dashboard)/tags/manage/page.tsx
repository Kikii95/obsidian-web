"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Tag,
  Search,
  Pencil,
  Merge,
  Trash2,
  FileText,
  Loader2,
  AlertCircle,
  Check,
  X,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInfo {
  name: string;
  count: number;
  notes: { path: string; name: string }[];
}

interface ActionResult {
  success: boolean;
  message: string;
  affectedCount?: number;
}

type ActionType = "rename" | "merge" | "delete";

export default function TagsManagePage() {
  // Data state
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Action dialog state
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [mergeTarget, setMergeTarget] = useState<string>("");
  const [isPreview, setIsPreview] = useState(true);
  const [previewNotes, setPreviewNotes] = useState<{ path: string; name: string }[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  // Fetch tags
  useEffect(() => {
    async function fetchTags() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/github/tags");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setTags(data.tags || []);
      } catch {
        setError("Erreur lors du chargement des tags");
      } finally {
        setIsLoading(false);
      }
    }
    fetchTags();
  }, []);

  // Filter tags
  const filteredTags = useMemo(() => {
    if (!search.trim()) return tags;
    const lower = search.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(lower));
  }, [tags, search]);

  // Selected tag info
  const selectedTagInfo = useMemo(() => {
    return tags.find((t) => t.name === selectedTag);
  }, [tags, selectedTag]);

  // Other tags (for merge target)
  const otherTags = useMemo(() => {
    return tags.filter((t) => t.name !== selectedTag);
  }, [tags, selectedTag]);

  // Open action dialog
  const openActionDialog = (type: ActionType) => {
    setActionType(type);
    setNewTagName(type === "rename" ? selectedTag || "" : "");
    setMergeTarget("");
    setIsPreview(true);
    setPreviewNotes([]);
    setResult(null);
  };

  // Close action dialog
  const closeActionDialog = () => {
    setActionType(null);
    setNewTagName("");
    setMergeTarget("");
    setIsPreview(true);
    setPreviewNotes([]);
    setResult(null);
  };

  // Preview action
  const handlePreview = async () => {
    if (!selectedTag) return;

    setIsExecuting(true);
    try {
      const res = await fetch("/api/github/tags/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          tag: selectedTag,
          newTag: actionType === "merge" ? mergeTarget : newTagName,
          preview: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPreviewNotes(data.affectedNotes || []);
      setIsPreview(false);
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Erreur",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Execute action
  const handleExecute = async () => {
    if (!selectedTag) return;

    setIsExecuting(true);
    try {
      const res = await fetch("/api/github/tags/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          tag: selectedTag,
          newTag: actionType === "merge" ? mergeTarget : newTagName,
          preview: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult({
        success: true,
        message: `${data.successCount} note(s) modifiée(s)`,
        affectedCount: data.successCount,
      });

      // Refresh tags after action
      const tagsRes = await fetch("/api/github/tags");
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData.tags || []);
      }

      // Clear selection if tag was deleted/renamed
      if (actionType === "delete" || actionType === "rename") {
        setSelectedTag(actionType === "rename" ? newTagName : null);
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Erreur",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Action dialog content
  const getActionContent = () => {
    switch (actionType) {
      case "rename":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nouveau nom</Label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nouveau nom du tag"
              />
            </div>
          </div>
        );
      case "merge":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fusionner <Badge variant="secondary">{selectedTag}</Badge> avec :
            </p>
            <Select value={mergeTarget} onValueChange={setMergeTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un tag cible" />
              </SelectTrigger>
              <SelectContent>
                {otherTags.map((tag) => (
                  <SelectItem key={tag.name} value={tag.name}>
                    {tag.name} ({tag.count} notes)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "delete":
        return (
          <p className="text-sm text-muted-foreground">
            Cette action supprimera le tag de toutes les notes concernées.
          </p>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tags">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <span className="text-muted-foreground">|</span>
          <Settings2 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Gestion des tags</h1>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Tag list */}
        <div className="w-80 border-r bg-muted/10 flex flex-col shrink-0">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredTags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => setSelectedTag(tag.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-muted/50",
                    selectedTag === tag.name && "bg-primary/10 text-primary"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Tag className="h-3.5 w-3.5 shrink-0" />
                    {tag.name}
                  </span>
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    {tag.count}
                  </Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Detail panel */}
        <div className="flex-1 p-6">
          {selectedTag && selectedTagInfo ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Tag className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">{selectedTag}</h2>
                  <Badge variant="outline">{selectedTagInfo.count} notes</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActionDialog("rename")}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Renommer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActionDialog("merge")}
                    disabled={otherTags.length === 0}
                  >
                    <Merge className="h-4 w-4 mr-2" />
                    Fusionner
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => openActionDialog("delete")}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes avec ce tag
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {selectedTagInfo.notes.map((note) => (
                        <Link
                          key={note.path}
                          href={`/note/${note.path.replace(/\.md$/, "")}`}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 text-sm"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{note.name}</span>
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Tag className="h-12 w-12 mb-4 opacity-50" />
              <p>Sélectionnez un tag à gérer</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "rename" && "Renommer le tag"}
              {actionType === "merge" && "Fusionner les tags"}
              {actionType === "delete" && "Supprimer le tag"}
            </DialogTitle>
            <DialogDescription>
              Tag : <Badge variant="secondary">{selectedTag}</Badge>
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-md",
              result.success ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
            )}>
              {result.success ? (
                <Check className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{result.message}</span>
            </div>
          ) : isPreview ? (
            getActionContent()
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium">
                {previewNotes.length} note(s) seront modifiées :
              </p>
              <ScrollArea className="h-40 border rounded-md">
                <div className="p-2 space-y-1">
                  {previewNotes.map((note) => (
                    <div key={note.path} className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {note.name}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            {result ? (
              <Button onClick={closeActionDialog}>Fermer</Button>
            ) : isPreview ? (
              <>
                <Button variant="outline" onClick={closeActionDialog}>
                  Annuler
                </Button>
                <Button
                  onClick={handlePreview}
                  disabled={
                    isExecuting ||
                    (actionType === "rename" && !newTagName.trim()) ||
                    (actionType === "merge" && !mergeTarget)
                  }
                >
                  {isExecuting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Prévisualiser
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsPreview(true)}>
                  Retour
                </Button>
                <Button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  variant={actionType === "delete" ? "destructive" : "default"}
                >
                  {isExecuting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Confirmer
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
