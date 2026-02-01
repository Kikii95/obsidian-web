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
  // v1.8.0 - Phase Index PostgreSQL + Quick Wins
  {
    version: "1.8.0",
    date: "2026-02-01",
    features: [
      { title: "Lecteur Audio", description: "Ecoute MP3/WAV avec controle vitesse (0.5x a 2x)" },
      { title: "Dessins Excalidraw", description: "Visualise tes schemas .excalidraw directement" },
      { title: "Raccourcis Clavier", description: "Tape ? pour voir tous les raccourcis disponibles" },
      { title: "Callouts Obsidian", description: "Support complet [!note], [!warning], [!tip] avec fold" },
      { title: "Table des Matieres", description: "TOC auto-generee depuis les titres de ta note" },
      { title: "Stats de Note", description: "Compte de mots, caracteres et temps de lecture estime" },
      { title: "Copier Lien Note", description: "Copie en Wikilink, URL directe ou format Markdown" },
      { title: "Frontmatter Visible", description: "Affiche les metadonnees YAML en haut de note" },
      { title: "Zoom Images", description: "Agrandir, rotation 90deg et telechargement direct" },
      { title: "Nom Fichier Code", description: "Header avec nom de fichier sur les blocs de code" },
      { title: "Graph sans Limite", description: "Affiche tous tes fichiers, plus de limite 100" },
    ],
    fixes: [],
    improvements: [
      { title: "Index PostgreSQL", description: "Tags, backlinks et graph charges en millisecondes au lieu de secondes" },
    ],
  },

  // v1.7.0 - Phase Explore GitHub + Checkboxes
  {
    version: "1.7.0",
    date: "2026-01-28",
    features: [
      { title: "Explorer GitHub", description: "Navigue dans n'importe quel repo public directement" },
      { title: "Depot anonyme", description: "Partage un dossier ou d'autres peuvent deposer des fichiers" },
      { title: "Permissions par lien", description: "Choisis qui peut copier ou exporter depuis tes partages" },
      { title: "Creer depuis partage", description: "Ajoute des notes et dossiers dans un lien partage" },
      { title: "Copier vers vault", description: "Recupere des fichiers d'un partage vers ton propre vault" },
      { title: "Checkboxes cliquables", description: "Coche et decoche tes taches directement en mode lecture" },
    ],
    fixes: [
      { title: "Navigation sidebar", description: "Les liens dans la sidebar des partages fonctionnent correctement" },
    ],
    improvements: [],
  },

  // v1.6.0 - Phase Temp Vault (Repos externes)
  {
    version: "1.6.0",
    date: "2026-01-25",
    features: [
      { title: "Lecteur Repos Publics", description: "Lis n'importe quel repo GitHub comme un vault Obsidian" },
      { title: "Acces Repos Prives", description: "Connecte-toi pour lire tes repos prives aussi" },
      { title: "Repos Organisation", description: "Acces direct aux repos de tes organisations GitHub" },
    ],
    fixes: [],
    improvements: [
      { title: "Layout Unifie", description: "Architecture commune pour partages et repos externes" },
    ],
  },

  // v1.5.0 - Phase Deposit Mode
  {
    version: "1.5.0",
    date: "2026-01-22",
    features: [
      { title: "Mode Depot", description: "Cree un lien ou n'importe qui peut deposer des fichiers" },
      { title: "Zone de Staging", description: "Previsualise les fichiers avant de confirmer l'upload" },
      { title: "Presets Video", description: "Limite automatique de taille pour les videos uploadees" },
    ],
    fixes: [],
    improvements: [],
  },

  // v1.4.0 - Phase Shares v2
  {
    version: "1.4.0",
    date: "2026-01-20",
    features: [
      { title: "Vue Explorateur", description: "Navigue dans les dossiers partages comme dans ton vault" },
      { title: "Mode Lecture/Ecriture", description: "Bascule entre consultation et edition sur les partages" },
      { title: "Boutons Creation", description: "Cree notes et dossiers directement dans un partage" },
    ],
    fixes: [
      { title: "Partage Note Racine", description: "Les notes a la racine se partagent correctement" },
    ],
    improvements: [],
  },

  // v1.3.0 - Sprints Ameliorations
  {
    version: "1.3.0",
    date: "2026-01-18",
    features: [
      { title: "Renommage Shares", description: "Renomme tes liens de partage avec un nom custom" },
      { title: "Export PDF", description: "Exporte tes notes en PDF avec couleurs preservees" },
    ],
    fixes: [
      { title: "Wikilinks Case", description: "Les liens fonctionnent quelle que soit la casse" },
      { title: "Dialogues Selection", description: "Selection de dossier plus intuitive" },
    ],
    improvements: [
      { title: "14 Quick Fixes", description: "Corrections mineures de bugs reportes" },
    ],
  },

  // v1.2.0 - Phase Sharing
  {
    version: "1.2.0",
    date: "2026-01-15",
    features: [
      { title: "Partage Public", description: "Partage une note ou un dossier via un lien public" },
      { title: "Gestion des Shares", description: "Page dediee pour voir et supprimer tes partages" },
      { title: "Nom Personnalise", description: "Choisis le nom affiche pour chaque partage" },
    ],
    fixes: [],
    improvements: [],
  },

  // v1.1.0 - Phase Batch Operations
  {
    version: "1.1.0",
    date: "2026-01-12",
    features: [
      { title: "Multi-Selection", description: "Selectionne plusieurs fichiers pour actions groupees" },
      { title: "Suppression Batch", description: "Supprime plusieurs fichiers en une fois" },
      { title: "Import ZIP", description: "Importe un ZIP complet avec structure de dossiers" },
      { title: "Drag & Drop Dossiers", description: "Depose des dossiers entiers pour import" },
    ],
    fixes: [],
    improvements: [
      { title: "Performance Import", description: "Import de gros fichiers plus rapide et stable" },
    ],
  },

  // v1.0.0 - Release Initiale
  {
    version: "1.0.0",
    date: "2026-01-08",
    features: [
      { title: "Multi-Utilisateurs", description: "Chaque user configure son propre vault GitHub" },
      { title: "PWA Mobile", description: "Installe l'app sur ton telephone comme une app native" },
      { title: "Sync Cloud", description: "Tes parametres suivent ton compte sur tous tes devices" },
      { title: "Systeme PIN", description: "Protege tes notes sensibles avec un code PIN" },
      { title: "Dossiers Prives", description: "Les dossiers _private sont caches par defaut" },
      { title: "Ordre Dossiers", description: "Reorganise tes dossiers dans l'ordre que tu veux" },
      { title: "Markdown Complet", description: "Support Markdown + Wikilinks + Embeds + Mermaid" },
      { title: "Graph Interactif", description: "Visualise les liens entre toutes tes notes" },
      { title: "Mini-Graph", description: "Graphe local des notes liees a la note courante" },
    ],
    fixes: [],
    improvements: [],
  },
];

export const currentVersion = patchNotes[0]?.version ?? "0.0.0";
