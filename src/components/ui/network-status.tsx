"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Wifi, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function NetworkStatus() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show "back online" message when reconnecting
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      setDismissed(false);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Don't show anything if online and never was offline
  if (isOnline && !showReconnected) {
    return null;
  }

  // User dismissed the offline banner
  if (!isOnline && dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed bottom-4 right-4 z-50 p-2 bg-amber-500/20 backdrop-blur-sm rounded-full border border-amber-500/30"
        title="Mode hors ligne"
      >
        <WifiOff className="h-4 w-4 text-amber-500" />
      </button>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "px-4 py-2 rounded-full backdrop-blur-md shadow-lg",
        "flex items-center gap-2 text-sm font-medium",
        "transition-all duration-300",
        !isOnline
          ? "bg-amber-500/20 border border-amber-500/30 text-amber-200"
          : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-200"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Mode hors ligne — Notes en cache disponibles</span>
          <button
            onClick={() => setDismissed(true)}
            className="ml-2 hover:text-white transition-colors"
            aria-label="Masquer la notification"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4" />
          <span>Connexion rétablie</span>
        </>
      )}
    </div>
  );
}
