"use client";

import { memo } from "react";
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
  FileDown,
  Copy,
  Check,
  Pin,
  PinOff,
} from "lucide-react";
import { usePinnedStore } from "@/lib/pinned-store";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { MoveNoteDialog } from "@/components/notes/move-note-dialog";
import { RenameNoteDialog } from "@/components/notes/rename-note-dialog";
import type { NoteData } from "@/services/github-client";

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
  onExportMd: () => void;
  onExportPdf: () => void;
  onCopyAll: () => void;
  isExportingPdf: boolean;
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
  onExportMd,
  onExportPdf,
  onCopyAll,
  isExportingPdf,
  copied,
}: NoteToolbarProps) {
  const { isPinned, pinNote, unpinNote } = usePinnedStore();
  const noteIsPinned = isPinned(note.path);
  const canEdit = isOnline && !isFromCache;

  const handleTogglePin = () => {
    if (noteIsPinned) {
      unpinNote(note.path);
    } else {
      pinNote(note.path, noteName);
    }
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
            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" title="Exporter">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onCopyAll}>
                  {copied ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? "Copié !" : "Copier tout"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onExportMd}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Télécharger .md
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportPdf} disabled={isExportingPdf}>
                  {isExportingPdf ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-2" />
                  )}
                  {isExportingPdf ? "Export..." : "Télécharger .pdf"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <DropdownMenuItem onClick={onExportMd}>
                <FileDown className="h-4 w-4 mr-2" />
                Télécharger .md
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportPdf} disabled={isExportingPdf}>
                {isExportingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                {isExportingPdf ? "Export..." : "Télécharger .pdf"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DeleteNoteDialog
                path={note.path}
                sha={note.sha}
                noteName={noteName}
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
