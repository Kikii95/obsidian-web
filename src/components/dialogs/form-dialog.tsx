"use client";

import { type ReactNode, type FormEvent } from "react";
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
import { useDialogAction, useDialogState } from "@/hooks/use-dialog-action";

interface FormDialogProps {
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  submitLabel?: string;
  submitLoadingLabel?: string;
  submitIcon?: ReactNode;
  variant?: "default" | "destructive";
  children: ReactNode;
  onSubmit: () => Promise<void>;
  onSuccess?: () => void;
  navigateTo?: string;
  refreshTree?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * Generic form dialog for CRUD operations
 * Handles loading, error states, controlled/uncontrolled mode
 */
export function FormDialog({
  trigger,
  title,
  description,
  submitLabel = "Enregistrer",
  submitLoadingLabel = "En cours...",
  submitIcon,
  variant = "default",
  children,
  onSubmit,
  onSuccess,
  navigateTo,
  refreshTree = true,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onOpen,
  onClose,
}: FormDialogProps) {
  const { open, setOpen } = useDialogState(controlledOpen, controlledOnOpenChange);

  const { isLoading, error, execute, clearError } = useDialogAction({
    onSuccess: () => {
      setOpen(false);
      onSuccess?.();
    },
    navigateTo,
    refreshTree,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await execute(onSubmit);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      clearError();
      onOpen?.();
    } else {
      onClose?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={variant === "destructive" ? "text-destructive" : ""}>
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription asChild>
              <div>{description}</div>
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {children}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" variant={variant} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                submitIcon && <span className="mr-2">{submitIcon}</span>
              )}
              {isLoading ? submitLoadingLabel : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
