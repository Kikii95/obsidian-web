"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useVaultStore } from "@/lib/store";

interface UseDialogActionOptions {
  onSuccess?: () => void;
  navigateTo?: string;
  refreshTree?: boolean;
  closeOnSuccess?: boolean;
}

interface UseDialogActionReturn<T> {
  isLoading: boolean;
  error: string | null;
  execute: (action: () => Promise<T>) => Promise<T | undefined>;
  clearError: () => void;
  setError: (error: string) => void;
}

/**
 * Hook for handling async dialog actions with loading/error states
 * Automatically handles tree refresh and navigation on success
 */
export function useDialogAction<T = void>(
  options: UseDialogActionOptions = {}
): UseDialogActionReturn<T> {
  const {
    onSuccess,
    navigateTo,
    refreshTree = true,
    closeOnSuccess = true,
  } = options;

  const router = useRouter();
  const { triggerTreeRefresh } = useVaultStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (action: () => Promise<T>): Promise<T | undefined> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await action();

        if (refreshTree) {
          triggerTreeRefresh();
        }

        if (navigateTo) {
          router.push(navigateTo);
        }

        onSuccess?.();

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshTree, navigateTo, onSuccess, router, triggerTreeRefresh]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    isLoading,
    error,
    execute,
    clearError,
    setError,
  };
}

/**
 * Hook for controlled/uncontrolled dialog state
 */
export function useDialogState(
  controlledOpen?: boolean,
  controlledOnOpenChange?: (open: boolean) => void
) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  return { open, setOpen, isControlled };
}
