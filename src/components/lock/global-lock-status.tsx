"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLockStore } from "@/lib/lock-store";
import { useSettingsStore } from "@/lib/settings-store";
import { PinDialog } from "./pin-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GlobalLockStatus() {
  const { isUnlocked, unlockExpiry, lock, initializeLockState, checkUnlockExpiry } = useLockStore();
  // Read pinHash directly from settings (reactive to cloud sync)
  const pinHash = useSettingsStore((state) => state.settings?.pinHash);
  const hasPinConfigured = !!pinHash;
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
        // Unlocked state: single clickable button with timer, click to re-lock
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={lock}
              className="h-8 px-2 gap-1.5 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
            >
              <Unlock className="h-4 w-4" />
              <span className="text-xs font-medium">{timeRemaining || "OK"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Cliquer pour reverrouiller</p>
            {timeRemaining && <p className="text-xs text-muted-foreground">Auto-lock dans {timeRemaining}</p>}
          </TooltipContent>
        </Tooltip>
      ) : (
        // Locked state: click to unlock
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
