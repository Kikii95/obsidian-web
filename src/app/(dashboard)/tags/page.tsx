"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, Search, Hash, FileText, AlertCircle, RefreshCw, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TagInfo {
  name: string;
  count: number;
  notes: {
    path: string;
    name: string;
  }[];
}

interface TagsResponse {
  tags: TagInfo[];
  totalTags: number;
  totalNotes: number;
  needsIndex?: boolean;
  message?: string;
}

export default function TagsPage() {
  const [data, setData] = useState<TagsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const fetchTags = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/github/tags");
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
    } catch {
      setError("Impossible de charger les tags");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on mount (uses PostgreSQL index, no API cost)
  useEffect(() => {
    fetchTags();
  }, []);

  // Filter tags by search
  const filteredTags = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.tags;

    const lowerSearch = search.toLowerCase();
    return data.tags.filter((tag) => tag.name.toLowerCase().includes(lowerSearch));
  }, [data, search]);

  // Get notes for selected tag
  const selectedTagInfo = useMemo(() => {
    if (!selectedTag || !data) return null;
    return data.tags.find((t) => t.name === selectedTag);
  }, [selectedTag, data]);

  // Calculate tag size based on count
  const getTagSize = (count: number, maxCount: number): string => {
    const ratio = count / maxCount;
    if (ratio > 0.7) return "text-2xl font-bold";
    if (ratio > 0.4) return "text-lg font-semibold";
    if (ratio > 0.2) return "text-base font-medium";
    return "text-sm";
  };

  const maxCount = data ? Math.max(...data.tags.map((t) => t.count), 1) : 1;

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Tag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Tags</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Recherche des tags en cours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Erreur de chargement</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={fetchTags}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  // Index not available - show message with link to settings
  if (data?.needsIndex) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Tag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Tags</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-16 border border-border/50 rounded-lg bg-card/50">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Tag className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Indexation requise</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Les tags utilisent un index PostgreSQL pour de meilleures performances.
            Lance l&apos;indexation depuis les paramètres.
          </p>
          <Button asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.tags.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Tag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Tags</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Hash className="h-12 w-12 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Aucun tag trouvé dans le vault</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Tags</h1>
          <Badge variant="outline">{data.totalTags} tags</Badge>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/tags/manage">
            <Settings className="h-4 w-4 mr-2" />
            Gérer
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un tag..."
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tag Cloud */}
        <div className="lg:col-span-2">
          <div className="border border-border/50 rounded-lg p-6 bg-card/50">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              Nuage de tags ({filteredTags.length})
            </h2>
            <div className="flex flex-wrap gap-3">
              {filteredTags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() =>
                    setSelectedTag(selectedTag === tag.name ? null : tag.name)
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-full transition-all",
                    getTagSize(tag.count, maxCount),
                    selectedTag === tag.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  #{tag.name}
                  <span className="ml-1.5 text-xs opacity-70">({tag.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags List */}
          <div className="mt-6 border border-border/50 rounded-lg bg-card/50">
            <h2 className="text-sm font-medium text-muted-foreground px-4 py-3 border-b border-border/50">
              Liste des tags
            </h2>
            <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
              {filteredTags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() =>
                    setSelectedTag(selectedTag === tag.name ? null : tag.name)
                  }
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors",
                    selectedTag === tag.name && "bg-primary/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary/70" />
                    <span className="font-medium">{tag.name}</span>
                  </div>
                  <Badge variant="secondary">{tag.count}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Tag Details */}
        <div className="lg:col-span-1">
          <div className="border border-border/50 rounded-lg bg-card/50 sticky top-20">
            {selectedTagInfo ? (
              <>
                <div className="px-4 py-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-lg">{selectedTagInfo.name}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTagInfo.count} note{selectedTagInfo.count > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
                  {selectedTagInfo.notes.map((note) => {
                    const href = `/note/${encodeURIComponent(
                      note.path.replace(/\.md$/, "")
                    )}`;

                    return (
                      <Link
                        key={note.path}
                        href={href}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/50 transition-colors group"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        <span className="truncate group-hover:text-primary transition-colors">
                          {note.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="px-4 py-12 text-center text-muted-foreground">
                <Hash className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sélectionnez un tag pour voir les notes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
