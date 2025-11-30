import { FileQuestion, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="text-xl text-muted-foreground">Page non trouvée</h2>
        <p className="text-muted-foreground max-w-md">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Accueil
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/graph">
            <Search className="h-4 w-4 mr-2" />
            Explorer
          </Link>
        </Button>
      </div>
    </div>
  );
}
