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
| F11 | Collaborative import (deposit drive) | ⬜ | 🔴 Hard | Upload for non-auth users |
| F12 | Login button on shared pages | ✅ | 🟡 Medium | NextAuth signIn button |
| F13 | Integrate shared link to own repo | ⬜ | 🔴 Hard | Fork/copy mechanism |
| F18 | Unified explorer view + create in shares | ✅ | 🔴 Hard | All shares open explorer, create note/folder in writer mode |
| F19 | Refactor: Unified sidebar component | ⬜ | 🟡 Medium | Extract FileTree base component from VaultSidebar, use in ShareSidebar |

### 🧪 Advanced

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| F14 | Hidden content syntax `(hidden::visible)` | ✅ | 🟡 Medium | CollapsibleContent + processCollapsible |
| F15 | Temp vault (any GitHub repo) | ⬜ | 🔴 Hard | Major feature |
| F16 | Cross-platform settings sync | ✅ | 🟡 Medium | GitHub API sync |
| F17 | Auto-format button | ⬜ | 🔴 Hard | AI/heuristics |

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
| Bugs | 6 | 6 | 0 |
| Features | 19 | 15 | 4 |
| PWA | 3 | 3 | 0 |
| **Total** | **28** | **24** | **4** |

### By Complexity

| Level | Count | Done |
|-------|-------|------|
| 🟢 Easy | 10 | 10 |
| 🟡 Medium | 11 | 10 |
| 🔴 Hard | 7 | 4 |

---

*Last updated: 2026-01-28*
