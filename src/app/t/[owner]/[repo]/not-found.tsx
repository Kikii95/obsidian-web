import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TempVaultNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Repository Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The repository you&apos;re looking for doesn&apos;t exist or is private.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Only public repositories can be viewed without authentication.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
