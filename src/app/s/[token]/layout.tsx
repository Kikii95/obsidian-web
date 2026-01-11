import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dossier partagé | Obsidian Web",
  description: "Accédez au contenu partagé",
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
