# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

#### PostgreSQL Vault Index (Phase 1)
- **Vault Index System** - Index PostgreSQL pour performances tags/backlinks/graph
  - Tables `vault_index` et `vault_index_status`
  - Endpoints API: `/api/vault/index`, `/api/vault/index/batch`, `/api/vault/index/status`, `/api/vault/index/file`
  - Hook `useVaultIndex` pour gestion frontend
  - UI dans Settings pour lancer/suivre l'indexation
  - Tags, Backlinks et Graph utilisent maintenant l'index (0 appels API vs N)

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

### Changed
- Markdown renderer supporte maintenant les callouts Obsidian
- Images dans les notes sont cliquables pour zoom

### Dependencies
- Added `@excalidraw/excalidraw` for Excalidraw viewer
