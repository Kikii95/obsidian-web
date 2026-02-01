export interface PatchNoteItem {
  title: string;
  description?: string;
}

export interface PatchNote {
  version: string;
  date: string;
  features: PatchNoteItem[];
  fixes: PatchNoteItem[];
  improvements: PatchNoteItem[];
}

// Plus recent en premier
export const patchNotes: PatchNote[] = [
  {
    version: "1.8.0",
    date: "2026-02-01",
    features: [
      { title: "Lecteur Audio", description: "Ecoute MP3/WAV avec controle vitesse" },
      { title: "Dessins Excalidraw", description: "Visualise fichiers .excalidraw" },
      { title: "Raccourcis Clavier", description: "? pour voir les raccourcis" },
      { title: "Callouts Obsidian", description: "[!note], [!warning], [!tip] avec fold" },
      { title: "Table des Matieres", description: "TOC auto depuis les titres" },
      { title: "Stats de Note", description: "Mots, caracteres, temps de lecture" },
      { title: "Copier Lien Note", description: "Wikilink, URL ou Markdown" },
      { title: "Frontmatter Visible", description: "Affiche metadonnees YAML" },
      { title: "Zoom Images", description: "Agrandir, rotation, telechargement" },
      { title: "Nom Fichier Code", description: "Header sur les blocs code" },
      { title: "Graph View Optimise", description: "Plus de limite 100 fichiers" },
    ],
    fixes: [],
    improvements: [
      { title: "Index PostgreSQL", description: "Tags, backlinks et graph instantanes" },
    ],
  },
];

export const currentVersion = patchNotes[0]?.version ?? "0.0.0";
