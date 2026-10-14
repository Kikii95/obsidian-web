"use client";

import Link from "next/link";
import { AlertCircle, ChevronRight, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function NoteLoadingState() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Skeleton className="h-4 w-20" />
        <ChevronRight className="h-3 w-3" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-2" />
      <Skeleton className="h-4 w-4/6 mb-2" />
      <Skeleton className="h-32 w-full mt-6" />
    </div>
  );
}

export function NoteErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Erreur de chargement</h2>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NoteNotFoundState() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Note non trouvée</h2>
        <p className="text-muted-foreground">
          Le fichier demandé n&apos;existe pas.
        </p>
        <Button variant="ghost" asChild>
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </div>
  );
}
