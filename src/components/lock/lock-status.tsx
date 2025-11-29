"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLockStore } from "@/lib/lock-store";
import { PinDialog } from "./pin-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LockStatusProps {
  isLocked: boolean;
}

export function LockStatus({ isLocked }: LockStatusProps) {
  const { isUnlocked, unlockExpiry, lock, hasPinConfigured } = useLockStore();
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [showPinDialog, setShowPinDialog] = useState(false);

  // Update time remaining every second
  useEffect(() => {
    if (!isUnlocked || !unlockExpiry) {
      setTimeRemaining("");
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const remaining = unlockExpiry - now;

      if (remaining <= 0) {
        setTimeRemaining("");
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isUnlocked, unlockExpiry]);

  // Only show for locked notes
  if (!isLocked) return null;

  // Note is in _private but not yet unlocked - show nothing (LockedNoteView handles this)
  if (!isUnlocked && !hasPinConfigured) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {isUnlocked ? (
          <>
            {/* Unlocked status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                  <Unlock className="h-3 w-3" />
                  <span className="hidden sm:inline">{timeRemaining || "Déverrouillé"}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Note privée déverrouillée</p>
                {timeRemaining && <p className="text-xs text-muted-foreground">Se verrouille dans {timeRemaining}</p>}
              </TooltipContent>
            </Tooltip>

            {/* Re-lock button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={lock}
                  className="h-7 w-7 p-0"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reverrouiller maintenant</p>
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            {/* Locked status - need to unlock */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPinDialog(true)}
                  className="h-7 gap-1 text-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span className="text-xs">Verrouillé</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cliquer pour déverrouiller</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      {/* PIN Dialog */}
      <PinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onSuccess={() => setShowPinDialog(false)}
        mode={hasPinConfigured ? "unlock" : "setup"}
      />
    </TooltipProvider>
  );
}
