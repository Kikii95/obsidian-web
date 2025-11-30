"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10">
            <AlertOctagon className="h-10 w-10 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Erreur critique</h1>
            <p className="text-muted-foreground max-w-md">
              Une erreur inattendue s&apos;est produite.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground/60 font-mono">
                Code: {error.digest}
              </p>
            )}
          </div>

          <Button onClick={reset} size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Recharger l&apos;application
          </Button>
        </div>
      </body>
    </html>
  );
}
