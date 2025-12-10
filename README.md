# Obsidian Web

A modern web-based viewer for Obsidian vaults, powered by GitHub as the backend storage.

**Live Demo**: [obsidian-web-gray.vercel.app](https://obsidian-web-gray.vercel.app)

## Features

### Core
- **GitHub Integration** — OAuth authentication, read/write access to your vault repository
- **Markdown Viewer** — Full GFM support, syntax highlighting, wikilinks resolution
- **CodeMirror Editor** — Syntax highlighting, keyboard shortcuts (Ctrl+S, Esc)
- **File Tree Navigation** — Collapsible folders, search, real-time sync with GitHub

### Dashboard
- **Activity Heatmap** — GitHub-style contribution calendar showing commit history
- **Mini Graph** — Interactive graph preview with configurable physics
- **Vault Statistics** — Notes, folders, links, orphans, images, PDFs, canvas count
- **Pinned Notes** — Quick access to your favorite notes
- **Recent Notes** — Configurable list of recently accessed notes

### Graph View
- **Force-Directed Graph** — D3.js-powered node visualization
- **Live Settings** — Real-time adjustment of repulsion, distance, gravity
- **Orphan Toggle** — Show/hide notes without links
- **Zoom Persistence** — Save and restore zoom level
- **Click Navigation** — Click nodes to open notes

### Media Support
- **Images** — Zoom, rotation, fullscreen viewing
- **PDF Viewer** — Navigation, zoom, download (via react-pdf)
- **Canvas Viewer** — Visual editing with React Flow (zoom, pan, minimap)

### Privacy & Security
- **Lock System** — Apple Notes-style PIN protection
- **Private Notes** — Support for `#private` tag, `private: true` frontmatter, `_private/` folders
- **Offline Mode** — Cache API for note access without network

### PWA
- **Installable** — Add to home screen on mobile/desktop
- **Service Worker** — Offline fallback page
- **iOS Ready** — Apple touch icons, splash screens

### Customization (Phase 9)
- **36 Color Themes** — 18 dark + 18 light themes (Magenta, Ocean, Forest, Turquoise, Carmine, Brown, Mono...)
- **Mode Toggle** — Light/Dark mode switch with filtered theme dropdown
- **Editor Settings** — Font size, line height, max width, frontmatter toggle
- **Sidebar Settings** — Sort by name/type, hide patterns, custom folder order, vault root path
- **Header Settings** — Date/time display with format options (FR/EN/ISO)
- **General Settings** — Auto-save delay, daily notes folder configuration
- **Dashboard Layout** — Compact, spacious, or minimal views

### Cloud Sync (Phase 12)
- **Settings Sync** — Automatic sync to GitHub (`.obsidian-web/settings-{desktop,mobile}.json`)
- **Separate Profiles** — Desktop and mobile settings stored independently
- **Auto Detection** — Automatic mobile device detection via user agent
- **Vault Root Path** — Define custom root folder for vaults in subfolders (e.g., `MonVault/`)

### Obsidian-like Features (Phase 10)
- **Quick Switcher** — Ctrl+P to instantly search and navigate to any note
- **Tags Explorer** — `/tags` page with tag cloud and note filtering
- **Daily Notes** — Calendar button creates/opens today's note (YYYY-MM-DD)
- **Templates** — Select template when creating new notes
- **Backlinks Panel** — See all notes linking to the current note
- **Version History** — View git commit history for any file

### Productivity
- **Export** — Download as .md, print/PDF via jspdf
- **Import** — Drag & drop .md files with folder selection
- **Copy Code** — One-click copy for code blocks
- **Markdown Cheatsheet** — Quick reference bar in editor
- **Folder Explorer** — Dedicated `/folder` route for vault exploration

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4 |
| UI Components | Radix UI + shadcn/ui |
| State Management | Zustand |
| Auth | NextAuth.js (GitHub OAuth) |
| Editor | CodeMirror 6 |
| Markdown | react-markdown + remark/rehype |
| Graph | D3.js (lazy-loaded) |
| Canvas | React Flow (@xyflow/react) |
| PDF | react-pdf |
| Search | Fuse.js |
| PWA | @ducanh2912/next-pwa |

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- GitHub OAuth App credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-web.git
cd obsidian-web

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development server
pnpm dev
```

### Environment Variables

Create a `.env.local` file with the following:

```env
# GitHub OAuth (create at https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key  # Generate with: openssl rand -base64 32
```

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set **Homepage URL**: `http://localhost:3000`
4. Set **Callback URL**: `http://localhost:3000/api/auth/callback/github`
5. Copy Client ID and Client Secret to `.env.local`

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Protected routes
│   │   ├── note/          # Note viewer/editor
│   │   ├── file/          # File viewer (images, PDFs)
│   │   ├── canvas/        # Canvas viewer
│   │   ├── graph/         # Graph view (D3)
│   │   ├── folder/        # Folder explorer
│   │   ├── tags/          # Tags explorer (P10)
│   │   ├── settings/      # Settings page
│   │   └── profile/       # User profile
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   └── github/        # GitHub API proxy
│   │       ├── tree/      # Vault structure
│   │       ├── read/      # File content
│   │       ├── save/      # Save file
│   │       ├── graph/     # Graph data
│   │       ├── activity/  # Commit history
│   │       ├── backlinks/ # Backlinks (P10)
│   │       ├── tags/      # Tags list (P10)
│   │       ├── templates/ # Templates list (P10)
│   │       ├── history/   # Version history (P10)
│   │       └── settings/  # Cloud settings sync (P12)
│   └── layout.tsx         # Root layout
├── components/
│   ├── dashboard/         # Dashboard widgets (mini-graph, activity-heatmap)
│   ├── dialogs/           # Generic dialog components (form, confirm)
│   ├── editor/            # CodeMirror editor
│   ├── graph/             # D3 force graph + settings popover
│   ├── lock/              # PIN lock dialogs
│   ├── navigation/        # Sidebar, header
│   ├── notes/             # CRUD dialogs
│   ├── ui/                # shadcn/ui components
│   └── viewer/            # Markdown, image, PDF, canvas viewers
├── hooks/                 # Custom React hooks (9 hooks)
│   ├── use-note-data.ts   # Note fetching + offline cache
│   ├── use-note-editor.ts # Editor state management
│   ├── use-note-export.ts # MD/PDF export
│   ├── use-dialog-action.ts # Dialog async actions
│   ├── use-settings-sync.ts # Cloud settings sync (P12)
│   └── ...                # See docs/ARCHITECTURE.md
├── services/              # API clients
│   └── github-client.ts   # Centralized GitHub API
├── lib/                   # Utilities
│   ├── github.ts          # Server-side GitHub (Octokit)
│   ├── note-cache.ts      # Offline cache
│   ├── tree-cache.ts      # Tree cache for offline nav
│   ├── store.ts           # Zustand vault store
│   ├── settings-store.ts  # Zustand settings store
│   ├── pinned-store.ts    # Zustand pinned notes store
│   └── utils.ts           # General utilities
├── types/                 # TypeScript types
└── docs/                  # Documentation
    └── ARCHITECTURE.md    # Architecture & patterns
```

## Scripts

```bash
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Update GitHub OAuth callback URL to production domain

### Docker

```bash
docker build -t obsidian-web .
docker run -p 3000:3000 --env-file .env.local obsidian-web
```

## Architecture

For detailed information about the codebase architecture, custom hooks, and optimization patterns, see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

Key highlights:
- **9 Custom Hooks** — Extracted from monolithic components
- **Centralized API Client** — `githubClient` for all GitHub operations
- **Offline-first** — Cache API for notes and file tree
- **Cloud Sync** — Settings synced to GitHub with desktop/mobile profiles
- **React.memo** — Optimized heavy components (ForceGraph, MarkdownRenderer)

## Development Workflow

### Branch Strategy

| Branch | Purpose | Vercel Environment |
|--------|---------|-------------------|
| `main` | Production — stable releases only | **Production** (`obsidian-web.vercel.app`) |
| `dev` | Development — testing & features | **Preview** (`obsidian-web-git-dev-*.vercel.app`) |

### Workflow

```bash
# Always work on dev branch
git checkout dev

# Make changes, commit, push
git add -A && git commit -m "feat: new feature" && git push

# Test on preview URL (auto-generated by Vercel)
# https://obsidian-web-git-dev-kikii95s-projects.vercel.app

# When validated → merge to production
git checkout main
git merge dev
git push

# Back to dev for next feature
git checkout dev
```

### Quick Commands

```bash
# Switch to dev
git checkout dev

# Push to preview (auto-deploy)
git push

# Deploy to production
git checkout main && git merge dev && git push && git checkout dev
```

## Contributing

1. Fork the repository
2. Create a feature branch from `dev` (`git checkout dev && git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request targeting `dev` branch

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with Next.js and deployed on Vercel.
