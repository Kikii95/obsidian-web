"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLockStore } from "@/lib/lock-store";
import { PinDialog } from "./pin-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GlobalLockStatus() {
  const { hasPinConfigured, isUnlocked, unlockExpiry, lock, initializeLockState, checkUnlockExpiry } = useLockStore();
  const [timeRemaining, setTimeRemaining] = useState<string>("");
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

  // Don't show if no PIN configured
  if (!hasPinConfigured) return null;

  return (
    <TooltipProvider>
      {isUnlocked ? (
        <div className="flex items-center gap-1">
          {/* Timer badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                <Unlock className="h-3.5 w-3.5" />
                <span>{timeRemaining || "Déverrouillé"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notes privées déverrouillées</p>
              {timeRemaining && <p className="text-xs text-muted-foreground">Se verrouille dans {timeRemaining}</p>}
            </TooltipContent>
          </Tooltip>

          {/* Re-lock button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={lock}
                className="h-8 w-8"
              >
                <Lock className="h-4 w-4 text-amber-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reverrouiller maintenant</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPinDialog(true)}
              className="h-8 w-8"
            >
              <Lock className="h-4 w-4 text-amber-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Déverrouiller les notes privées</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* PIN Dialog */}
      <PinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onSuccess={() => setShowPinDialog(false)}
        mode="unlock"
      />
    </TooltipProvider>
  );
}
