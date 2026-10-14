"use client";

import { memo } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { useSettingsStore } from "@/lib/settings-store";

interface BreadcrumbItem {
  name: string;
  path: string;
  isLast: boolean;
}

interface NoteBreadcrumbProps {
  items: BreadcrumbItem[];
}

// Build folder URL from path segments
function buildFolderUrl(path: string): string {
  // path is like "Stats/Ideas" - encode each segment
  const encoded = path
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `/folder/${encoded}`;
}

export const NoteBreadcrumb = memo(function NoteBreadcrumb({
  items,
}: NoteBreadcrumbProps) {
  const { settings } = useSettingsStore();
  const vaultRootPath = settings.vaultRootPath || "";
  const homeHref = vaultRootPath
    ? `/folder/${vaultRootPath.split("/").map(encodeURIComponent).join("/")}`
    : "/folder";

  // Le chemin = une pile d'intercalaires (fiches-guides à onglet), DA §5.
  return (
    <nav aria-label="Chemin de la note" className="intercalaires min-w-0">
      <Link href={homeHref} className="intercalaire" title="Racine du coffre" aria-label="Racine du coffre">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((crumb, index) =>
        crumb.isLast ? (
          <span key={crumb.path} className="intercalaire intercalaire-courant" aria-current="page">
            {crumb.name}
          </span>
        ) : (
          <Link
            key={crumb.path}
            href={buildFolderUrl(items.slice(0, index + 1).map(i => i.name).join("/"))}
            className="intercalaire"
          >
            {crumb.name}
          </Link>
        )
      )}
    </nav>
  );
});
