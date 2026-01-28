"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Upload, AlertCircle, Clock, Loader2, Shield, Calendar } from "lucide-react";
import { DepositUploadZone } from "@/components/shares/deposit-upload-zone";
import type { ShareMode, DepositConfig } from "@/types/shares";

interface DepositMetadata {
  token: string;
  folderPath: string;
  folderName: string;
  mode: ShareMode;
  expiresAt: string;
  isExpired: boolean;
  depositConfig?: DepositConfig;
}

export default function DepositPage() {
  const params = useParams();
  const token = params.token as string;

  const [metadata, setMetadata] = useState<DepositMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  // Fetch share metadata
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/shares/${token}`);
        if (!res.ok) {
          const data = await res.json();
          if (data.expired) {
            setExpired(true);
            setError("Ce lien de partage a expiré");
          } else {
            setError(data.error || "Partage non trouvé");
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        const share = data.share as DepositMetadata;

        // Verify this is a deposit share
        if (share.mode !== "deposit") {
          // Redirect to regular share page
          window.location.href = `/s/${token}`;
          return;
        }

        setMetadata(share);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Format expiration date
  const formatExpiration = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Expiré";
    if (diffDays === 1) return "Expire demain";
    if (diffDays < 7) return `Expire dans ${diffDays} jours`;
    if (diffDays < 30) return `Expire dans ${Math.ceil(diffDays / 7)} semaines`;
    return `Expire le ${date.toLocaleDateString("fr-FR")}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center max-w-md">
          {expired ? (
            <Clock className="h-16 w-16 mx-auto text-amber-500 mb-4" />
          ) : (
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
          )}
          <h1 className="text-2xl font-bold mb-2">
            {expired ? "Lien expiré" : "Erreur"}
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <p className="text-sm text-muted-foreground">
            Demandez un nouveau lien à la personne qui vous l'a partagé.
          </p>
        </div>
      </div>
    );
  }

  if (!metadata) return null;

  const depositConfig = metadata.depositConfig || {
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: null,
    depositFolder: null,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold truncate">
                Dépôt : {metadata.folderName}
              </h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Dépôt sécurisé
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatExpiration(metadata.expiresAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="space-y-6">
          {/* Instructions */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Déposez vos fichiers</h2>
            <p className="text-muted-foreground">
              Glissez-déposez vos fichiers ou cliquez pour les sélectionner.
              <br />
              <span className="text-sm">
                Vos fichiers seront envoyés de manière sécurisée.
              </span>
            </p>
          </div>

          {/* Upload zone */}
          <DepositUploadZone
            token={token}
            maxFileSize={depositConfig.maxFileSize}
            allowedTypes={depositConfig.allowedTypes}
            depositFolder={depositConfig.depositFolder}
            shareName={metadata.folderName}
          />

          {/* Privacy notice */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>
              <Shield className="h-3 w-3 inline mr-1" />
              Mode dépôt : vous ne pouvez pas voir les fichiers existants.
            </p>
            <p>
              Une fois déposés, vos fichiers seront visibles par le propriétaire du dossier.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
