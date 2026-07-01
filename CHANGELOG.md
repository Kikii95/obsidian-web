# Changelog

All notable changes to this project will be documented in this file.

## [2.4.0] - 2026-07-01

### Added

- **Indexation en arrière-plan** — L'indexation ne bloque plus sur la page Paramètres : le moteur (boucle de batch) vit désormais dans un store global (`src/lib/indexing-store.ts`), hors du cycle de vie React, donc il **survit à la navigation**. Une pastille flottante persistante (`IndexingIndicator`, montée dans le layout dashboard) affiche la progression en direct (X / Y · %) avec bouton Annuler, puis un **pop-up de fin** (succès/erreur) qui s'auto-efface. Ré-hydratation depuis `/status` au montage (couvre reload + autre onglet).

### Fixed

- **Couverture complète du vault** — `getFullVaultTree` ignorait le flag `truncated` de l'API Git Trees de GitHub : sur un gros vault (>100k entrées / 7 Mo) l'arbre récursif est tronqué et toutes les notes au-delà de la limite étaient **silencieusement perdues**. Ajout d'un repli **parcours dossier-par-dossier** (BFS non-récursif, `src/lib/github-tree.ts`) déclenché quand l'arbre est tronqué → tout le vault est couvert.
- **Suppression accidentelle de l'index** — en mode refresh, un arbre tronqué/vide marquait des notes réellement présentes comme « supprimées » et les retirait de l'index. Ajout d'un garde-fou : un vault déjà indexé qui retourne 0 fichier markdown fait échouer l'indexation (409) au lieu de vider l'index.
- **Compteurs faussés** — `status?.indexedFiles || 0 + indexedCount` : la précédence `||`/`+` écrasait le total courant. Corrigé en `(status?.indexedFiles || 0) + indexedCount`.
- **Fichiers manqués sur erreur transitoire** — un échec ponctuel (rate-limit GitHub) comptait le fichier comme perdu sans réessai. Le batch **retente une fois** chaque fichier en échec avant de le compter comme échoué.

### Changed

- Logique par-fichier extraite de la route batch vers `src/lib/vault-indexer.ts` (`indexNoteFile`) ; la route délègue et ne fait plus le parsing inline. Le hook `useVaultIndex` devient un mince wrapper au-dessus du store global (API publique inchangée).

## [2.3.0] - 2026-07-01

### Added

