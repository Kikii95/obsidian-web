import { Loader2, Network } from "lucide-react";

export default function GraphLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
      <div className="relative">
        <Network className="h-16 w-16 text-muted-foreground/30" />
        <Loader2 className="h-8 w-8 animate-spin text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p className="text-sm text-muted-foreground">Chargement du graphe...</p>
    </div>
  );
}
