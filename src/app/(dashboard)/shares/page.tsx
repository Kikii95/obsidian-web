"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Folder,
  FileText,
  Clock,
  Eye,
  Loader2,
  Link2,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Share {
  id: string;
  token: string;
  shareType: "folder" | "note";
  folderPath: string;
  folderName: string;
  name: string; // custom name or defaults to folderName
  includeSubfolders: boolean;
  createdAt: string;
  expiresAt: string;
  accessCount: number;
  isExpired: boolean;
}

export default function SharesPage() {
  const router = useRouter();
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Fetch shares
  useEffect(() => {
    const fetchShares = async () => {
      try {
        const res = await fetch("/api/shares");
        if (!res.ok) throw new Error("Erreur lors du chargement");
        const data = await res.json();
        setShares(data.shares);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };
    fetchShares();
  }, []);

  // Delete share
  const handleDelete = async (token: string) => {
    setDeletingId(token);
    try {
      const res = await fetch(`/api/shares/${token}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      setShares((prev) => prev.filter((s) => s.token !== token));
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Copy link
  const handleCopy = async (token: string) => {
    const url = `${window.location.origin}/s/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Rename share
  const handleRename = async (token: string, newName: string) => {
    try {
      const res = await fetch(`/api/shares/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error("Erreur lors du renommage");
      const data = await res.json();
      setShares((prev) =>
        prev.map((s) =>
          s.token === token ? { ...s, name: data.share.name } : s
        )
      );
      return true;
    } catch (err) {
      console.error("Rename error:", err);
      return false;
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Time remaining
  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return "Expiré";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}j restant${days > 1 ? "s" : ""}`;
    if (hours > 0) return `${hours}h restante${hours > 1 ? "s" : ""}`;
    return "< 1h";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.refresh()}>Réessayer</Button>
      </div>
    );
  }

  const activeShares = shares.filter((s) => !s.isExpired);
  const expiredShares = shares.filter((s) => s.isExpired);

  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Link2 className="h-8 w-8 text-primary" />
          Liens de partage
        </h1>
        <p className="text-muted-foreground mt-2">
          Gérez vos liens de partage de dossiers et notes
        </p>
      </div>

      {shares.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium mb-2">Aucun lien de partage</p>
            <p className="text-muted-foreground text-center max-w-md">
              Partagez un dossier ou une note depuis l'explorateur de fichiers
              pour créer votre premier lien.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Active shares */}
          {activeShares.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Actifs ({activeShares.length})
              </h2>
              <div className="grid gap-4">
                {activeShares.map((share) => (
                  <ShareCard
                    key={share.token}
                    share={share}
                    onDelete={handleDelete}
                    onCopy={handleCopy}
                    onRename={handleRename}
                    deletingId={deletingId}
                    copiedToken={copiedToken}
                    formatDate={formatDate}
                    getTimeRemaining={getTimeRemaining}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Expired shares */}
          {expiredShares.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                Expirés ({expiredShares.length})
              </h2>
              <div className="grid gap-4 opacity-60">
                {expiredShares.map((share) => (
                  <ShareCard
                    key={share.token}
                    share={share}
                    onDelete={handleDelete}
                    onCopy={handleCopy}
                    onRename={handleRename}
                    deletingId={deletingId}
                    copiedToken={copiedToken}
                    formatDate={formatDate}
                    getTimeRemaining={getTimeRemaining}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// Share card component
function ShareCard({
  share,
  onDelete,
  onCopy,
  onRename,
  deletingId,
  copiedToken,
  formatDate,
  getTimeRemaining,
}: {
  share: Share;
  onDelete: (token: string) => void;
  onCopy: (token: string) => void;
  onRename: (token: string, newName: string) => Promise<boolean>;
  deletingId: string | null;
  copiedToken: string | null;
  formatDate: (date: string) => string;
  getTimeRemaining: (date: string) => string;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(share.name);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRenameSubmit = async () => {
    if (renameValue.trim() === share.name) {
      setRenameOpen(false);
      return;
    }
    setIsRenaming(true);
    const success = await onRename(share.token, renameValue.trim());
    setIsRenaming(false);
    if (success) {
      setRenameOpen(false);
    }
  };

  const isNote = share.shareType === "note";
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/s/${share.token}`
    : `/s/${share.token}`;

  return (
    <Card className={cn(share.isExpired && "border-dashed")}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "p-2 rounded-lg shrink-0",
                isNote ? "bg-blue-500/10" : "bg-primary/10"
              )}
            >
              {isNote ? (
                <FileText className="h-5 w-5 text-blue-500" />
              ) : (
                <Folder className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate">
                {share.name}
              </CardTitle>
              <CardDescription className="truncate max-w-[200px] sm:max-w-none">
                {share.folderPath}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end sm:shrink-0">
            {/* Rename dialog */}
            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Renommer"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Renommer ce lien</DialogTitle>
                  <DialogDescription>
                    Changez le nom d'affichage de ce lien de partage
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="share-rename">Nouveau nom</Label>
                  <Input
                    id="share-rename"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder={share.folderName}
                    className="mt-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRenameSubmit();
                      }
                    }}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setRenameOpen(false)}
                    disabled={isRenaming}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleRenameSubmit} disabled={isRenaming}>
                    {isRenaming ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {isRenaming ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {!share.isExpired && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCopy(share.token)}
                  title="Copier le lien"
                >
                  {copiedToken === share.token ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  title="Ouvrir le lien"
                >
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  title="Supprimer"
                  disabled={deletingId === share.token}
                >
                  {deletingId === share.token ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce lien ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le lien vers "{share.name}" sera définitivement
                    supprimé. Les personnes ayant ce lien ne pourront plus
                    accéder au contenu.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(share.token)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* Type badge */}
          <Badge variant="secondary">
            {isNote ? "Note" : "Dossier"}
            {!isNote && share.includeSubfolders && " + sous-dossiers"}
          </Badge>

          {/* Expiration */}
          <div
            className={cn(
              "flex items-center gap-1",
              share.isExpired ? "text-destructive" : "text-muted-foreground"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{getTimeRemaining(share.expiresAt)}</span>
          </div>

          {/* Access count */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            <span>
              {share.accessCount} vue{share.accessCount > 1 ? "s" : ""}
            </span>
          </div>

          {/* Created date */}
          <div className="text-muted-foreground text-xs ml-auto">
            Créé le {formatDate(share.createdAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
