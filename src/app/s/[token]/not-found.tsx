import { Clock } from "lucide-react";

export default function ShareNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <Clock className="h-16 w-16 mx-auto text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Lien invalide</h1>
        <p className="text-muted-foreground mb-6">
          Ce lien de partage n'existe pas ou a expiré.
        </p>
        <p className="text-sm text-muted-foreground">
          Demandez un nouveau lien à la personne qui vous l'a partagé.
        </p>
      </div>
    </div>
  );
}