- **Graph 3D — Personal Knowledge Graph** — La vue `/graph` propose un rendu 3D interactif (react-three-fiber + three.js) via un **toggle 2D/3D/Auto** dans l'en-tête ; le rendu 2D D3 reste le fallback léger (sélectionné automatiquement en mode Auto sur mobile / matériel modeste). Le mode est persisté et synchronisé.
  - **Layout dans un Web Worker** (`d3-force-3d`), positions streamées en `Float32Array` transférable (double-buffer) → zéro re-render React par tick.
  - **Rendu à ~3-5 draw calls** : un seul `InstancedMesh` pour tous les nœuds (taille par connectivité, couleur par amas), un seul `LineSegments` pour toutes les arêtes.
  - **Effets premium** : bloom néon sélectif + vignette (gated mobile/reduced-motion), fond étoilé/nébuleuse, brouillard de profondeur.
  - **Constellations** : une force de regroupement par amas (centres sur une sphère de Fibonacci) dans le worker sépare dossiers/tags en galaxies lisibles.
  - **Arêtes animées dirigées** : un `ShaderMaterial` fait circuler une impulsion lumineuse source→cible (uniforme `uTime`, couleur d'accent du thème), révélant le sens des liens ; désactivable (toggle « Arêtes animées », off en effets réduits).
  - **Vol caméra au focus** : sélectionner un nœud déclenche un fly-to cinématique (ease frame-rate-independent) qui le cadre puis rend la main à OrbitControls.
  - **Boussole 3D** (gizmo drei aligné bas-droite, teinté par la palette) + **capture PNG** de la vue courante (`preserveDrawingBuffer` + `toDataURL`).
  - **Interactions** : survol (halo + carte d'info), clic = focus + isolation des voisins, recherche floue in-graph (fuse.js), labels LOD (top-degré, cull par distance), orbite auto, contrôles 3D dans le popover (amas par dossier/tag, densité labels, néon, taille des nœuds, tags-en-nœuds, arêtes animées).
  - **Thème réactif** : les 36 thèmes oklch pilotent la palette WebGL via un bridge oklch→hex partagé (`cssColorToHex`) + `MutationObserver` sur `data-theme` (re-teinte sans reconstruction).
- **API graphe enrichie** (rétro-compatible) : `GET /api/github/graph` renvoie tags, dossier, degré, amas (`cluster`/`clusterIndex`), liens pondérés/dédupliqués/dirigés ; nouveau `GET /api/github/graph/expand` (voisinage BFS, expand-on-click) ; option tags-en-nœuds.

### Changed

- Logique du graphe extraite en modules **purs et testés** (`src/lib/graph/*`) ; la route délègue à un service (handler <20 lignes). Résolution des wikilinks via `buildNoteLookupMap` (O(1)) au lieu du scan O(N·L).

### Fixed

- **ID de nœud** : le `.replace(".md", "")` non ancré (cassait `a.mdx.md`, `notes.md/x.md`) devient `/\.md$/i`.

## [2.2.2] - 2026-07-01

### Security

- **Remédiation des vulnérabilités de dépendances** — Toutes les alertes ré-apparues sur `main` sont fermées : `1 critical / 15 high / 23 moderate → 0` (audit prod **et** dev à zéro). Principaux mouvements : `next` 16.2.3 → 16.2.9 (dont le RCE React Flight), `vitest` → 4.1.9, `undici` → 7.28.0 (borné `<8` pour rester compatible jsdom), `webpack` → 5.108.3, `jsdom` → 28.1.0, `@excalidraw/excalidraw` → 0.18.1. Overrides pnpm actualisés/ajoutés : `ws`, `fast-uri`, `postcss`, `@babel/*`, `mermaid`, `dompurify`, `js-yaml` (scopé `gray-matter` en 3.15.0 vs `>=4.2.0` ailleurs).

### Added

- **Pipeline CI GitHub Actions** (`.github/workflows/ci.yml`) — jobs `quality` (typecheck + tests + build) et `security` (audit `pnpm audit --prod --audit-level=high`, **bloquant**). Lint exécuté en non-bloquant (dette legacy).
- **Configuration Dependabot** (`.github/dependabot.yml`) — mises à jour npm + github-actions hebdomadaires (lundi), groupées minor/patch, pour empêcher la re-dérive des dépendances.

---

## [2.2.1] - 2026-06-03

### Fixed

- **Couleurs hex prises pour des tags** — Les codes hex (`#002253`, `#F86632`, …) et les tokens 100 % numériques (`#1984`) ne sont plus stylés comme des tags Obsidian, dans le lecteur comme dans l'éditeur. Nouveau helper partagé `isValidObsidianTag()` (exclut les hex 6/8 digits + tout-numérique, conforme à la règle Obsidian « au moins un caractère non-numérique »).
- **Lien « Reprendre où vous en étiez »** — L'URL ajoutait un `.md` en trop (`/note/…/Note.md` au lieu de `/note/…/Note`) car le chemin stocké contenait déjà l'extension. Suffixe retiré + `.md` masqué dans le titre affiché.

---

## [2.2.0] - 2026-06-03

### Added

- **Partage à durée illimitée** — Nouvelle option d'expiration « Illimité » lors de la création d'un lien de partage (dossier ou note). Le lien reste actif indéfiniment jusqu'à suppression manuelle, en complément des durées existantes (1h, 1 jour, 1 semaine, 1 mois).

### Changed

- `shares.expires_at` est désormais nullable (`null` = partage permanent). Les requêtes d'accès acceptent `expires_at IS NULL`, et le nettoyage des partages expirés (`cleanupExpiredShares`) ignore les partages permanents.

### Migration

- `drizzle/0003_illegal_magus.sql` : `ALTER TABLE "shares" ALTER COLUMN "expires_at" DROP NOT NULL` — non destructif. À appliquer en prod via `pnpm db:push`.

---

## [2.1.3] - 2026-04-24

### Security

- **Remédiation 94 alertes Dependabot** — Direct deps bumpées (`next@16.2.3`, `jspdf@4.2.1`, `html2pdf.js@0.14.0`, `drizzle-orm@0.45.2`) et bloc `pnpm.overrides` ajouté pour 18 packages transitifs (`dompurify`, `vite`, `lodash`, `minimatch`, `picomatch`, `rollup`, `undici`, `serialize-javascript`, `flatted`, `immutable`, `preact`, `nanoid`, `brace-expansion`, `uuid`, `mermaid`, `esbuild`, `webpack`, `lodash-es`)
- **3 critical + 41 high patchés** : XSS, HTML/PDF injection, path traversal, SQL injection, DoS, prototype pollution
- Résiduel : 2 low sur `webpack@buildHttp` (feature non utilisée dans ce projet)

---

## [2.1.2] - 2026-04-24

### Fixed

- **Collapsible dans code blocks** — La syntaxe `(hidden::visible)` n'est plus interprétée à l'intérieur des fences ` ```lang ` ni des backticks inline. Le code C++ type `Foo::Bar(args)` reste intact en mode lecture.

---

## [2.1.1] - 2026-03-04

### Fixed

- **Callout multi-paragraphes** — Les callouts avec lignes vides internes affichent maintenant tous les paragraphes
- **Callouts consécutifs** — Plusieurs callouts séparés par une ligne vide sont correctement rendus comme callouts distincts

---

## [2.1.0] - 2026-02-02

### Added

#### Dataview Extended Support
- **Dataview !contains()** - Filtre négatif `WHERE !contains(file.name, "_Logs")`
- **Dataview WHERE truthy** - Condition sans opérateur `WHERE file.tags` (vérifie existence)
- **Dataview file.mtime/ctime** - Accès aux dates de modification/création des notes
- **Dataview dateformat()** - Formatage dates `dateformat(file.mtime, "dd/MM HH:mm")`
- **Dataview date(today)** - Date dynamique `date(today)`, `date(now)`, `date(yesterday)`
- **Dataview dur()** - Durées `dur(7 days)`, `dur(1 week)` pour arithmétique dates
- **Dataview FROM OR** - Sources multiples `FROM "Projects" OR "Learning"`

#### Medium Features (13 implemented)
- **M1: Mermaid Diagrams** - Render mermaid code blocks with lazy-loaded component
- **M2: Math/LaTeX Support** - KaTeX rendering via remark-math + rehype-katex
- **M3: Split View** - View two notes side by side with resizable panes (`/split`)
- **M5: Vim Mode** - Vim keybindings in editor (Settings > Editor)
- **M6: Mobile Gestures** - Swipe sidebar, pinch zoom, long press context menu
- **M7: Code Syntax Themes** - 12 themes (github, dracula, monokai, nord, etc.)
- **M8: Template Variables** - `{{date}}`, `{{time}}`, `{{title}}`, `{{folder}}`, `{{clipboard}}` + advanced
- **M9: Folder Icons** - Custom Lucide icons per folder (right-click > Set icon)
- **M10: Note Versioning UI** - Timeline view + diff viewer for note history
- **M11: Bulk Tag Management** - Rename, merge, delete tags across vault (`/tags/manage`)
- **M12: Share Analytics Dashboard** - Access logs, charts, views over time (`/shares/analytics`)
- **M14: Export Formats** - Export notes to HTML (3 themes), DOCX, and EPUB formats
- **M15: Quick Capture Widget** - FAB button with text/voice input, offline queue, daily note append

#### Not Yet Implemented
- **M4: Note Preview on Hover** - TODO
- **M13: Import from Notion** - TODO (generic import exists, not Notion-specific)

#### Templates Enhancement
- **Advanced Templates** - 9 built-in templates, advanced variables (`{{uuid}}`, `{{week}}`, `{{quarter}}`...), live preview, collapsible tree, `/templates` page with guide

### Dependencies
- Added `mermaid` for diagram rendering
- Added `remark-math`, `rehype-katex`, `katex` for LaTeX
- Added `@replit/codemirror-vim` for Vim mode
- Added `@use-gesture/react` for mobile gestures
- Added `diff` for version diff viewer
- Added `docx` for DOCX export
- Added `epub-gen-memory` for EPUB export
- Added `swr` for data fetching

---

## [2.0.0] - 2026-02-01

### Added

#### PostgreSQL Vault Index
- **Vault Index System** - Index PostgreSQL pour performances tags/backlinks/graph
  - Tables `vault_index`, `vault_index_status` et `commit_activity`
  - Endpoints API: `/api/vault/index`, `/api/vault/index/batch`, `/api/vault/index/status`, `/api/vault/index/file`
  - Hook `useVaultIndex` pour gestion frontend
  - UI dans Settings pour lancer/suivre l'indexation
  - Tags, Backlinks et Graph utilisent maintenant l'index (0 appels API vs N)
- **Activity Heatmap PostgreSQL** - Stockage dates de commit pendant l'indexation
  - Table `commit_activity` peuplée automatiquement
  - Lecture depuis PostgreSQL (~5ms) au lieu de GitHub API
  - Fallback GitHub API si pas encore indexé

#### Quick Wins
- **QW1: Audio Player** - Lecteur audio amélioré avec contrôle de vitesse (0.5x à 2x)
- **QW2: Excalidraw Viewer** - Visualisation des fichiers `.excalidraw` en lecture seule
- **QW3: Keyboard Shortcuts** - Modal raccourcis clavier (`?` ou `Ctrl+/`)
- **QW6: Obsidian Callouts** - Support complet des callouts (`[!note]`, `[!warning]`, etc.) avec fold
- **QW7: Table of Contents** - TOC auto-généré depuis les headings avec navigation
- **QW8: Note Stats** - Compteur mots, caractères et temps de lecture
- **QW9: Copy Note Link** - Copie lien wikilink, URL ou Markdown
- **QW10: Frontmatter Viewer** - Affichage collapsible avec mode YAML et copie
- **QW11: Image Zoom Modal** - Zoom images avec navigation, rotation et téléchargement
- **QW12: Code Block Filename** - Affichage nom fichier dans blocs code (` ```js title="app.js" `)
- **QW13: What's New Modal** - Interface patch notes avec historique complet des versions
- **QW4: WikiLink Autocomplete** - Tape `[[` pour suggestions de notes avec fuzzy search
- **QW5: Tag Autocomplete** - Tape `#` pour suggestions de tags avec compteur + highlighting temps réel

### Improved
- **Smart Refresh** - Compare SHA des fichiers, n'indexe que les modifiés
- **Stats Index** - Affiche nouveaux, modifiés, supprimés et inchangés après refresh
- **Auto-Refresh Index** - Refresh automatique si index plus vieux que X jours

### Changed
- Markdown renderer supporte maintenant les callouts Obsidian
- Images dans les notes sont cliquables pour zoom
- Version affichée dans Settings mise à jour (2.0.0)

### Dependencies
- Added `@excalidraw/excalidraw` for Excalidraw viewer
- Added `remark-frontmatter`, `remark-parse`, `remark-stringify`, `unified`
- Added `@codemirror/autocomplete` for editor autocomplete
