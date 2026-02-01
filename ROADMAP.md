# Roadmap & Ideas

This document tracks planned features, known issues, and community ideas for Obsidian Web.

## Status Legend

- 🔴 **Not Started** — In backlog
- 🟡 **In Progress** — Currently being worked on
- 🟢 **Done** — Shipped
- 💡 **Idea** — Community suggestion, needs discussion

---

## 🚀 Planned Features

### High Priority

| Feature | Status | Description |
|---------|--------|-------------|
| **Batch file operations** | 🟢 | Multi-select, batch delete/move/export — Selection mode implemented |
| **Share links with permissions** | 🟢 | Reader/Writer/Deposit mode, create notes/folders in shares |
| **Deposit mode (dropbox)** | 🟢 | Anonymous file upload without seeing content, rate limited, configurable |
| **Copy to Vault** | 🟢 | Copy files/folders from share to own vault with conflict handling |
| **Share permission toggles** | 🟢 | Allow/block copy to vault and export per share |
| **Audio file support** | 🟢 | Play .mp3, .wav, .ogg with speed control (0.5x-2x) — v2.0.0 |
| **Excalidraw viewer** | 🟢 | Render .excalidraw files with zoom controls — v2.0.0 |
| **Keyboard shortcuts help** | 🟢 | `?` or `Ctrl+/` shows all shortcuts (23 total) — v2.0.0 |
| Search in file content | 🔴 | Full-text search across all notes |
| **Mobile gestures** | 🟢 | Swipe sidebar, pinch zoom, long press — v2.1.0 |

### Medium Priority

| Feature | Status | Description |
|---------|--------|-------------|
| **Callout blocks** | 🟢 | Obsidian-style callouts (18+ types, foldable) — v2.0.0 |
| **Table of contents** | 🟢 | Auto-generated TOC from headings, collapsible — v2.0.0 |
| **Reading time estimate** | 🟢 | Show estimated reading time (200 wpm) — v2.0.0 |
| **Word count** | 🟢 | Display word/character/paragraph count — v2.0.0 |
| **Interactive checkboxes** | 🟢 | Click checkboxes in reader mode, auto-saves — v1.7.1 |
| **Code block filenames** | 🟢 | `js title="file.js"` syntax support — v2.0.0 |
| **Frontmatter viewer** | 🟢 | Collapsible frontmatter with YAML export — v2.0.0 |
| **Image zoom modal** | 🟢 | Full gallery with zoom/rotation/navigation — v2.0.0 |
| **Copy note link** | 🟢 | Multiple formats: wikilink, URL, markdown — v2.0.0 |
| **What's New modal** | 🟢 | Patch notes UI, auto-shows on version change — v2.0.0 |
| **Note linking autocomplete** | 🟢 | `[[` triggers note suggestions in editor — v2.0.0 |
| **Tag autocomplete** | 🟢 | `#` triggers tag suggestions — v2.0.0 |
| **Mermaid diagrams** | 🟢 | Render mermaid code blocks — v2.1.0 |
| **Math/LaTeX support** | 🟢 | KaTeX rendering for equations — v2.1.0 |
| **Note versioning UI** | 🟢 | Timeline + diff viewer for history — v2.1.0 |
| **Bulk tag management** | 🟢 | Rename, merge, delete tags — v2.1.0 |

### Low Priority

| Feature | Status | Description |
|---------|--------|-------------|
| **Vim mode** | 🟢 | Vim keybindings in editor — v2.1.0 |
| **Split view** | 🟢 | View two notes side by side — v2.1.0 |
| **Note preview on hover** | 🟢 | Hover over `[[link]]` to see preview — v2.1.0 |
| **Folder icons** | 🟢 | Custom Lucide icons per folder — v2.1.0 |
| **Note templates variables** | 🟢 | `{{date}}`, `{{title}}` in templates — v2.1.0 |
| **Code syntax themes** | 🟢 | 12 themes (dracula, monokai, etc.) — v2.1.0 |
| **Share analytics** | 🟢 | Access logs, charts, views over time — v2.1.0 |
| **Import from Notion** | 🟢 | ZIP import with ID cleanup, callout conversion — v2.1.0 |
| **Export formats** | 🟢 | Export to HTML, DOCX, EPUB — v2.1.0 |
| **Quick capture widget** | 🟢 | FAB with voice input, offline queue — v2.1.0 |

---

## 🐛 Known Issues / Technical Debt

| Issue | Priority | Status | Description |
|-------|----------|--------|-------------|
| Settings sync | High | 🟡 Improved | Throttled/debounced, separate device files. Retry logic could be better |
| GitHub API rate limiting | High | 🟢 Resolved | PostgreSQL index eliminates most API calls (~5ms vs API) |
| Large file handling | Medium | 🟢 Resolved | Smart handling >1MB via GitHub download_url |
| Canvas node editing | Medium | 🟢 Resolved | Inline text editing with double-click, auto-resize |
| Offline sync conflicts | Low | 🟡 Partial | Conflict detection exists, UI dialog missing |
| Full-text search | Medium | 🔴 Not Started | Not yet implemented (Fuse.js or PostgreSQL FTS planned) |

