"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  Save,
  X,
  Loader2,
  Lock,
  LockOpen,
  CloudOff,
  Trash2,
  FolderInput,
  TextCursorInput,
  MoreHorizontal,
  Download,
  Copy,
  Check,
  Pin,
  PinOff,
  History,
  Share2,
  Columns,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePinnedStore } from "@/lib/pinned-store";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { MoveNoteDialog } from "@/components/notes/move-note-dialog";
import { RenameNoteDialog } from "@/components/notes/rename-note-dialog";
import { ShareNoteDialog } from "@/components/shares/share-note-dialog";
import { ExportFormatDialog } from "@/components/notes/export-format-dialog";
import { NoteHistory } from "./note-history";
import { CopyLinkButton } from "./copy-link-button";
import type { NoteData } from "@/services/github-client";
import type { ExportFormat } from "@/hooks/use-note-export";

interface NoteToolbarProps {
  note: NoteData;
  noteName: string;
  isOnline: boolean;
  isFromCache: boolean;
  isPathPrivate: boolean;
  // Editor state
  isEditing: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  // Lock state
  isTogglingLock: boolean;
  onToggleLock: () => void;
  // Export
  onExport: (format: ExportFormat) => Promise<void>;
  onCopyAll: () => void;
  isExporting: boolean;
  copied: boolean;
}

export const NoteToolbar = memo(function NoteToolbar({
  note,
  noteName,
  isOnline,
  isFromCache,
  isPathPrivate,
  isEditing,
  isSaving,
  hasChanges,
  onStartEdit,
  onCancelEdit,
  onSave,
  isTogglingLock,
  onToggleLock,
  onExport,
  onCopyAll,
  isExporting,
  copied,
}: NoteToolbarProps) {
  const router = useRouter();
  const { isPinned, pinNote, unpinNote } = usePinnedStore();
  const noteIsPinned = isPinned(note.path);
  const canEdit = isOnline && !isFromCache;
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const handleTogglePin = () => {
    if (noteIsPinned) {
      unpinNote(note.path);
    } else {
      pinNote(note.path, noteName);
    }
  };

  const handleOpenInSplit = () => {
    const notePath = note.path.replace(/\.md$/, "");
    router.push(`/split?left=${encodeURIComponent(notePath)}`);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancelEdit}
          disabled={isSaving}
        >
          <X className="h-4 w-4 mr-1" />
          Annuler
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={!hasChanges || isSaving || !isOnline}
          className="glow-soft"
          title={!isOnline ? "Édition désactivée hors ligne" : undefined}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          {isSaving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
      {/* Cache indicator */}
      {isFromCache && (
        <div
          className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded"
          title="Cette note est chargée depuis le cache local"
        >
          <CloudOff className="h-3 w-3" />
          <span className="hidden sm:inline">Cache</span>
        </div>
      )}

      {/* Pin button - always visible */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleTogglePin}
        title={noteIsPinned ? "Désépingler" : "Épingler"}
        className={noteIsPinned ? "text-primary" : ""}
      >
        {noteIsPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
      </Button>

      {/* Copy link button */}
      <CopyLinkButton notePath={note.path} noteName={noteName} />

      <Button
        variant="outline"
        size="sm"
        onClick={onStartEdit}
        disabled={!canEdit}
        title={!canEdit ? "Édition désactivée hors ligne" : undefined}
      >
        <Pencil className="h-4 w-4 mr-1" />
        Éditer
      </Button>

      {canEdit && (
        <>
          {/* Desktop: show all buttons */}
          <div className="hidden sm:flex items-center gap-1">
            <RenameNoteDialog
              path={note.path}
              sha={note.sha}
              currentName={noteName}
              trigger={
                <Button variant="ghost" size="sm" title="Renommer la note">
                  <TextCursorInput className="h-4 w-4" />
                </Button>
              }
            />
            <MoveNoteDialog
              path={note.path}
              sha={note.sha}
              noteName={noteName}
              trigger={
                <Button variant="ghost" size="sm" title="Déplacer la note">
                  <FolderInput className="h-4 w-4" />
                </Button>
              }
            />
            {!isPathPrivate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleLock}
                disabled={isTogglingLock}
                title={note.isLocked ? "Déverrouiller la note" : "Verrouiller la note"}
                className={
                  note.isLocked
                    ? "text-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                    : ""
                }
              >
                {isTogglingLock ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : note.isLocked ? (
                  <LockOpen className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </Button>
            )}
            <DeleteNoteDialog
              path={note.path}
              sha={note.sha}
              noteName={noteName}
              isLocked={note.isLocked}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Supprimer la note"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
            {/* Copy button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopyAll}
              title={copied ? "Copié !" : "Copier tout"}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>

            {/* Export button → opens dialog */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
              title="Exporter"
            >
              <Download className="h-4 w-4" />
            </Button>
            <ExportFormatDialog
              open={exportDialogOpen}
              onOpenChange={setExportDialogOpen}
              onExport={onExport}
              isExporting={isExporting}
              fileName={noteName}
            />

            {/* Share button */}
            <ShareNoteDialog
              notePath={note.path.replace(/\.md$/, "")}
              noteName={noteName}
              trigger={
                <Button variant="ghost" size="sm" title="Partager">
                  <Share2 className="h-4 w-4" />
                </Button>
              }
            />

            {/* History button */}
            <NoteHistory
              notePath={note.path}
              trigger={
                <Button variant="ghost" size="sm" title="Historique">
                  <History className="h-4 w-4" />
                </Button>
              }
            />

            {/* Split view button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenInSplit}
              title="Ouvrir en vue divisée"
            >
              <Columns className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile: dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleTogglePin}>
                {noteIsPinned ? (
                  <PinOff className="h-4 w-4 mr-2" />
                ) : (
                  <Pin className="h-4 w-4 mr-2" />
                )}
                {noteIsPinned ? "Désépingler" : "Épingler"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <RenameNoteDialog
                path={note.path}
                sha={note.sha}
                currentName={noteName}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <TextCursorInput className="h-4 w-4 mr-2" />
                    Renommer
                  </DropdownMenuItem>
                }
              />
              <MoveNoteDialog
                path={note.path}
                sha={note.sha}
                noteName={noteName}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Déplacer
                  </DropdownMenuItem>
                }
              />
              {!isPathPrivate && (
                <DropdownMenuItem onClick={onToggleLock} disabled={isTogglingLock}>
                  {isTogglingLock ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : note.isLocked ? (
                    <LockOpen className="h-4 w-4 mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  {note.isLocked ? "Déverrouiller" : "Verrouiller"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCopyAll}>
                {copied ? (
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? "Copié !" : "Copier tout"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Exporter...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ShareNoteDialog
                notePath={note.path.replace(/\.md$/, "")}
                noteName={noteName}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </DropdownMenuItem>
                }
              />
              <NoteHistory
                notePath={note.path}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <History className="h-4 w-4 mr-2" />
                    Historique
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuItem onClick={handleOpenInSplit}>
                <Columns className="h-4 w-4 mr-2" />
                Vue divisée
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DeleteNoteDialog
                path={note.path}
                sha={note.sha}
                noteName={noteName}
                isLocked={note.isLocked}
                trigger={
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
});
