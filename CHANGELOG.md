# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2026-02-02

### Added

#### Medium Features (15 new features)
- **M1: Mermaid Diagrams** - Render mermaid code blocks with lazy-loaded component
- **M2: Math/LaTeX Support** - KaTeX rendering via remark-math + rehype-katex
- **M3: Split View** - View two notes side by side with resizable panes (`/split`)
- **M4: Note Preview on Hover** - Hover over `[[wikilink]]` to see note preview
- **M5: Vim Mode** - Vim keybindings in editor (Settings > Editor)
- **M6: Mobile Gestures** - Swipe sidebar, pinch zoom, long press context menu
- **M7: Code Syntax Themes** - 12 themes (github, dracula, monokai, nord, etc.)
- **M8: Template Variables** - `{{date}}`, `{{time}}`, `{{title}}`, `{{folder}}`, `{{clipboard}}`
- **M9: Folder Icons** - Custom Lucide icons per folder (right-click > Set icon)
- **M10: Note Versioning UI** - Timeline view + diff viewer for note history
- **M11: Bulk Tag Management** - Rename, merge, delete tags across vault (`/tags/manage`)
- **M12: Share Analytics Dashboard** - Access logs, charts, views over time (`/shares/analytics`)
- **M13: Import from Notion** - ZIP import with ID cleanup, callout conversion, link fixes (`/import`)
- **M14: Export Formats** - Export notes to HTML (3 themes), DOCX, and EPUB formats
- **M15: Quick Capture Widget** - FAB button with text/voice input, offline queue, daily note append

#### Templates Enhancement Round 5
- **9 Built-In Templates** - Quick Note, Daily Note, Meeting Notes, Weekly Review, Project, Book Notes, Recipe, Code Snippet, Brainstorm
- **Advanced Template Variables** - `{{uuid}}`, `{{week}}`, `{{quarter}}`, `{{random:N}}`, `{{weekday}}`, `{{tomorrow}}`, `{{yesterday}}`, `{{dayOfYear}}`
- **Template Preview Mode** - Code/Preview tabs in template view dialog with live rendering
- **Template Tree Organization** - Collapsible folder structure for vault templates
- **Template Manager Page** - Dedicated `/templates` page with Built-in, Custom, and Guide tabs
- **Templates Header Button** - Quick access in desktop and mobile header

### Fixed
- **PDF Export Mermaid** - Mermaid diagrams now export correctly to PDF
- **Vault Templates Detection** - Fixed `buildTree` to properly populate children for template lookup
- **Template Picker UX** - Compact popover dropdown instead of oversized fixed-height box

### Improved
- **Templates Quick Actions** - Templates button added to dashboard quick actions card
- **DRY Code** - Extracted `buildTree` to shared `tree-utils.ts` module

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
