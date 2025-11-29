"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, X, ShieldCheck } from "lucide-react";
import { useLockStore } from "@/lib/lock-store";
import { cn } from "@/lib/utils";

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: "unlock" | "setup" | "change";
}

const PIN_LENGTH = 6;

export function PinDialog({ open, onOpenChange, onSuccess, mode = "unlock" }: PinDialogProps) {
  const { hasPinConfigured, setupPin, unlock, verifyPin } = useLockStore();
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [confirmPin, setConfirmPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isSetupMode = mode === "setup" || (!hasPinConfigured && mode === "unlock");
  const currentPin = step === "enter" ? pin : confirmPin;
  const setCurrentPin = step === "enter" ? setPin : setConfirmPin;
  const currentRefs = step === "enter" ? inputRefs : confirmInputRefs;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPin(Array(PIN_LENGTH).fill(""));
      setConfirmPin(Array(PIN_LENGTH).fill(""));
      setStep("enter");
      setError(null);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handleDigitInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...currentPin];
    newPin[index] = value.slice(-1);
    setCurrentPin(newPin);
    setError(null);

    // Move to next input
    if (value && index < PIN_LENGTH - 1) {
      currentRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (value && index === PIN_LENGTH - 1) {
      const fullPin = newPin.join("");
      if (fullPin.length === PIN_LENGTH) {
        handleSubmit(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !currentPin[index] && index > 0) {
      currentRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (fullPin?: string) => {
    const pinToCheck = fullPin || currentPin.join("");
    if (pinToCheck.length !== PIN_LENGTH) {
      setError("Entrez un code à 6 chiffres");
      return;
    }

    setIsLoading(true);

    try {
      if (isSetupMode) {
        if (step === "enter") {
          // First entry - move to confirm
          setStep("confirm");
          setError(null);
          setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
        } else {
          // Confirm step - check if pins match
          const firstPin = pin.join("");
          if (pinToCheck !== firstPin) {
            setError("Les codes ne correspondent pas");
            setConfirmPin(Array(PIN_LENGTH).fill(""));
            setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
          } else {
            await setupPin(pinToCheck);
            onOpenChange(false);
            onSuccess?.();
          }
        }
      } else {
        // Unlock mode
        const success = await unlock(pinToCheck);
        if (success) {
          onOpenChange(false);
          onSuccess?.();
        } else {
          setError("Code incorrect");
          setPin(Array(PIN_LENGTH).fill(""));
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (isSetupMode) {
      return step === "enter" ? "Configurer un code" : "Confirmer le code";
    }
    return "Déverrouiller";
  };

  const getDescription = () => {
    if (isSetupMode) {
      return step === "enter"
        ? "Choisissez un code à 6 chiffres pour protéger vos notes privées"
        : "Entrez à nouveau votre code pour confirmer";
    }
    return "Entrez votre code pour accéder aux notes verrouillées";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {isSetupMode ? (
              <ShieldCheck className="h-6 w-6 text-primary" />
            ) : (
              <Lock className="h-6 w-6 text-primary" />
            )}
          </div>
          <DialogTitle className="text-center">{getTitle()}</DialogTitle>
          <DialogDescription className="text-center">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* PIN Input */}
          <div className="flex justify-center gap-2">
            {currentPin.map((digit, index) => (
              <input
                key={`${step}-${index}`}
                ref={(el) => { currentRefs.current[index] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitInput(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading}
                className={cn(
                  "h-12 w-10 rounded-lg border-2 text-center text-xl font-bold",
                  "bg-background transition-colors",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  error && "border-destructive",
                  digit && "border-primary bg-primary/5"
                )}
              />
            ))}
          </div>

          {/* Step indicator for setup */}
          {isSetupMode && (
            <div className="flex justify-center gap-2">
              <div className={cn(
                "h-2 w-8 rounded-full transition-colors",
                step === "enter" ? "bg-primary" : "bg-muted"
              )} />
              <div className={cn(
                "h-2 w-8 rounded-full transition-colors",
                step === "confirm" ? "bg-primary" : "bg-muted"
              )} />
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleSubmit()}
              disabled={isLoading || currentPin.join("").length !== PIN_LENGTH}
            >
              {isSetupMode && step === "enter" ? "Suivant" : "Valider"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
