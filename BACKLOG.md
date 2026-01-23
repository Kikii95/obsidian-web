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
| B1 | Arrow keys don't work in create note/folder dialog input | ⬜ | 🟢 Easy | Dialog input components |
| B2 | Internal wikilinks don't navigate | ⬜ | 🟡 Medium | Markdown renderer, link handler |
| B3 | Markdown lists `- [item]` render without bullet/formatting | ⬜ | 🟢 Easy | Markdown CSS/parsing |
| B4 | Move dialog blocks subfolders if file already in parent folder | ⬜ | 🟡 Medium | Move dialog, tree navigation |
| B5 | Share links overflow — buttons pushed off screen if path too long | ⬜ | 🟢 Easy | Shares page CSS |
| B6 | PDF export has no styling | ⬜ | 🟡 Medium | PDF export (jspdf/html2canvas) |

---

## ✨ Features

### 📂 Explorer Enhancements

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| F1 | Create notes in-place from explorer context menu | ⬜ | 🟢 Easy | Context menu + API |
| F2 | Create folders in-place from explorer context menu | ⬜ | 🟢 Easy | Context menu + API |
| F3 | Import entire folders (recursive) | ⬜ | 🟡 Medium | Progress UI, webkitdirectory |
| F4 | Import defaults to current path | ⬜ | 🟢 Easy | Pass currentPath to dialog |
| F5 | Pin folders (not just notes) | ⬜ | 🟢 Easy | Extend pin system |
| F6 | Persist pins cross-device | ⬜ | 🟡 Medium | DB storage vs localStorage |

### 🎨 UI/UX

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| F7 | Visible vertical scrollbar | ⬜ | 🟢 Easy | CSS scrollbar styles |
| F8 | Scroll to top button | ⬜ | 🟢 Easy | FAB component |

### 📱 PWA

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| P1 | iOS launch/splash screens | ⬜ | 🟢 Easy | Generate images + meta tags |
| P2 | iOS "Add to Home Screen" popup | ⬜ | 🟡 Medium | Detection + custom UI |
| P3 | Persist app state on restart | ⬜ | 🟡 Medium | Session restoration |

### 🔗 Sharing (Future)

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| F9 | Collapsible sidebar on shared pages | ⬜ | 🟡 Medium | Reuse FileTree |
| F10 | Reader/Writer mode on shares | ⬜ | 🔴 Hard | Permissions system |
| F11 | Collaborative import (deposit drive) | ⬜ | 🔴 Hard | Upload for non-auth users |
| F12 | Login button on shared pages | ⬜ | 🟡 Medium | OAuth flow |
| F13 | Integrate shared link to own repo | ⬜ | 🔴 Hard | Fork/copy mechanism |

### 🧪 Advanced

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| F14 | Hidden content syntax `(hidden::visible)` | ⬜ | 🟡 Medium | Custom parser + toggle |
| F15 | Temp vault (any GitHub repo) | ⬜ | 🔴 Hard | Major feature |
| F16 | Cross-platform settings sync | ⬜ | 🟡 Medium | DB sync |
| F17 | Auto-format button | ⬜ | 🔴 Hard | AI/heuristics |

---

## 📅 Sprint Planning

### Sprint 1 — Quick Wins (Bugs + Easy UI)

| Order | ID | Task | Status |
|-------|-----|------|--------|
| 1 | B1 | Fix arrow keys in input dialogs | ⬜ |
| 2 | B3 | Fix markdown list rendering | ⬜ |
| 3 | B5 | Fix share links overflow | ⬜ |
| 4 | F7 | Add visible scrollbar | ⬜ |
| 5 | F8 | Add scroll to top button | ⬜ |
| 6 | P1 | Add iOS splash screens | ⬜ |

### Sprint 2 — Explorer Enhanced

| Order | ID | Task | Status |
|-------|-----|------|--------|
| 1 | F1 | Create notes in-place | ⬜ |
| 2 | F2 | Create folders in-place | ⬜ |
| 3 | F4 | Import defaults to current path | ⬜ |
| 4 | F5 | Pin folders | ⬜ |
| 5 | B4 | Fix move dialog subfolder blocking | ⬜ |

### Sprint 3 — Core Fixes

| Order | ID | Task | Status |
|-------|-----|------|--------|
| 1 | B2 | Fix internal wikilinks | ⬜ |
| 2 | B6 | Style PDF export | ⬜ |
| 3 | F3 | Import folders (recursive) | ⬜ |

---

## 📊 Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Bugs | 6 | 0 | 6 |
| Features | 17 | 0 | 17 |
| PWA | 3 | 0 | 3 |
| **Total** | **26** | **0** | **26** |

### By Complexity

| Level | Count |
|-------|-------|
| 🟢 Easy | 10 |
| 🟡 Medium | 10 |
| 🔴 Hard | 6 |

---

*Last updated: 2025-01-23*
