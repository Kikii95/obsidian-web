"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShareLinkResultProps {
  token: string;
  folderName: string;
  isNote?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareLinkResult({
  token,
  folderName,
  isNote = false,
  open,
  onOpenChange,
}: ShareLinkResultProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${token}`
      : `/s/${token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(shareUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-green-600 dark:text-green-400 flex items-center gap-2">
            <Check className="h-5 w-5" />
            Lien de partage créé !
          </DialogTitle>
          <DialogDescription>
            Partagez ce lien pour donner accès {isNote ? "à la note" : "au dossier"}{" "}
            <span className="font-medium">{folderName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* URL input with copy button */}
          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="font-mono text-sm"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleOpenInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir
            </Button>
            <Button onClick={() => onOpenChange(false)}>Terminé</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