---

## 🗄️ PostgreSQL Vault Index (v2.0.0)

Major architecture improvement shipped in v2.0.0:

| Feature | Status | Description |
|---------|--------|-------------|
| **Vault Index System** | 🟢 | PostgreSQL tables for tags, backlinks, graph data |
| **Smart Refresh** | 🟢 | SHA comparison — only re-indexes modified files |
| **Auto-Refresh** | 🟢 | Configurable interval (Settings > Dashboard) |
| **Activity Heatmap** | 🟢 | Commit activity stored in PostgreSQL (~5ms queries) |
| **Graph without limit** | 🟢 | No more 100-file cap, uses indexed data |

**API Endpoints:**
- `POST /api/vault/index` — Full index rebuild
- `POST /api/vault/index/batch` — Batch processing
- `GET /api/vault/index/status` — Index status
- `POST /api/vault/index/file` — Single file index

---

## 💡 Community Ideas

### 🔌 Plugin System (Big Feature)

**Goal**: Allow community to develop and share plugins.

**Proposed Architecture**:
```
plugins/
├── official/           # Maintained by us
│   ├── excalidraw/
│   └── mermaid/
└── community/          # User-submitted
    ├── plugin-name/
    │   ├── manifest.json
    │   ├── main.js
    │   └── styles.css
    └── ...
```

**Plugin API** (v1 proposal):
```typescript
interface ObsidianWebPlugin {
  id: string;
  name: string;
  version: string;
  author: string;

  // Lifecycle
  onLoad(): void;
  onUnload(): void;

  // Hooks
  registerMarkdownProcessor?(processor: MarkdownProcessor): void;
  registerCommand?(command: Command): void;
  registerSettingsTab?(tab: SettingsTab): void;
  registerFileHandler?(extensions: string[], handler: FileHandler): void;
}
```

**Features needed**:
- [ ] Plugin manifest format
- [ ] Plugin loader (sandboxed)
- [ ] Plugin settings UI
- [ ] Plugin marketplace / registry
- [ ] Plugin developer documentation
- [ ] Review process for community plugins

**Security considerations**:
- Plugins run in iframe sandbox
- No access to GitHub token
- Content Security Policy restrictions
- Manual review before listing

**Timeline**: TBD — This is a major feature requiring careful design.

---

### 📦 Batch File Operations (Big Feature)

**Goal**: Enable multi-select and batch operations on files/folders in the explorer.

**Proposed Features**:

#### 1. Multi-Select in Explorer

| Feature | Complexity | Description |
|---------|------------|-------------|
| Checkbox mode toggle | 🟢 Low | Button to enter/exit selection mode |
| Click to select | 🟢 Low | Single click selects file in selection mode |
| Ctrl+Click | 🟢 Low | Add/remove file from selection |
| Shift+Click | 🟡 Medium | Select range of files |
| Select all in folder | 🟢 Low | "Select all" option per folder |
| Selection counter | 🟢 Low | "X items selected" indicator |

**UX Flow**:
```
Normal mode → Click "Select" button → Selection mode enabled
→ Checkboxes appear on all files/folders
→ Click items to select/deselect
→ Floating action bar appears at bottom with actions
→ Click "Cancel" or perform action to exit selection mode
```

#### 2. Batch Actions (Floating Action Bar)

| Action | Complexity | Description |
|--------|------------|-------------|
| Delete selected | 🟡 Medium | Delete multiple files at once (with confirmation) |
| Move selected | 🟡 Medium | Move files to another folder |
| Export selected | 🟡 Medium | Download as .zip |
| Pin/Unpin selected | 🟢 Low | Batch pin operation |

**Error handling**:
- Show progress indicator (X/Y files processed)
- If some fail, show partial success message
- List failed items with error reasons
- Option to retry failed items

#### 3. Multi-File Import

| Feature | Complexity | Description |
|---------|------------|-------------|
| Multiple file picker | 🟢 Low | `<input multiple>` support |
| Drag & drop multiple | 🟢 Low | Drop multiple files at once |
| Folder upload | 🟡 Medium | Upload entire folder structure |
| Import progress | 🟡 Medium | Progress bar for batch import |
| Conflict resolution | 🟡 Medium | Skip/rename/overwrite for existing files |

**Folder upload considerations**:
- Use `webkitdirectory` attribute for folder selection
- Preserve folder structure during upload
- Show tree preview before confirming import
- Handle nested folders recursively

#### 4. Implementation Plan

**Phase 1: Selection System**
- [ ] Add selection store (Zustand)
- [ ] Add checkbox UI to `VirtualFileTree`
- [ ] Implement Ctrl+Click and Shift+Click
- [ ] Add floating action bar component

