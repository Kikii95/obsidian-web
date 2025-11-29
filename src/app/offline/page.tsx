"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Hors ligne</h1>
          <p className="text-muted-foreground max-w-md">
            Tu n&apos;es pas connecté à Internet. Vérifie ta connexion et réessaie.
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
        >
          Réessayer
        </Button>
      </div>
    </div>
  );
}
