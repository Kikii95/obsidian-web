# Backlog — Obsidian Web

Current sprint planning and bug tracking.

## Status Legend

- ⬜ **Todo** — Not started
- 🔄 **In Progress** — Currently working on
- ✅ **Done** — Completed
- ❌ **Blocked** — Waiting on something

---

## 🐛 Bugs

| ID | Bug | Status | Complexity | Files |
|----|-----|--------|------------|-------|
| B1 | Arrow keys don't work in create note/folder dialog input | ✅ | 🟢 Easy | Dialog input components |
| B2 | Internal wikilinks don't navigate | ✅ | 🟡 Medium | Markdown renderer, wikilinks.ts (case-insensitive + timing fix) |
| B3 | Markdown lists `- [item]` render without bullet/formatting | ✅ | 🟢 Easy | Markdown CSS/parsing |
| B4 | Move dialog blocks subfolders if file already in parent folder | ✅ | 🟡 Medium | Move dialog, tree navigation |
| B5 | Share links overflow — buttons pushed off screen if path too long | ✅ | 🟢 Easy | Shares page CSS |
| B6 | PDF export has no styling | ✅ | 🟡 Medium | PDF export (html2pdf.js, syntax highlighting) |
| B7 | Sidebar navigation on share pages gives loading error | ✅ | 🟢 Easy | buildHref relative path fix in universal-layout.tsx |

---

## ✨ Features

### 📂 Explorer Enhancements

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| F1 | Create notes in-place from explorer context menu | ✅ | 🟢 Easy | Hover button on folders + dialog |
| F2 | Create folders in-place from explorer context menu | ✅ | 🟢 Easy | Hover button on folders + dialog |
| F3 | Import entire folders (recursive) | ✅ | 🟡 Medium | webkitdirectory already implemented |
| F4 | Import defaults to current path | ✅ | 🟢 Easy | Pass currentPath to dialog |
| F5 | Pin folders (not just notes) | ✅ | 🟢 Easy | Extended pin system + folder icons |
| F6 | Persist pins cross-device | ✅ | 🟡 Medium | PostgreSQL + API sync |

### 🎨 UI/UX

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| F7 | Visible vertical scrollbar | ✅ | 🟢 Easy | Theme-aware scrollbar styles |
| F8 | Scroll to top button | ✅ | 🟢 Easy | FAB with fade animation |

### 🖋️ Direction artistique — points faibles restants

| ID | Point | Status | Complexity | Notes |
|----|-------|--------|------------|-------|
| DA1 | Catalogue de 36 thèmes contraire à la DA | ⬜ | 🟡 Medium | Ne garder que Obsidienne + Bristol (migrer les réglages persistés) |
| DA2 | Pages héritées > 300 lignes habillées par sélecteurs CSS | ⬜ | 🔴 Hard | Dashboard, dossier, modèles, réglages, rendu Markdown : découper puis passer aux composants de la DA |
| DA3 | Graphe 3D et légendes pas encore dans la matière | ⬜ | 🟡 Medium | Nœuds = fiches, arêtes = fils de renvoi ; non vérifiable sans WebGL ni index |
| DA4 | Variante C du canevas (plateau des renvois) seulement esquissée | ⬜ | 🟡 Medium | Renvois sortants en fiches satellites sous la note ; à porter en plein plateau |
| DA5 | Lecteur public `/t` et pages de partage `/s` : traitement global seulement | ⬜ | 🟢 Easy | Fiche-index en place, en-tête et arbre à reprendre |
| DA6 | Dette lint React Compiler (19 cas) passée en avertissement | ⬜ | 🟡 Medium | `set-state-in-effect`, `preserve-manual-memoization`, `immutability` ; 2 hooks conditionnels dans `s/[token]/file` |

### 📱 PWA

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| P1 | iOS launch/splash screens | ✅ | 🟢 Easy | Dynamic API + meta tags |
| P2 | iOS "Add to Home Screen" popup | ✅ | 🟡 Medium | Detection + custom UI |
| P3 | Persist app state on restart | ✅ | 🟡 Medium | Session state store |