**Phase 2: Batch Delete**
- [ ] Create batch delete API endpoint
- [ ] Add confirmation dialog for multi-delete
- [ ] Implement progress tracking
- [ ] Handle partial failures

**Phase 3: Batch Move**
- [ ] Create batch move API endpoint
- [ ] Add folder picker for destination
- [ ] Implement move with progress

**Phase 4: Multi-Import**
- [ ] Update import dialog for multiple files
- [ ] Add folder upload support
- [ ] Implement conflict resolution UI
- [ ] Add import progress tracking

**Phase 5: Export**
- [ ] Create zip generation (client-side or server-side)
- [ ] Add export selected action
- [ ] Support folder export

**Technical Notes**:
- GitHub API allows max 100 files per commit for tree operations
- For large batches, split into multiple commits
- Consider rate limiting implications
- Zip generation: use `JSZip` library client-side

**Timeline**: TBD — Phased implementation recommended.

---

### 👥 Collaboration & Sharing (Big Feature)

**Goal**: Enable vault sharing and collaborative workflows.

**Proposed Features**:

| Feature | Complexity | Description |
|---------|------------|-------------|
| Shared vaults | 🔴 High | Multiple users accessing the same vault with different permissions |
| Shared folders | 🟡 Medium | Share specific folders without exposing entire vault |
| File/folder transfer | 🟡 Medium | Send a note or folder to another user's vault |
| Permission system | 🔴 High | Read/write/admin roles per user per vault |
| Share via link | 🟡 Medium | Generate shareable links (public or with login required) |
| Multi-account switcher | 🟡 Medium | Quick switch between different GitHub accounts/vaults |

**Architecture considerations**:
- OAuth token per vault (user grants access to specific repos)
- Config stored in `.obsidian-web-config` private repo
- Invitation system via GitHub collaborator or custom token

**Timeline**: TBD — Requires careful security design.

---

### Other Ideas

| Idea | Complexity | Description |
|------|------------|-------------|
| Collaboration (real-time) | 🔴 Very High | Multiple users editing same note (like Google Docs) |
| Comments/annotations | 🟡 Medium | Add comments to notes |
| Publish mode | 🟡 Medium | Public read-only view of selected notes |
| AI integration | 🟡 Medium | Summarize, search, suggest links |
| Mobile app (React Native) | 🔴 Very High | Native app wrapping the web |
| Browser extension | 🟡 Medium | Clip web pages to vault |
| Dataview-like queries | 🔴 High | Query notes by frontmatter |
| ~~Code syntax themes~~ | 🟢 Done | Choose syntax highlighting theme — v2.1.0 |
| Custom theme editor | 🔴 High | Full theme customization (every color configurable) |
| i18n (multi-language) | 🟡 Medium | Support for FR/EN/other languages |
| Keyboard shortcuts customization | 🟡 Medium | Remap keyboard shortcuts |
| Offline editing queue | 🔴 High | Queue changes when offline, sync when back online |

---

## 📅 Release History

| Version | Date | Highlights |
|---------|------|------------|
| **v2.1.0** | 2026-02 | **11 Medium Features**: Mermaid diagrams, Math/LaTeX, Split view, Note preview on hover, Vim mode, Mobile gestures, Code syntax themes, Template variables, Folder icons, Note versioning UI, Bulk tag management |
| **v2.0.0** | 2026-02 | **PostgreSQL Vault Index** + **13 Quick Wins**: Audio player, Excalidraw viewer, Keyboard shortcuts, Callouts, TOC, Note stats, Copy link, Frontmatter viewer, Image zoom, Code filenames, What's New modal, Graph unlimited, Auto-refresh index |
| v1.7.1 | 2026-01 | **Interactive Checkboxes**: Click checkboxes directly in reader mode, auto-saves to GitHub |
| v1.7.0 | 2026-01 | **Unified Layout**: Refactored architecture with UniversalLayout component for dashboard/share/temp modes |
| v1.5.0 | 2026-01 | **Temp Vault Reader**: Browse any public GitHub repo as Obsidian vault (`/t/owner/repo`) |
| v1.4.0 | 2026-01 | Copy to Vault from shares, share permission toggles, sidebar refactoring |
| v1.3.0 | 2026-01 | Share links Reader/Writer/Deposit mode, unified explorer for shares |
| v1.2.0 | 2026-01 | Selection mode, batch operations, cross-device pins sync, settings sync |
| v1.1.0 | 2025-12 | Multi-user, video viewer, multi-format import |
| v1.0.0 | 2025-11 | Initial release |

---

## 🤝 Contributing Ideas

Have an idea? [Open an issue](https://github.com/Kikii95/obsidian-web/issues/new) with:
- **Title**: `[Idea] Your feature name`
- **Description**: What problem does it solve?
- **Use case**: Who would use this and when?

We review all suggestions and add promising ones to this roadmap!
