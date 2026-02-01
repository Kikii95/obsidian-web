"use client";

import { useState, useEffect, useCallback } from "react";
import { useWhatsNewStore } from "@/lib/whats-new-store";

export function useWhatsNew() {
  const [isOpen, setIsOpen] = useState(false);
  const store = useWhatsNewStore();

  // Auto-open au premier render si nouvelle version
  useEffect(() => {
    const timer = setTimeout(() => {
      if (store.hasNewVersion()) {
        setIsOpen(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const openModal = useCallback(() => setIsOpen(true), []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    store.markAsSeen();
  }, [store]);

  return {
    isOpen,
    setIsOpen,
    openModal,
    closeModal,
    hasNewVersion: store.hasNewVersion(),
  };
}
