"use client";

import { useState, useEffect } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLockStore } from "@/lib/lock-store";
import { PinDialog } from "./pin-dialog";

interface LockedNoteViewProps {
  noteName: string;
}

export function LockedNoteView({ noteName }: LockedNoteViewProps) {
  const { hasPinConfigured, initializeLockState, checkUnlockExpiry } = useLockStore();
  const [showPinDialog, setShowPinDialog] = useState(false);

  // Initialize lock state on mount
  useEffect(() => {
    initializeLockState();
  }, [initializeLockState]);

  // Check expiry periodically
  useEffect(() => {
    const interval = setInterval(checkUnlockExpiry, 10000);
    return () => clearInterval(interval);
  }, [checkUnlockExpiry]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        {/* Lock icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/10 border-2 border-amber-500/30">
            <Lock className="h-12 w-12 text-amber-500" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Note verrouillée</h2>
          <p className="text-muted-foreground">
            <strong>{noteName}</strong> est protégée par un code
          </p>
        </div>

        {/* Description based on setup state */}
        <p className="text-sm text-muted-foreground">
          {hasPinConfigured
            ? "Entrez votre code à 6 chiffres pour déverrouiller cette note"
            : "Configurez un code pour accéder aux notes privées"}
        </p>

        {/* Unlock button */}
        <Button
          size="lg"
          onClick={() => setShowPinDialog(true)}
          className="gap-2"
        >
          {hasPinConfigured ? (
            <>
              <Lock className="h-4 w-4" />
              Déverrouiller
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Configurer un code
            </>
          )}
        </Button>

        {/* Info */}
        <p className="text-xs text-muted-foreground mt-4">
          Notes avec <code>private: true</code> ou dans <code>_private/</code>
          <br />
          Le déverrouillage reste actif pendant 5 minutes.
        </p>
      </div>

      {/* PIN Dialog */}
      <PinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onSuccess={() => setShowPinDialog(false)}
        mode={hasPinConfigured ? "unlock" : "setup"}
      />
    </div>
  );
}
