"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  FileType,
  Globe,
  BookOpen,
  FileDown,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExportFormat } from "@/hooks/use-note-export";

interface ExportFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: ExportFormat) => Promise<void>;
  isExporting: boolean;
  fileName: string;
}

interface FormatOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
  badge?: string;
}

const formats: FormatOption[] = [
  {
    id: "md",
    name: "Markdown",
    description: "Format brut, éditable partout",
    icon: <FileText className="h-5 w-5" />,
    extension: ".md",
  },
  {
    id: "pdf",
    name: "PDF",
    description: "Mise en page fixe, prêt à imprimer",
    icon: <FileType className="h-5 w-5" />,
    extension: ".pdf",
  },
  {
    id: "html",
    name: "HTML",
    description: "Page web autonome avec styles",
    icon: <Globe className="h-5 w-5" />,
    extension: ".html",
    badge: "Nouveau",
  },
  {
    id: "docx",
    name: "Word (DOCX)",
    description: "Compatible Microsoft Word",
    icon: <FileDown className="h-5 w-5" />,
    extension: ".docx",
    badge: "Nouveau",
  },
  {
    id: "epub",
    name: "EPUB",
    description: "E-book pour liseuses",
    icon: <BookOpen className="h-5 w-5" />,
    extension: ".epub",
    badge: "Nouveau",
  },
];

export function ExportFormatDialog({
  open,
  onOpenChange,
  onExport,
  isExporting,
  fileName,
}: ExportFormatDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [exportedFormat, setExportedFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setSelectedFormat(format);
    setExportedFormat(null);

    try {
      await onExport(format);
      setExportedFormat(format);

      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false);
        setSelectedFormat(null);
        setExportedFormat(null);
      }, 1000);
    } catch {
      setSelectedFormat(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exporter la note</DialogTitle>
          <DialogDescription>
            Choisissez le format d&apos;export pour <strong>{fileName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {formats.map((format) => {
            const isSelected = selectedFormat === format.id;
            const isExported = exportedFormat === format.id;

            return (
              <button
                key={format.id}
                onClick={() => handleExport(format.id)}
                disabled={isExporting}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg border transition-all text-left",
                  "hover:bg-muted/50 hover:border-primary/50",
                  isSelected && "border-primary bg-primary/5",
                  isExported && "border-green-500 bg-green-500/5"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-md",
                    isExported
                      ? "bg-green-500/10 text-green-500"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isExporting && isSelected ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isExported ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    format.icon
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{format.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format.extension}
                    </span>
                    {format.badge && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {format.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {format.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
