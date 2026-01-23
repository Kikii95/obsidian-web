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
| F6 | Persist pins cross-device | ⬜ | 🟡 Medium | DB storage vs localStorage |

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
| P3 | Persist app state on restart | ⬜ | 🟡 Medium | Session restoration |

### 🔗 Sharing (Future)

| ID | Feature | Status | Complexity | Notes |
|----|---------|--------|------------|-------|
| F9 | Collapsible sidebar on shared pages | ⬜ | 🟡 Medium | Reuse FileTree |
| F10 | Reader/Writer mode on shares | ⬜ | 🔴 Hard | Permissions system |
| F11 | Collaborative import (deposit drive) | ⬜ | 🔴 Hard | Upload for non-auth users |
| F12 | Login button on shared pages | ✅ | 🟡 Medium | NextAuth signIn button |
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

### Sprint 5 — UX Enhancements (Next)

| Order | ID | Task | Status |
|-------|-----|------|--------|
| 1 | F9 | Collapsible sidebar on shared pages | ⬜ |
| 2 | F14 | Hidden content syntax | ⬜ |
| 3 | P3 | Persist app state on restart | ⬜ |

### Sprint 6 — Cross-Device Sync (Future)

| Order | ID | Task | Status |
|-------|-----|------|--------|
| 1 | F6 | Persist pins cross-device | ⬜ |
| 2 | F16 | Cross-platform settings sync | ⬜ |

---

## 📊 Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Bugs | 6 | 6 | 0 |
| Features | 17 | 8 | 9 |
| PWA | 3 | 2 | 1 |
| **Total** | **26** | **16** | **10** |

### By Complexity

| Level | Count | Done |
|-------|-------|------|
| 🟢 Easy | 10 | 10 |
| 🟡 Medium | 10 | 6 |
| 🔴 Hard | 6 | 0 |

---

*Last updated: 2026-01-23*
