"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePinnedStore } from "@/lib/pinned-store";

/**
 * Hook to sync pins from server when user is authenticated
 * Should be called once in the dashboard layout
 */
export function usePinsSync() {
  const { data: session, status } = useSession();
  const { fetchFromServer } = usePinnedStore();
  const hasFetched = useRef(false);

  useEffect(() => {
    // Only fetch once when user is authenticated
    if (status === "authenticated" && session?.user?.id && !hasFetched.current) {
      hasFetched.current = true;
      fetchFromServer();
    }

    // Reset flag when user logs out
    if (status === "unauthenticated") {
      hasFetched.current = false;
    }
  }, [status, session?.user?.id, fetchFromServer]);
}
