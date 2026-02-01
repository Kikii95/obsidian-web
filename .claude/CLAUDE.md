# Obsidian Web — Instructions Projet

## 📋 Description

Application web Next.js pour lire/éditer un vault Obsidian stocké sur GitHub. PWA mobile-first avec sync cloud.

## 🛠️ Stack

| Tech | Version | Usage |
|------|---------|-------|
| Next.js | 15 | Framework React SSR |
| TypeScript | 5.x | Typage strict |
| Tailwind CSS | 3.x | Styling |
| PostgreSQL | 16 | Index vault (tags, backlinks, graph) |
| Prisma | 6.x | ORM |
| Zustand | 5.x | State management |
| SWR | 2.x | Data fetching + cache |

## 📂 Structure Clé

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API Routes (GitHub, vault, index)
│   └── (pages)/      # Pages (dashboard, note, graph, etc.)
├── components/       # Composants React
├── hooks/            # Custom hooks (useVaultIndex, useNote, etc.)
├── lib/              # Utilitaires (github.ts, markdown.ts, etc.)
└── data/             # Données statiques (patch-notes.ts, themes.ts)
```

## 📚 Docs à Maintenir

### Docs Git (source) → sync Obsidian

| Doc | Chemin Git | Quand mettre à jour |
|-----|------------|---------------------|
| Backlog | `BACKLOG.md` | Nouvelles tâches/features |
| Roadmap | `ROADMAP.md` | Changement planning/phases |
| Changelog | `CHANGELOG.md` | Chaque release/feature majeure |

### Docs Obsidian-only

| Doc | Chemin Obsidian | Quand mettre à jour |
|-----|-----------------|---------------------|
| Note Projet | `~/obsidian-vault/Projects/Perso/obsidian-web.md` | Vue d'ensemble, liens |
| Logs | `~/obsidian-vault/Projects/Perso/obsidian-web/_Logs/` | Chaque session |

## 🚀 Commandes

```bash
pnpm dev          # Dev server (localhost:3000)
pnpm build        # Build production
pnpm db:push      # Push schema Prisma
pnpm db:studio    # Prisma Studio
```

## ⚠️ Conventions

1. **Patch Notes** : Mettre à jour `src/data/patch-notes.ts` pour chaque feature/fix visible user
2. **API GitHub** : Utiliser `getAuthenticatedContext()` pour toutes les routes API
3. **Index PostgreSQL** : Tags/backlinks/graph passent par l'index (pas d'appels GitHub directs)
4. **Themes** : 36 themes dans `src/data/themes.ts` (18 dark + 18 light)

## 🔗 Liens

- **Prod** : Vercel (deploy auto depuis `main`)
- **Repo** : `anthropics/obsidian-web` (privé)
- **Vault connecté** : `obsidian-vault` (privé)
