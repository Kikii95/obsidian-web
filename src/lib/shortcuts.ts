// Keyboard shortcuts configuration

export interface Shortcut {
  key: string;
  description: string;
  modifier?: "ctrl" | "meta" | "alt" | "shift";
  modifierSecondary?: "shift" | "alt";
}

export interface ShortcutCategory {
  name: string;
  icon: string;
  shortcuts: Shortcut[];
}

export const shortcutCategories: ShortcutCategory[] = [
  {
    name: "Navigation",
    icon: "compass",
    shortcuts: [
      { key: "g h", description: "Aller à l'accueil" },
      { key: "g g", description: "Aller au graphe" },
      { key: "g t", description: "Aller aux tags" },
      { key: "g s", description: "Aller aux paramètres" },
      { key: "/", description: "Recherche rapide", modifier: "ctrl" },
      { key: "k", description: "Ouvrir la palette de commandes", modifier: "ctrl" },
      { key: "[", description: "Retour en arrière", modifier: "alt" },
      { key: "]", description: "Aller en avant", modifier: "alt" },
    ],
  },
  {
    name: "Édition",
    icon: "edit",
    shortcuts: [
      { key: "e", description: "Activer le mode édition", modifier: "ctrl" },
      { key: "s", description: "Sauvegarder", modifier: "ctrl" },
      { key: "Escape", description: "Annuler / Fermer" },
      { key: "z", description: "Annuler", modifier: "ctrl" },
      { key: "z", description: "Rétablir", modifier: "ctrl", modifierSecondary: "shift" },
      { key: "b", description: "Gras", modifier: "ctrl" },
      { key: "i", description: "Italique", modifier: "ctrl" },
      { key: "k", description: "Insérer lien", modifier: "ctrl" },
    ],
  },
  {
    name: "Vue",
    icon: "eye",
    shortcuts: [
      { key: "b", description: "Toggle sidebar", modifier: "ctrl", modifierSecondary: "shift" },
      { key: ".", description: "Toggle theme sombre/clair", modifier: "ctrl" },
      { key: "+", description: "Zoom avant", modifier: "ctrl" },
      { key: "-", description: "Zoom arrière", modifier: "ctrl" },
      { key: "0", description: "Réinitialiser zoom", modifier: "ctrl" },
    ],
  },
  {
    name: "Fichiers",
    icon: "file",
    shortcuts: [
      { key: "n", description: "Nouvelle note", modifier: "ctrl" },
      { key: "o", description: "Ouvrir fichier", modifier: "ctrl" },
      { key: "p", description: "Imprimer / Exporter PDF", modifier: "ctrl" },
      { key: "d", description: "Dupliquer note", modifier: "ctrl", modifierSecondary: "shift" },
    ],
  },
  {
    name: "Aide",
    icon: "help-circle",
    shortcuts: [
      { key: "?", description: "Afficher les raccourcis" },
      { key: "/", description: "Afficher les raccourcis", modifier: "ctrl" },
      { key: "F1", description: "Aide" },
    ],
  },
];

// Format shortcut for display
export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];

  if (shortcut.modifier === "ctrl") {
    parts.push("Ctrl");
  } else if (shortcut.modifier === "meta") {
    parts.push("Cmd");
  } else if (shortcut.modifier === "alt") {
    parts.push("Alt");
  }

  if (shortcut.modifierSecondary === "shift") {
    parts.push("Shift");
  } else if (shortcut.modifierSecondary === "alt") {
    parts.push("Alt");
  }

  parts.push(shortcut.key);

  return parts.join(" + ");
}

// Check if shortcut matches search query
export function matchesSearch(shortcut: Shortcut, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    shortcut.description.toLowerCase().includes(lowerQuery) ||
    shortcut.key.toLowerCase().includes(lowerQuery)
  );
}
