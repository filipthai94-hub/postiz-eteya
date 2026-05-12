# Eteya Social Manager

> AI-driven social media scheduling for Eteya — built on Postiz.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Upstream: Postiz](https://img.shields.io/badge/upstream-postiz--app-purple)](https://github.com/gitroomhq/postiz-app)
[![Status: production](https://img.shields.io/badge/status-production-green.svg)](https://social.eteya.ai)

Eteya Social Manager är vår fork av [Postiz](https://github.com/gitroomhq/postiz-app), kustom-byggd för Eteyas content-pipeline med n8n-integration, async preview/approve-flow och svensk lokalisering.

**Live:** [social.eteya.ai](https://social.eteya.ai)

---

## Based on

Denna mjukvara är en fork av **[gitroomhq/postiz-app](https://github.com/gitroomhq/postiz-app)** under [AGPL-3.0](./LICENSE). All credit till Postiz-teamet för core-plattformen. Eteya-specifika ändringar dokumenterade i [FORK-CHANGELOG.md](./FORK-CHANGELOG.md).

---

## What's different from upstream

| Område | Upstream Postiz | Eteya fork |
|---|---|---|
| Content-generation | Manual posts | Custom `/generate`-flik som triggar n8n-workflow |
| Approval-flow | Direct post | 2-stage preview → approve med polling |
| Auth-UI | Multi-provider showcase | Single-panel Linear/Vercel-stil, svenska |
| Default locale | Engelska | Svenska (`sv`) |
| Icons | Lucide | Phosphor Light |
| Fonts | Default | Bebas Neue + Geist + Barlow Condensed |
| Design-tokens | Postiz tokens | Eteya Black Lime (#070A0E + #A6D954) |
| OAuth-providers | Visible | Feature-flagged (gömda by default) |
| Onboarding | YouTube tutorial-step | Skipped |

Full diff: [FORK-CHANGELOG.md](./FORK-CHANGELOG.md).

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/filipthai94-hub/postiz-eteya.git
cd postiz-eteya

# 2. Install
pnpm install

# 3. Env
cp .env.example .env  # fyll i N8N_*, DATABASE_URL, REDIS_URL, TEMPORAL_ADDRESS

# 4. Run (dev)
pnpm dev

# 5. Open
open http://localhost:4200
```

Produktion körs i Docker. Se `docker-compose.yaml` + `var/docker/`.

---

## Architecture

```
[Eteya Generera-UI] → POST /api/preview-content
                        ↓
              [n8n preview-workflow] → returnerar draft
                        ↓
              [User reviews + edits]
                        ↓
                   POST /api/approve-content
                        ↓
                   GET /api/approve-status (poll, 5s)
                        ↓
                   [n8n posts via Postiz API → social platforms]
```

**Stack:** Next.js 16 + NestJS + Postgres + Redis + Temporal + n8n + Puppeteer.

---

## Documentation

- [AGENTS.md](./AGENTS.md) — för AI-coding-agents (read this first)
- [CLAUDE.md](./CLAUDE.md) — Claude Code-specifik konfig
- [FORK-CHANGELOG.md](./FORK-CHANGELOG.md) — alla custom-ändringar vs upstream
- [CONTRIBUTING.md](./CONTRIBUTING.md) — contribution policy
- [SECURITY.md](./SECURITY.md) — security policy
- [Postiz docs](https://docs.postiz.com) — upstream documentation

---

## License

[AGPL-3.0](./LICENSE) — samma som upstream Postiz. Modifikationer som tjänar användare över nätverk måste publicera sin källkod.

## Credits

- **[Postiz team](https://github.com/gitroomhq)** — core-plattformen
- **[Eteya](https://eteya.ai)** — fork-customizations
