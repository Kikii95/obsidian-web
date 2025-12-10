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
| Large file handling | Medium | Files > 1MB can be slow to load |
| Offline sync conflicts | Low | No conflict resolution UI yet |
| Canvas node editing | Medium | Can't edit text nodes inline |

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

### Other Ideas

| Idea | Complexity | Description |
|------|------------|-------------|
| Collaboration (real-time) | 🔴 Very High | Multiple users editing same note |
| Comments/annotations | 🟡 Medium | Add comments to notes |
| Publish mode | 🟡 Medium | Public read-only view of selected notes |
| AI integration | 🟡 Medium | Summarize, search, suggest links |
| Mobile app (React Native) | 🔴 Very High | Native app wrapping the web |
| Browser extension | 🟡 Medium | Clip web pages to vault |
| Dataview-like queries | 🔴 High | Query notes by frontmatter |

---

## 📅 Release History

| Version | Date | Highlights |
|---------|------|------------|
| v1.1.0 | 2025-12 | Multi-user, video viewer, multi-format import |
| v1.0.0 | 2025-11 | Initial release |

---

## 🤝 Contributing Ideas

Have an idea? [Open an issue](https://github.com/Kikii95/obsidian-web/issues/new) with:
- **Title**: `[Idea] Your feature name`
- **Description**: What problem does it solve?
- **Use case**: Who would use this and when?

We review all suggestions and add promising ones to this roadmap!
