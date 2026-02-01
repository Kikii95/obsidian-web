"use client";

import { useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SplitView } from "@/components/layout/split-view";
import { useSplitViewStore } from "@/lib/split-view-store";
import { MarkdownRenderer } from "@/components/viewer/markdown-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { useNoteData } from "@/hooks/use-note-data";
import { useLockStore } from "@/lib/lock-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Plus, Columns } from "lucide-react";
import Link from "next/link";

function NotePane({ path }: { path: string | null }) {
  const { isUnlocked } = useLockStore();

  const { note, isLoading, error } = useNoteData(
    path ? `${path}.md` : "",
    { isUnlocked }
  );

  if (!path) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Columns className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No note selected</p>
          <p className="text-sm mt-2">Open a note in split view from the toolbar</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Failed to load note</p>
          <p className="text-sm mt-2">{error || "Note not found"}</p>
        </div>
      </div>
    );
  }

  const noteName = path.split("/").pop() || path;

  return (
    <div className="p-6 prose prose-invert max-w-none">
      <h1 className="text-xl font-bold mb-4">{noteName}</h1>
      <MarkdownRenderer content={note.content} currentPath={path} />
    </div>
  );
}

function SplitPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { leftPath, rightPath, setLeftPath, setRightPath, isActive, setActive } = useSplitViewStore();

  const leftParam = searchParams.get("left");
  const rightParam = searchParams.get("right");

  useEffect(() => {
    if (leftParam) setLeftPath(leftParam);
    if (rightParam) setRightPath(rightParam);
    if (leftParam || rightParam) setActive(true);
  }, [leftParam, rightParam, setLeftPath, setRightPath, setActive]);

  useEffect(() => {
    if (!isActive && !leftParam && !rightParam) {
      router.push("/");
    }
  }, [isActive, leftParam, rightParam, router]);

  const leftTitle = leftPath?.split("/").pop() || "Left pane";
  const rightTitle = rightPath?.split("/").pop() || "Right pane";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm font-medium">Split View</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <SplitView
          leftContent={<NotePane path={leftPath} />}
          rightContent={<NotePane path={rightPath} />}
          leftTitle={leftTitle}
          rightTitle={rightTitle}
          leftPath={leftPath}
          rightPath={rightPath}
        />
      </div>
    </div>
  );
}

export default function SplitPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Skeleton className="h-8 w-48" />
        </div>
      }
    >
      <SplitPageContent />
    </Suspense>
  );
}
