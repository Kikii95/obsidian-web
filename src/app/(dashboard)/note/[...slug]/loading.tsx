import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";

export default function NoteLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Skeleton className="h-4 w-20" />
        <ChevronRight className="h-3 w-3" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Title skeleton */}
      <Skeleton className="h-10 w-3/4 mb-4" />

      {/* Content skeletons */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Code block skeleton */}
      <Skeleton className="h-32 w-full mt-6 rounded-lg" />

      {/* More content */}
      <div className="space-y-3 mt-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
