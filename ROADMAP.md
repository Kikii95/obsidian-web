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
| Audio file support | 🔴 | Play .mp3, .wav, .ogg files in vault |
| Excalidraw viewer | 🔴 | Render .excalidraw files |
| Search in file content | 🔴 | Full-text search across all notes |
| Mobile gestures | 🔴 | Swipe navigation, pinch zoom |
| Keyboard shortcuts help | 🔴 | `?` to show all shortcuts |

### Medium Priority

| Feature | Status | Description |
|---------|--------|-------------|
| Note linking autocomplete | 🔴 | `[[` triggers note suggestions in editor |
| Tag autocomplete | 🔴 | `#` triggers tag suggestions |
| Callout blocks | 🔴 | Obsidian-style callouts (> [!note], > [!warning]) |
| Mermaid diagrams | 🔴 | Render mermaid code blocks |
| Math/LaTeX support | 🔴 | KaTeX rendering for equations |
| Table of contents | 🔴 | Auto-generated TOC from headings |
| Reading time estimate | 🔴 | Show estimated reading time |
| Word count | 🔴 | Display word/character count |

### Low Priority

| Feature | Status | Description |
|---------|--------|-------------|
| Vim mode | 🔴 | Vim keybindings in editor |
| Split view | 🔴 | View two notes side by side |
| Note preview on hover | 🔴 | Hover over `[[link]]` to see preview |
| Folder icons | 🔴 | Custom icons per folder |
| Note templates variables | 🔴 | `{{date}}`, `{{title}}` in templates |

---

## 🐛 Known Issues / Technical Debt

| Issue | Priority | Description |
|-------|----------|-------------|
| Settings sync unreliable | High | Cloud settings sync (PIN, theme, preferences) between mobile and desktop doesn't always work correctly |
| GitHub API rate limiting | High | Tags explorer and some features consume too many API requests, making them nearly unusable on large vaults |
| Large file handling | Medium | Files > 1MB can be slow to load |
| Offline sync conflicts | Low | No conflict resolution UI yet |
| Canvas node editing | Medium | Can't edit text nodes inline |
| Search performance | Medium | Full-text search on large vaults can be slow (Fuse.js limitations) |

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
| Code syntax themes | 🟡 Medium | Choose syntax highlighting theme (github, monokai, dracula) |
| Custom theme editor | 🔴 High | Full theme customization (every color configurable) |
| i18n (multi-language) | 🟡 Medium | Support for FR/EN/other languages |
| Keyboard shortcuts customization | 🟡 Medium | Remap keyboard shortcuts |
| Offline editing queue | 🔴 High | Queue changes when offline, sync when back online |

---

## 📅 Release History

| Version | Date | Highlights |
|---------|------|------------|
| v1.7.1 | 2026-01 | **Interactive Checkboxes**: Click checkboxes directly in reader mode, auto-saves to GitHub |
| v1.7.0 | 2026-01 | **Unified Layout**: Refactored architecture with UniversalLayout component for dashboard/share/temp modes. Org shortcuts in explore dialog, proper org OAuth restriction handling, improved Temp Vault UX. Removed auto-format button (remark only normalized style) |
| v1.5.0 | 2026-01 | **Temp Vault Reader**: Browse any public GitHub repo as Obsidian vault (`/t/owner/repo`), rate limit indicator, 60 req/hr unauthenticated |
| v1.4.0 | 2026-01 | Copy to Vault from shares, share permission toggles (allow/block copy & export), sidebar refactoring with shared utilities |
| v1.3.0 | 2026-01 | Share links Reader/Writer/Deposit mode, unified explorer for shares, create notes/folders in writer shares, deposit dropbox for anonymous uploads |
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
