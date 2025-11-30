"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Une erreur est survenue</h2>
        <p className="text-muted-foreground max-w-md">
          {error.message || "Quelque chose s'est mal passé. Réessayez ou retournez à l'accueil."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            Code: {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Accueil
          </Link>
        </Button>
      </div>
    </div>
  );
}
