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
  // v2.1.0 - Medium Features
  {
    version: "2.1.0",
    date: "2026-02-01",
    features: [
      { title: "Diagrammes Mermaid", description: "Rend les blocs code mermaid en graphiques interactifs" },
      { title: "Math/LaTeX", description: "Rendu KaTeX pour formules inline $...$ et block $$...$$" },
      { title: "Vue Split", description: "Affiche 2 notes cote a cote avec redimensionnement" },
      { title: "Apercu au Survol", description: "Survole un [[wikilink]] pour voir un apercu de la note" },
      { title: "Mode Vim", description: "Keybindings Vim dans l'editeur (Settings > Editor)" },
      { title: "Gestes Mobile", description: "Swipe sidebar, zoom pinch, menu long press" },
      { title: "Themes Code", description: "12 themes syntax highlighting (github, dracula, etc.)" },
      { title: "Variables Templates", description: "{{date}}, {{time}}, {{title}}, {{folder}}, {{clipboard}}" },
      { title: "Icones Dossiers", description: "Icones Lucide personnalisees par dossier" },
      { title: "Historique Notes", description: "Timeline + diff viewer pour les versions de notes" },
      { title: "Gestion Tags", description: "Renommer, fusionner, supprimer tags sur tout le vault" },
      { title: "Analytics Partages", description: "Stats d'acces, graphiques, vues dans le temps" },
      { title: "Import Notion", description: "Import ZIP avec nettoyage IDs et conversion callouts" },
      { title: "Export Multi-format", description: "Export vers HTML (3 themes), DOCX et EPUB" },
      { title: "Capture Rapide", description: "Bouton flottant + voix, file offline, ajout note du jour" },
    ],
    fixes: [],
    improvements: [],
  },
  // v2.0.0 - Index PostgreSQL + Quick Wins
  {
    version: "2.0.0",
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
      { title: "Quoi de Neuf", description: "Modal avec historique complet des versions et nouveautes" },
      { title: "Auto-Refresh Index", description: "Refresh automatique de l'index selon un intervalle configurable" },
      { title: "Autocomplete WikiLinks", description: "Tape [[ pour suggerer tes notes avec fuzzy search" },
      { title: "Autocomplete Tags", description: "Tape # pour suggerer les tags existants avec compteur" },
    ],
    fixes: [],
    improvements: [
      { title: "Index PostgreSQL", description: "Tags, backlinks et graph charges en millisecondes" },
      { title: "Activity Heatmap", description: "Stocke dans PostgreSQL pendant l'indexation — 0 appel API, chargement instantane" },
      { title: "Smart Refresh", description: "Compare les SHA, n'indexe que les fichiers modifies (0 appel API si rien n'a change)" },
      { title: "Stats Index", description: "Affiche nouveaux, modifies, supprimes et inchanges apres chaque refresh" },
    ],
  },

  // v1.9.0 - Interactive Checkboxes
  {
    version: "1.9.0",
    date: "2026-01-29",
    features: [
      { title: "Checkboxes cliquables", description: "Coche et decoche tes taches directement en mode lecture" },
    ],
    fixes: [
      { title: "Navigation sidebar", description: "Les liens dans la sidebar des partages fonctionnent correctement" },
    ],
    improvements: [],
  },

  // v1.8.0 - Temp Vault & Explore GitHub
  {
    version: "1.8.0",
    date: "2026-01-28",
    features: [
      { title: "Explorer GitHub", description: "Navigue dans n'importe quel repo public directement" },
      { title: "Lecteur Repos Publics", description: "Lis n'importe quel repo GitHub comme un vault Obsidian" },
      { title: "Acces Repos Prives", description: "Connecte-toi pour lire tes repos prives aussi" },
      { title: "Repos Organisation", description: "Acces direct aux repos de tes organisations GitHub" },
    ],
    fixes: [],
    improvements: [
      { title: "Layout Unifie", description: "Architecture commune pour partages et repos externes" },
    ],
  },

  // v1.7.0 - Deposit & Permissions
  {
    version: "1.7.0",
    date: "2026-01-25",
    features: [
      { title: "Depot anonyme", description: "Partage un dossier ou d'autres peuvent deposer des fichiers" },
      { title: "Zone de Staging", description: "Previsualise les fichiers avant de confirmer l'upload" },
      { title: "Permissions par lien", description: "Choisis qui peut copier ou exporter depuis tes partages" },
      { title: "Creer depuis partage", description: "Ajoute des notes et dossiers dans un lien partage" },
      { title: "Copier vers vault", description: "Recupere des fichiers d'un partage vers ton propre vault" },
    ],
    fixes: [
      { title: "Partage Note Racine", description: "Les notes a la racine se partagent correctement" },
    ],
    improvements: [],
  },

  // v1.6.0 - Sharing System
  {
    version: "1.6.0",
    date: "2026-01-20",
    features: [
      { title: "Partage Public", description: "Partage une note ou un dossier via un lien public" },
      { title: "Gestion des Shares", description: "Page dediee pour voir et supprimer tes partages" },
      { title: "Vue Explorateur", description: "Navigue dans les dossiers partages comme dans ton vault" },
      { title: "Mode Lecture/Ecriture", description: "Bascule entre consultation et edition sur les partages" },
      { title: "Renommage Shares", description: "Renomme tes liens de partage avec un nom custom" },
    ],
    fixes: [],
    improvements: [],
  },

  // v1.5.0 - Batch Operations
  {
    version: "1.5.0",
    date: "2026-01-15",
    features: [
      { title: "Multi-Selection", description: "Selectionne plusieurs fichiers pour actions groupees" },
      { title: "Suppression Batch", description: "Supprime plusieurs fichiers en une fois" },
      { title: "Import ZIP", description: "Importe un ZIP complet avec structure de dossiers" },
      { title: "Drag & Drop Dossiers", description: "Depose des dossiers entiers pour import" },
      { title: "Export PDF", description: "Exporte tes notes en PDF avec couleurs preservees" },
    ],
    fixes: [
      { title: "Wikilinks Case", description: "Les liens fonctionnent quelle que soit la casse" },
    ],
    improvements: [
      { title: "Performance Import", description: "Import de gros fichiers plus rapide et stable" },
    ],
  },

  // v1.4.0 - Performance & Cloud Sync
  {
    version: "1.4.0",
    date: "2025-12-05",
    features: [
      { title: "Cloud Settings Sync", description: "Tes parametres sont sauvegardes sur GitHub" },
      { title: "36 Themes", description: "18 themes dark + 18 light pour tous les gouts" },
      { title: "Vault Root Path", description: "Definis un sous-dossier comme racine de ton vault" },
      { title: "Profils Desktop/Mobile", description: "Settings separes pour chaque type d'appareil" },
      { title: "Rate Limit Indicator", description: "Vois ta consommation API GitHub en temps reel" },
      { title: "Ordre Dossiers Custom", description: "Reorganise les dossiers dans l'ordre que tu veux" },
    ],
    fixes: [],
    improvements: [
      { title: "Cache SWR", description: "Navigation plus fluide avec cache intelligent" },
    ],
  },

  // v1.3.0 - Obsidian-like Features
  {
    version: "1.3.0",
    date: "2025-12-02",
    features: [
      { title: "Quick Switcher", description: "Ctrl+P pour naviguer rapidement vers n'importe quelle note" },
      { title: "Tags Explorer", description: "Page /tags avec nuage de tags et filtrage" },
      { title: "Daily Notes", description: "Bouton calendrier pour creer la note du jour automatiquement" },
      { title: "Templates", description: "Choisis un template quand tu crees une nouvelle note" },
      { title: "Backlinks Panel", description: "Vois toutes les notes qui linkent vers la note courante" },
      { title: "Version History", description: "Historique des commits Git pour chaque note" },
    ],
    fixes: [],
    improvements: [],
  },

  // v1.2.0 - Dashboard & Settings
  {
    version: "1.2.0",
    date: "2025-12-01",
    features: [
      { title: "Dashboard", description: "Stats vault, notes recentes et notes epinglees" },
      { title: "Mini-Graph", description: "Preview interactif des liens sur le dashboard" },
      { title: "Activity Heatmap", description: "Calendrier style GitHub de ton activite" },
      { title: "Settings Page", description: "Page dediee pour configurer toute l'app" },
      { title: "Folder Explorer", description: "Page /folder pour naviguer par dossiers" },
      { title: "Sidebar Search", description: "Recherche dans l'arborescence de fichiers" },
      { title: "Graph Settings", description: "Ajuste repulsion, distance et gravite en live" },
    ],
    fixes: [],
    improvements: [
      { title: "12 Parametres", description: "Editor, Sidebar, Header et Dashboard configurables" },
    ],
  },

  // v1.1.0 - Media Support
  {
    version: "1.1.0",
    date: "2025-11-30",
    features: [
      { title: "Support Images", description: "Affiche PNG, JPG, GIF, SVG et WEBP directement" },
      { title: "Viewer Images", description: "Zoom, rotation 90deg et telechargement" },
      { title: "PDF Viewer", description: "Lis tes PDFs avec navigation et zoom" },
      { title: "Canvas Viewer", description: "Visualise tes fichiers .canvas Obsidian" },
      { title: "Canvas Editor", description: "Ajoute, supprime et edite les nodes de tes canvas" },
      { title: "Copy Code", description: "Bouton pour copier les blocs de code en un clic" },
      { title: "Export MD/PDF", description: "Telecharge tes notes en Markdown ou PDF" },
    ],
    fixes: [],
    improvements: [],
  },

  // v1.0.0 - Foundation
  {
    version: "1.0.0",
    date: "2025-11-29",
    features: [
      { title: "Multi-Utilisateurs", description: "Chaque user configure son propre vault GitHub" },
      { title: "PWA Mobile", description: "Installe l'app sur ton telephone comme une app native" },
      { title: "Systeme PIN", description: "Protege tes notes sensibles avec un code PIN" },
      { title: "Dossiers Prives", description: "Les dossiers _private sont caches par defaut" },
      { title: "Markdown Complet", description: "Support Markdown + Wikilinks + Embeds + Mermaid" },
      { title: "Graph Interactif", description: "Visualise les liens entre toutes tes notes" },
      { title: "Theme Switcher", description: "Bascule entre mode clair et sombre" },
      { title: "Editeur Markdown", description: "Edite tes notes avec CodeMirror et sauvegarde sur GitHub" },
      { title: "iOS Splash Screens", description: "Ecrans de lancement PWA pour iOS" },
      { title: "Scroll to Top", description: "Bouton pour remonter en haut de la page" },
    ],
    fixes: [],
    improvements: [],
  },
];

export const currentVersion = patchNotes[0]?.version ?? "0.0.0";
