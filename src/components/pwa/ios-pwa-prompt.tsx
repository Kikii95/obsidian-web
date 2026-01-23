"use client";

import { Share, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaPrompt } from "@/hooks/use-pwa-prompt";

/**
 * iOS-specific prompt to add app to home screen
 * Shows instructions for Safari share → Add to Home Screen flow
 */
export function IosPwaPrompt() {
  const { showPrompt, isIOS, dismiss } = usePwaPrompt();

  // Only show on iOS when prompt should be visible
  if (!showPrompt || !isIOS) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-popover border border-border rounded-xl shadow-lg p-4">
        {/* Header with close button */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Installer Obsidian Web</p>
              <p className="text-xs text-muted-foreground">Accès rapide depuis l&apos;écran d&apos;accueil</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium">1</span>
            <span className="flex items-center gap-1.5">
              Appuyez sur <Share className="h-4 w-4 text-primary" /> en bas de Safari
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium">2</span>
            <span className="flex items-center gap-1.5">
              Sélectionnez <Plus className="h-4 w-4" /> <strong>Sur l&apos;écran d&apos;accueil</strong>
            </span>
          </div>
        </div>

        {/* Dismiss button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={dismiss}
        >
          Plus tard
        </Button>
      </div>
    </div>
  );
}
