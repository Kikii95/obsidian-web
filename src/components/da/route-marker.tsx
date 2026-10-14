"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Pose body[data-route] (premier segment du chemin) pour que la DA habille chaque écran sans toucher aux pages. */
export function RouteMarker() {
  const pathname = usePathname();

  useEffect(() => {
    const segment = pathname?.split("/").filter(Boolean)[0] ?? "accueil";
    document.body.dataset.route = segment;
  }, [pathname]);

  return null;
}
