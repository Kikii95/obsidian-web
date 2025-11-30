"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useDialogAction } from "@/hooks/use-dialog-action";

interface ConfirmDialogProps {
  trigger?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  confirmLoadingLabel?: string;
  confirmIcon?: ReactNode;
  variant?: "default" | "destructive";
  onConfirm: () => Promise<void>;
  onSuccess?: () => void;
  navigateTo?: string;
  refreshTree?: boolean;
}

/**
 * Generic confirmation dialog for simple actions
 * Handles loading, error states, and automatic tree refresh
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmer",
  confirmLoadingLabel = "En cours...",
  confirmIcon,
  variant = "default",
  onConfirm,
  onSuccess,
  navigateTo,
  refreshTree = true,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  const { isLoading, error, execute } = useDialogAction({
    onSuccess: () => {
      setOpen(false);
      onSuccess?.();
    },
    navigateTo,
    refreshTree,
  });

  const handleConfirm = async () => {
    await execute(onConfirm);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={variant === "destructive" ? "text-destructive" : ""}>
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div>{description}</div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              variant={variant}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                confirmIcon && <span className="mr-2">{confirmIcon}</span>
              )}
              {isLoading ? confirmLoadingLabel : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
