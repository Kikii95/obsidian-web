"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X, Send, FolderOpen, CalendarDays, Loader2 } from "lucide-react";
import { useCaptureStore } from "@/lib/capture-store";
import { VoiceInput } from "./voice-input";
import { cn } from "@/lib/utils";
import useSWR from "swr";

interface QuickCaptureModalProps {
  onClose: () => void;
  onSave: (content: string, targetFolder: string, appendToDaily: boolean) => Promise<void>;
}

interface FolderItem {
  name: string;
  path: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function QuickCaptureModal({ onClose, onSave }: QuickCaptureModalProps) {
  const {
    draft,
    targetFolder,
    appendToDaily,
    isVoiceActive,
    setDraft,
    setTargetFolder,
    setAppendToDaily,
    setIsVoiceActive,
    clearDraft,
    addToQueue,
  } = useCaptureStore();

  const [interimText, setInterimText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch folders for picker
  const { data: foldersData } = useSWR<{ folders: FolderItem[] }>(
    showFolderPicker ? "/api/github/folders" : null,
    fetcher
  );

  // Auto-focus textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Handle voice transcript
  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setDraft(draft + (draft ? " " : "") + text);
      setInterimText("");
    },
    [draft, setDraft]
  );

  // Handle interim transcript (shows in grey)
  const handleInterimTranscript = useCallback((text: string) => {
    setInterimText(text);
  }, []);

  // Save capture
  const handleSave = useCallback(async () => {
    if (!draft.trim()) return;

    setIsSaving(true);
    try {
      await onSave(draft.trim(), targetFolder, appendToDaily);
      clearDraft();
      onClose();
    } catch (error) {
      console.error("Failed to save capture:", error);
      // Add to offline queue if failed
      addToQueue({
        content: draft.trim(),
        targetFolder,
        appendToDaily,
      });
      clearDraft();
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [draft, targetFolder, appendToDaily, onSave, clearDraft, onClose, addToQueue]);

  // Handle Ctrl+Enter to save
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  // Select folder
  const selectFolder = useCallback(
    (path: string) => {
      setTargetFolder(path);
      setShowFolderPicker(false);
    },
    [setTargetFolder]
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 bottom-4 sm:inset-auto sm:bottom-8 sm:right-8 sm:w-96 bg-background border rounded-xl shadow-2xl z-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Quick Capture</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Text input */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind?"
              className={cn(
                "w-full h-32 p-3 text-sm bg-muted/50 rounded-lg resize-none",
                "border border-transparent focus:border-primary/50 focus:ring-1 focus:ring-primary/50",
                "placeholder:text-muted-foreground/50 outline-none transition-all"
              )}
            />
            {/* Interim voice text */}
            {interimText && (
              <div className="absolute bottom-2 left-3 right-3 text-sm text-muted-foreground/60 italic truncate">
                {interimText}...
              </div>
            )}
          </div>

          {/* Options row */}
          <div className="flex items-center gap-2">
            {/* Folder picker */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowFolderPicker(!showFolderPicker)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg",
                  "bg-muted/50 hover:bg-muted transition-colors",
                  "text-left truncate"
                )}
              >
                <FolderOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {targetFolder || "Select folder..."}
                </span>
              </button>

              {/* Folder dropdown */}
              {showFolderPicker && (
                <div className="absolute left-0 right-0 bottom-full mb-1 max-h-48 overflow-y-auto bg-popover border rounded-lg shadow-lg z-10">
                  {foldersData?.folders?.map((folder: FolderItem) => (
                    <button
                      key={folder.path}
                      onClick={() => selectFolder(folder.path)}
                      className={cn(
                        "w-full px-3 py-2 text-xs text-left hover:bg-muted truncate",
                        targetFolder === folder.path && "bg-muted"
                      )}
                    >
                      {folder.path || "/"}
                    </button>
                  )) ?? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Loading folders...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Append to daily toggle */}
            <button
              onClick={() => setAppendToDaily(!appendToDaily)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-colors",
                appendToDaily
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              )}
              title="Append to daily note"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Daily</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t bg-muted/30">
          {/* Voice input */}
          <VoiceInput
            isActive={isVoiceActive}
            onActiveChange={setIsVoiceActive}
            onTranscript={handleVoiceTranscript}
            onInterimTranscript={handleInterimTranscript}
          />

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!draft.trim() || isSaving}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Save</span>
            <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-primary-foreground/20 rounded">
              ⌘↵
            </kbd>
          </button>
        </div>
      </div>
    </>
  );
}
