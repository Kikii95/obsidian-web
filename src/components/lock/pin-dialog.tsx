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
import { Lock, ShieldCheck, KeyRound } from "lucide-react";
import { useLockStore } from "@/lib/lock-store";
import { cn } from "@/lib/utils";

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: "unlock" | "setup" | "change" | "verify";
  /** Custom context message for verify mode (e.g., "Suppression d'un fichier verrouillé") */
  contextMessage?: string;
}

const PIN_LENGTH = 6;

type ChangeStep = "old" | "new" | "confirm";

export function PinDialog({ open, onOpenChange, onSuccess, mode = "unlock", contextMessage }: PinDialogProps) {
  const { hasPinConfigured, setupPin, unlock, verifyPin, changePin } = useLockStore();
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [confirmPin, setConfirmPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [newPin, setNewPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [changeStep, setChangeStep] = useState<ChangeStep>("old");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const newInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isSetupMode = mode === "setup" || (!hasPinConfigured && mode === "unlock");
  const isChangeMode = mode === "change";
  const isVerifyMode = mode === "verify";

  // Determine current PIN array and refs based on mode and step
  const getCurrentPinState = () => {
    if (isChangeMode) {
      switch (changeStep) {
        case "old": return { pin: pin, setPin: setPin, refs: inputRefs };
        case "new": return { pin: newPin, setPin: setNewPin, refs: newInputRefs };
        case "confirm": return { pin: confirmPin, setPin: setConfirmPin, refs: confirmInputRefs };
      }
    }
    return step === "enter"
      ? { pin: pin, setPin: setPin, refs: inputRefs }
      : { pin: confirmPin, setPin: setConfirmPin, refs: confirmInputRefs };
  };

  const { pin: currentPin, setPin: setCurrentPin, refs: currentRefs } = getCurrentPinState();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPin(Array(PIN_LENGTH).fill(""));
      setConfirmPin(Array(PIN_LENGTH).fill(""));
      setNewPin(Array(PIN_LENGTH).fill(""));
      setStep("enter");
      setChangeStep("old");
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
      if (isChangeMode) {
        // Change PIN mode - 3 steps: old -> new -> confirm
        if (changeStep === "old") {
          // Verify old PIN
          const isValid = await verifyPin(pinToCheck);
          if (isValid) {
            setChangeStep("new");
            setError(null);
            setTimeout(() => newInputRefs.current[0]?.focus(), 100);
          } else {
            setError("Code actuel incorrect");
            setPin(Array(PIN_LENGTH).fill(""));
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
          }
        } else if (changeStep === "new") {
          // Move to confirm step
          setChangeStep("confirm");
          setError(null);
          setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
        } else {
          // Confirm step - check if new pins match
          const newPinValue = newPin.join("");
          if (pinToCheck !== newPinValue) {
            setError("Les codes ne correspondent pas");
            setConfirmPin(Array(PIN_LENGTH).fill(""));
            setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
          } else {
            // Change PIN
            const oldPinValue = pin.join("");
            const success = await changePin(oldPinValue, newPinValue);
            if (success) {
              onOpenChange(false);
              onSuccess?.();
            } else {
              setError("Erreur lors du changement");
            }
          }
        }
      } else if (isSetupMode) {
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
      } else if (isVerifyMode) {
        // Verify mode - just check PIN without global unlock
        const success = await verifyPin(pinToCheck);
        if (success) {
          onOpenChange(false);
          onSuccess?.();
        } else {
          setError("Code incorrect");
          setPin(Array(PIN_LENGTH).fill(""));
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      } else {
        // Unlock mode - verify and unlock globally
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
    if (isChangeMode) {
      switch (changeStep) {
        case "old": return "Code actuel";
        case "new": return "Nouveau code";
        case "confirm": return "Confirmer le nouveau code";
      }
    }
    if (isSetupMode) {
      return step === "enter" ? "Configurer un code" : "Confirmer le code";
    }
    if (isVerifyMode) {
      return "Vérification requise";
    }
    return "Déverrouiller";
  };

  const getDescription = () => {
    if (isChangeMode) {
      switch (changeStep) {
        case "old": return "Entrez votre code actuel pour le modifier";
        case "new": return "Choisissez votre nouveau code à 6 chiffres";
        case "confirm": return "Entrez à nouveau votre nouveau code";
      }
    }
    if (isSetupMode) {
      return step === "enter"
        ? "Choisissez un code à 6 chiffres pour protéger vos notes privées"
        : "Entrez à nouveau votre code pour confirmer";
    }
    if (isVerifyMode) {
      return contextMessage || "Entrez votre code pour confirmer cette action";
    }
    return "Entrez votre code pour accéder aux notes verrouillées";
  };

  const getIcon = () => {
    if (isChangeMode) return <KeyRound className="h-6 w-6 text-primary" />;
    if (isSetupMode) return <ShieldCheck className="h-6 w-6 text-primary" />;
    return <Lock className="h-6 w-6 text-primary" />;
  };

  const getStepCount = () => {
    if (isChangeMode) return 3;
    if (isSetupMode) return 2;
    return 0;
  };

  const getCurrentStepIndex = () => {
    if (isChangeMode) {
      return changeStep === "old" ? 0 : changeStep === "new" ? 1 : 2;
    }
    if (isSetupMode) {
      return step === "enter" ? 0 : 1;
    }
    return 0;
  };

  const stepCount = getStepCount();
  const currentStepIndex = getCurrentStepIndex();

  const getButtonLabel = () => {
    if (isChangeMode) {
      return changeStep === "confirm" ? "Valider" : "Suivant";
    }
    if (isSetupMode) {
      return step === "enter" ? "Suivant" : "Valider";
    }
    return "Valider";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {getIcon()}
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
                key={`${isChangeMode ? changeStep : step}-${index}`}
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

          {/* Step indicator for setup/change */}
          {stepCount > 0 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: stepCount }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 w-8 rounded-full transition-colors",
                    i <= currentStepIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
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
              {getButtonLabel()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