### 🔗 Sharing (Future)

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| F9 | Collapsible sidebar on shared pages | ✅ | 🟡 Medium | ShareSidebar + useFolderExpansion |
| F10 | Reader/Writer mode on shares | ✅ | 🔴 Hard | Mode selector, save API, edit UI |
| F11 | Collaborative import (deposit drive) | ✅ | 🔴 Hard | Upload for non-auth users |
| F12 | Login button on shared pages | ✅ | 🟡 Medium | NextAuth signIn button |
| F13 | Copy to Vault from shares | ✅ | 🔴 Hard | Export/import mechanism with conflict handling |
| F18 | Unified explorer view + create in shares | ✅ | 🔴 Hard | All shares open explorer, create note/folder in writer mode |
| F19 | Refactor: Unified sidebar component | ✅ | 🟡 Medium | Shared tree-utils + FileTreeIcon component |
| F20 | Share permission toggles | ✅ | 🟡 Medium | Allow/block copy to vault and export per share |

### 🧪 Advanced

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| F14 | Hidden content syntax `(hidden::visible)` | ✅ | 🟡 Medium | CollapsibleContent + processCollapsible |
| F15 | Temp vault (any GitHub repo) | ✅ | 🔴 Hard | `/t/owner/repo` — browse any public repo as vault |
| F16 | Cross-platform settings sync | ✅ | 🟡 Medium | GitHub API sync |
| F17 | ~~Auto-format button~~ | ❌ Removed | 🔴 Hard | Removed — remark only normalizes style, doesn't add structure |
| F21 | Unified Layout Architecture | ✅ | 🔴 Hard | UniversalLayout component, shared sidebar/header, 3 modes (dashboard/share/temp) |
| F22 | Org shortcut in explore dialog | ✅ | 🟢 Easy | Auto-detect accessible orgs, show quick-fill buttons |
| F23 | Temp Vault org restriction handling | ✅ | 🟡 Medium | Distinguish 403 (org restriction) from 429 (rate limit), proper error UI |
| F24 | Interactive checkbox toggle in reader | ✅ | 🟡 Medium | Click checkboxes directly without entering edit mode, auto-save to GitHub |

---

## 📅 Sprint Planning

### Sprint 1 — Quick Wins (Bugs + Easy UI) ✅ COMPLETE

| Order | ID | Task | Status |
|-------|-----|------|--------|
| 1 | B1 | Fix arrow keys in input dialogs | ✅ |
| 2 | B3 | Fix markdown list rendering | ✅ |
| 3 | B5 | Fix share links overflow | ✅ |
| 4 | F7 | Add visible scrollbar | ✅ |
| 5 | F8 | Add scroll to top button | ✅ |
| 6 | P1 | Add iOS splash screens | ✅ |

### Sprint 2 — Explorer Enhanced ✅ COMPLETE

| Order | ID | Task | Status |
|-------|-----|------|--------|
| 1 | F1 | Create notes in-place | ✅ |
| 2 | F2 | Create folders in-place | ✅ |
| 3 | F4 | Import defaults to current path | ✅ |
| 4 | F5 | Pin folders | ✅ |
| 5 | B4 | Fix move dialog subfolder blocking | ✅ |

### Sprint 3 — Core Fixes ✅ COMPLETE

| Order | ID | Task | Status |
|-------|-----|------|--------|
| 1 | B2 | Fix internal wikilinks | ✅ |
| 2 | B6 | Style PDF export | ✅ |
| 3 | F3 | Import folders (recursive) | ✅ |

### Sprint 4 — Quick Fixes ✅ COMPLETE

| Order | ID | Task | Status |
|-------|-----|------|--------|
| 1 | B2 | Fix wikilinks timing (key re-render) | ✅ |
| 2 | F12 | Login button on shared pages | ✅ |
| 3 | P2 | iOS Add to Home Screen popup | ✅ |

### Sprint 5 — UX Enhancements ✅ COMPLETE

| Order | ID | Task | Status |
|-------|-----|------|--------|
| 1 | F9 | Collapsible sidebar on shared pages | ✅ |
| 2 | F14 | Hidden content syntax | ✅ |
| 3 | P3 | Persist app state on restart | ✅ |

### Sprint 6 — Cross-Device Sync ✅ COMPLETE

| Order | ID | Task | Status |
|-------|-----|------|--------|
| 1 | F6 | Persist pins cross-device | ✅ |
| 2 | F16 | Cross-platform settings sync | ✅ |

---

## 📊 Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Bugs | 7 | 7 | 0 |
| Features | 24 | 24 | 0 |
| PWA | 3 | 3 | 0 |
| **Total** | **34** | **34** | **0** |

### 🎉 All Features Complete!

---

*Last updated: 2026-02-01*

---

## 📦 Archive Note

All 34 items from Sprints 1-6 have been completed. This backlog is now empty and ready for new feature planning. See [ROADMAP.md](./ROADMAP.md) for future features and ideas.
