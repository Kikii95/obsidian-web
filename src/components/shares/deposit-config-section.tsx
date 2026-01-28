"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_DEPOSIT_CONFIG } from "@/types/shares";

// File type presets
const FILE_TYPE_PRESETS = {
  images: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
  documents: [".pdf", ".md", ".txt", ".docx", ".doc"],
  all: null as string[] | null,
};

interface DepositConfigSectionProps {
  maxFileSize: number;
  setMaxFileSize: (size: number) => void;
  allowedTypes: string[] | null;
  setAllowedTypes: (types: string[] | null) => void;
  depositFolder: string | null;
  setDepositFolder: (folder: string | null) => void;
}

export function DepositConfigSection({
  maxFileSize,
  setMaxFileSize,
  allowedTypes,
  setAllowedTypes,
  depositFolder,
  setDepositFolder,
}: DepositConfigSectionProps) {
  // Convert bytes to MB for display
  const maxFileSizeMB = Math.round(maxFileSize / (1024 * 1024));

  // Check which presets are active
  const isAllTypes = allowedTypes === null;
  const hasImages = allowedTypes?.some((t) => FILE_TYPE_PRESETS.images.includes(t)) ?? false;
  const hasDocs = allowedTypes?.some((t) => FILE_TYPE_PRESETS.documents.includes(t)) ?? false;

  // Handle preset toggle
  const togglePreset = (preset: "all" | "images" | "documents") => {
    if (preset === "all") {
      setAllowedTypes(null);
      return;
    }

    const presetTypes = FILE_TYPE_PRESETS[preset];
    const currentTypes = allowedTypes || [];

    if (preset === "images") {
      if (hasImages) {
        // Remove images
        setAllowedTypes(currentTypes.filter((t) => !FILE_TYPE_PRESETS.images.includes(t)));
      } else {
        // Add images
        const newTypes = [...new Set([...currentTypes, ...FILE_TYPE_PRESETS.images])];
        setAllowedTypes(newTypes.length > 0 ? newTypes : null);
      }
    } else if (preset === "documents") {
      if (hasDocs) {
        // Remove documents
        setAllowedTypes(currentTypes.filter((t) => !FILE_TYPE_PRESETS.documents.includes(t)));
      } else {
        // Add documents
        const newTypes = [...new Set([...currentTypes, ...FILE_TYPE_PRESETS.documents])];
        setAllowedTypes(newTypes.length > 0 ? newTypes : null);
      }
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <p className="text-sm font-medium text-muted-foreground">
        Configuration du dépôt
      </p>

      {/* Max file size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Taille max par fichier</Label>
          <span className="text-sm font-medium">{maxFileSizeMB} MB</span>
        </div>
        <Slider
          value={[maxFileSizeMB]}
          onValueChange={([value]) => setMaxFileSize(value * 1024 * 1024)}
          min={1}
          max={50}
          step={1}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Limite de taille pour chaque fichier déposé
        </p>
      </div>

      {/* Allowed file types */}
      <div className="space-y-2">
        <Label>Types de fichiers autorisés</Label>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={isAllTypes}
              onCheckedChange={() => togglePreset("all")}
            />
            <span>Tous</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={hasImages && !isAllTypes}
              disabled={isAllTypes}
              onCheckedChange={() => togglePreset("images")}
            />
            <span>Images</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={hasDocs && !isAllTypes}
              disabled={isAllTypes}
              onCheckedChange={() => togglePreset("documents")}
            />
            <span>Documents</span>
          </label>
        </div>
        {!isAllTypes && allowedTypes && allowedTypes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Extensions : {allowedTypes.join(", ")}
          </p>
        )}
      </div>

      {/* Deposit folder */}
      <div className="space-y-2">
        <Label htmlFor="deposit-folder">Sous-dossier de dépôt (optionnel)</Label>
        <Input
          id="deposit-folder"
          value={depositFolder || ""}
          onChange={(e) => setDepositFolder(e.target.value || null)}
          placeholder="ex: uploads, depot"
        />
        <p className="text-xs text-muted-foreground">
          Les fichiers seront déposés dans ce sous-dossier du dossier partagé
        </p>
      </div>
    </div>
  );
}
