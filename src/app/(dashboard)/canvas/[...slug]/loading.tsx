import { Loader2, Layout } from "lucide-react";

export default function CanvasLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
      <div className="relative">
        <Layout className="h-16 w-16 text-muted-foreground/30" />
        <Loader2 className="h-8 w-8 animate-spin text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p className="text-sm text-muted-foreground">Chargement du canvas...</p>
    </div>
  );
}
