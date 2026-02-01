# Obsidian Web

A modern web-based viewer and editor for Obsidian vaults, powered by GitHub as the backend storage.

**Live Demo**: [obsidian-web.vercel.app](https://obsidian-web.vercel.app)

## What is Obsidian Web?

Obsidian Web lets you access your Obsidian vault from any device with a web browser. Your notes stay on GitHub — we just provide the interface to view and edit them.

**Key benefits:**
- Access your notes from any device (phone, tablet, work computer)
- No sync conflicts — GitHub is the single source of truth
- Works offline with PWA support
- Full Obsidian-like experience (graph view, backlinks, tags, daily notes)

### How it works with Obsidian Desktop

```
┌─────────────────┐         ┌─────────────┐         ┌─────────────────┐
│  Obsidian App   │ ──git── │   GitHub    │ ──api── │  Obsidian Web   │
│   (Desktop)     │  push   │    Repo     │  sync   │    (Mobile)     │
└─────────────────┘         └─────────────┘         └─────────────────┘
```

Your vault lives on **GitHub**. You can use:
- **Obsidian desktop app** on your computer (with Git plugin to sync)
- **Obsidian Web** on your phone/tablet (syncs directly with GitHub)

Both read and write to the **same repository** — your notes are always in sync. Edit on desktop, see changes on mobile. Edit on mobile, pull changes on desktop.

**No Obsidian Sync subscription needed.** GitHub is your free sync layer.

## Security & Privacy

**Your data stays yours.** Here's how the security model works:

| Aspect | How it works |
|--------|--------------|
| **Authentication** | GitHub OAuth — you login with your GitHub account |
| **Token Storage** | Your GitHub token is stored in an encrypted JWT cookie, **never** on our servers |
| **Data Access** | We only access repos you explicitly configure — nothing else |
| **No Database** | We don't store your notes, settings, or any data on our servers |
| **Open Source** | Full source code available for audit |

### What permissions are requested?

When you login, GitHub OAuth requests `repo` scope. This allows:
- Reading your vault repository
- Writing changes when you edit notes
- Creating the `.obsidian-web-config` private repo (stores your vault settings)

**We cannot:**
- Access repos you haven't configured
- Read your private repos without your explicit setup
- Store or share your data with third parties

### Self-hosting

Don't trust our hosted version? You can self-host! See [Deployment](#deployment) below.

## Features

### Core
- **GitHub Integration** — OAuth authentication, read/write access to your vault repository
- **Markdown Viewer** — Full GFM support, syntax highlighting, wikilinks resolution
- **CodeMirror Editor** — Syntax highlighting, keyboard shortcuts (Ctrl+S, Esc)
- **File Tree Navigation** — Collapsible folders, search, real-time sync with GitHub
- **PostgreSQL Index** — Tags, backlinks and graph loaded in milliseconds (smart refresh with SHA comparison)

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
- **Images** — Zoom modal with rotation, navigation and download
- **PDF Viewer** — Navigation, zoom, download
- **Canvas Viewer** — Visual editing with React Flow (zoom, pan, minimap)
- **Audio Player** — MP3/WAV playback with speed control (0.5x to 2x)
- **Excalidraw Viewer** — View `.excalidraw` drawings directly

### Privacy & Security
- **Lock System** — Apple Notes-style PIN protection
- **Private Notes** — Support for `#private` tag, `private: true` frontmatter, `_private/` folders
- **Offline Mode** — Cache API for note access without network

### PWA
- **Installable** — Add to home screen on mobile/desktop
- **Service Worker** — Offline fallback page
- **iOS Ready** — Apple touch icons, splash screens

### Customization
- **36 Color Themes** — 18 dark + 18 light themes
- **Mode Toggle** — Light/Dark mode switch
- **Editor Settings** — Font size, line height, max width, frontmatter toggle
- **Sidebar Settings** — Sort by name/type, hide patterns, custom folder order
- **Dashboard Layout** — Compact, spacious, or minimal views

### Obsidian-like Features
- **Quick Switcher** — Ctrl+P to instantly search and navigate to any note
- **Tags Explorer** — `/tags` page with tag cloud and note filtering
- **Daily Notes** — Calendar button creates/opens today's note (YYYY-MM-DD)
- **Templates** — Select template when creating new notes
- **Backlinks Panel** — See all notes linking to the current note
- **Version History** — View git commit history for any file
- **Callouts** — Full support for `[!note]`, `[!warning]`, `[!tip]` with fold
- **Table of Contents** — Auto-generated TOC from headings with navigation
- **Note Stats** — Word count, character count and reading time
- **Frontmatter Viewer** — Collapsible YAML metadata display
- **Keyboard Shortcuts** — Press `?` or `Ctrl+/` to see all shortcuts
- **What's New Modal** — Changelog with full version history

### Productivity
- **Export** — Download as .md, print/PDF
- **Import** — Drag & drop files with folder selection
- **Copy Code** — One-click copy for code blocks
- **Code Block Filename** — Display filename header on code blocks (` ```js title="app.js" `)
- **Copy Note Link** — Copy as wikilink, URL or markdown format
- **Markdown Cheatsheet** — Quick reference bar in editor

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
| Graph | D3.js |
| Canvas | React Flow (@xyflow/react) |
| PDF | react-pdf |
| Search | Fuse.js |
| PWA | @ducanh2912/next-pwa |

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- A GitHub account
- An Obsidian vault stored in a GitHub repository

### Quick Start (Use hosted version)

1. Go to [obsidian-web.vercel.app](https://obsidian-web.vercel.app)
2. Login with GitHub
3. Configure your vault (owner, repo, branch)
4. Done!

**Bonus**: Using the hosted version means you get all updates instantly — just refresh the page to get new features and bug fixes. No rebuild, no redeploy, no hassle.

### Self-Hosting

#### 1. Clone and install

```bash
git clone https://github.com/Kikii95/obsidian-web.git
cd obsidian-web
pnpm install
```

#### 2. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Obsidian Web (or your choice)
   - **Homepage URL**: `http://localhost:3000` (or your domain)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID**
6. Generate a new **Client Secret** and copy it

#### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# GitHub OAuth (from step 2)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key  # Generate with: openssl rand -base64 32
```

#### 4. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)

1. Fork this repository
2. Import on [Vercel](https://vercel.com/new)
3. Add environment variables:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `NEXTAUTH_URL` (your production URL)
   - `NEXTAUTH_SECRET`
4. Deploy
5. Update your GitHub OAuth App callback URL to `https://your-domain.vercel.app/api/auth/callback/github`

### Docker

```bash
docker build -t obsidian-web .
docker run -p 3000:3000 --env-file .env.local obsidian-web
```

## Scripts

```bash
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

## FAQ

### Is my data safe?

Yes. Your notes never leave GitHub. We use GitHub's API to read/write directly to your repository. No data is stored on our servers.

### Can you see my private repositories?

Only if you configure them as your vault. We don't enumerate or access any repos without your explicit configuration.

### What if the service goes down?

Your notes are on GitHub! You can always access them directly or switch to another tool. There's no lock-in.

### Can I use this with a private repository?

Absolutely. Private repos work perfectly. Your GitHub token (stored in your browser) authenticates all requests.

### Does it work on mobile?

Yes! It's a PWA — you can install it on your home screen for an app-like experience.

### What about large files (videos, PDFs)?

GitHub has a **100MB file size limit**. For vaults with large media files, we recommend setting up **Git LFS** (Large File Storage):

1. Install Git LFS: `git lfs install`
2. Track large file types in your vault repo:
   ```bash
   git lfs track "*.mp4"
   git lfs track "*.mov"
   git lfs track "*.pdf"
   git lfs track "*.zip"
   ```
3. Commit the `.gitattributes` file
4. Push your changes

Obsidian Web works transparently with Git LFS — no additional configuration needed on our side.

**Free tier**: GitHub LFS offers 1GB storage + 1GB bandwidth/month for free. [Learn more](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)

## Roadmap

See **[ROADMAP.md](ROADMAP.md)** for:
- Planned features
- Known issues
- Community ideas
- Plugin system proposal

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Bug reports**: [Open an issue](https://github.com/Kikii95/obsidian-web/issues/new)
- **Feature requests**: [Open an issue](https://github.com/Kikii95/obsidian-web/issues/new)

---

Made with Next.js, deployed on Vercel.
