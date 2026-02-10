"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Link2, AlertCircle, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShareCard } from "@/components/shares/share-card";
import type {
  ShareDisplayData,
  ShareCardHandlers,
  ShareCardState,
  ShareCardUtils,
} from "@/types/shares";

export default function SharesPage() {
  const router = useRouter();
  const [shares, setShares] = useState<ShareDisplayData[]>([]);
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

  // Handlers for ShareCard
  const handlers: ShareCardHandlers = useMemo(
    () => ({
      onDelete: async (token: string) => {
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
      },
      onCopy: async (token: string) => {
        const url = `${window.location.origin}/s/${token}`;
        await navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
      },
      onRename: async (token: string, newName: string) => {
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
      },
    }),
    []
  );

  // State for ShareCard
  const state: ShareCardState = useMemo(
    () => ({
      deletingId,
      copiedToken,
    }),
    [deletingId, copiedToken]
  );

  // Utils for ShareCard
  const utils: ShareCardUtils = useMemo(
    () => ({
      formatDate: (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
      getTimeRemaining: (expiresAt: string) => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires.getTime() - now.getTime();

        if (diff <= 0) return "Expiré";

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}j restant${days > 1 ? "s" : ""}`;
        if (hours > 0) return `${hours}h restante${hours > 1 ? "s" : ""}`;
        return "< 1h";
      },
    }),
    []
  );

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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Link2 className="h-8 w-8 text-primary" />
            Liens de partage
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos liens de partage de dossiers et notes
          </p>
        </div>
        <Button variant="outline" asChild className="self-start sm:self-auto">
          <Link href="/shares/analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Link>
        </Button>
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
                    handlers={handlers}
                    state={state}
                    utils={utils}
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
                    handlers={handlers}
                    state={state}
                    utils={utils}
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
