# AGENTS.md — Eteya Social Manager

> AI-coding-agent context for this repo. Read this BEFORE making changes.

## What this is

Fork of [Postiz](https://github.com/gitroomhq/postiz-app) (AGPL-3.0), customized for Eteya's content pipeline. See [FORK-CHANGELOG.md](./FORK-CHANGELOG.md) for diff vs upstream.

## Tech stack

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind 3 + Phosphor Icons
- **Backend:** NestJS (apps/backend) + NestJS Orchestrator (apps/orchestrator, Temporal workflows)
- **Data:** Postgres + Redis + Temporal
- **Package manager:** pnpm workspaces (NEVER npm/yarn)
- **External:** n8n (content generation), eteya-carousel-service (Puppeteer)
- **Languages:** TypeScript strict-mode, Swedish UI strings

## Commands

```bash
pnpm install                          # install deps (root only)
pnpm dev                              # all apps via Nx
pnpm run dev:frontend                 # just frontend (port 4200)
pnpm run dev:backend                  # just backend (port 3000)
pnpm lint                             # ESLint (root only — sub-packages don't lint independently)
pnpm typecheck                        # TS check
pnpm test                             # Jest
docker compose -f docker-compose.dev.yaml up   # local containers
```

## File structure

- `apps/frontend/` — Next.js. Routing in `src/app/`. Components in `src/components/`.
- `apps/backend/` — NestJS API. Pattern: **Controller → Service → Repository** (no shortcuts).
- `apps/orchestrator/` — Temporal workflows + activities.
- `libraries/` — shared code (services, helpers, react-shared-libraries with i18n).

### Custom Eteya code (NOT in upstream)

- `apps/frontend/src/app/(app)/(site)/generate/` — Generera-flik (custom content-engine UI)
- `apps/frontend/src/app/(app)/api/preview-content/` — proxy → n8n preview-workflow
- `apps/frontend/src/app/(app)/api/preview-status/` — poll n8n executions API
- `apps/frontend/src/app/(app)/api/approve-content/` — proxy → n8n approve-workflow
- `apps/frontend/src/app/(app)/api/approve-status/` — poll n8n executions API
- `apps/frontend/src/app/(app)/api/generate-content/` — legacy synkron content-trigger
- `apps/frontend/src/components/generate/` — UI components för flow
- `apps/frontend/src/components/auth/` — custom auth (single-panel + LoginWithOidc feature-flag)
- `apps/frontend/src/app/(app)/auth/layout.tsx` — Eteya auth-layout
- `apps/frontend/src/components/ui/logo-text.component.tsx` — ETEYA wordmark
- `apps/frontend/src/app/(provider)/layout.tsx` — `language="sv"` override
- `apps/frontend/src/components/onboarding/onboarding.modal.tsx` — Postiz step-2 skipped
- `var/docker/nginx.conf` — proxy locations för Eteya routes
- `libraries/react-shared-libraries/src/translation/locales/sv/translation.json` — sv-strings
- `libraries/react-shared-libraries/src/translation/i18n.config.ts` — `fallbackLng = 'sv'`

## Key conventions

- **Frontend data:** SWR via `useFetch` hook from `libraries/helpers/src/utils/custom.fetch.tsx`. Each `useSWR` must be in its OWN hook to satisfy react-hooks/rules-of-hooks. NEVER `eslint-disable-next-line` it.
- **Backend:** Controller is thin — most logic lives in `libs/server/`. Pass all 3 layers (Controller → Service → Repository).
- **Styling:** Tailwind 3. Check `apps/frontend/src/app/colors.scss` (Eteya tokens) + `tailwind.config.cjs` BEFORE writing CSS. `--color-custom*` tokens are DEPRECATED.
- **Icons:** Phosphor Light (`@phosphor-icons/react`) — NOT Lucide. Lucide imports remain in upstream-files we haven't touched.
- **Fonts:** Bebas Neue (display/brand), Geist (body), Barlow Condensed (UI).
- **i18n:** All user-facing strings in Swedish. `fallbackLng = 'sv'`. Translation file at `libraries/react-shared-libraries/src/translation/locales/sv/translation.json`.

## Git workflow

- Default branch: `main`.
- Conventional Commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`, etc. Scope = `rebrand`, `generate`, `auth`, `i18n`, etc.
- Commits may be in Swedish or English — recent rebrand-commits use Swedish phase-numbering (`Fas 4.6 — Auth: ...`).
- DO NOT rebase against upstream Postiz without consulting FORK-CHANGELOG sync-policy.

## Deployment

- **Production:** `social.eteya.ai` — image `eteya-postiz:1.0.x` (image-tag managed manually in `/opt/eteya/postiz/docker-compose.yml`)
- **Dev:** `social-dev.eteya.ai` — image `eteya-postiz:rebrand-fasX.X` (testing-instans)
- Postiz shares DB + Redis between dev and prod (be careful with schema-changes)
- Cloudflare Tunnel routes both subdomains via `eteya-services-01` tunnel

## Boundaries

- **Always:** Run `pnpm lint` + `pnpm typecheck` before commit. Update FORK-CHANGELOG.md when you add/change custom code. Quote bracketed paths in shell (zsh interprets `(app)` as glob).
- **Ask first:** Adding new npm dependency. Modifying upstream-Postiz files (check `git blame` — if last touched by `gitroomhq`, ask). Touching `LICENSE` or `package.json` engines. Database schema changes.
- **Never:** Commit secrets (.env). Use npm/yarn (pnpm only). Install frontend libraries that duplicate existing UI (write native components). Modify `/libraries/` upstream services without strong reason. Push to `gitroomhq/postiz-app` (this is our fork).

## Ecosystem — where this fits

This repo is part of **Eteya Social Stack**, a multi-component system:

- **`postiz-eteya/`** ← YOU ARE HERE (public — `github.com/filipthai94-hub/postiz-eteya`)
- **`eteya-carousel-service`** — Puppeteer microservice for carousel-image rendering (called by n8n)
- **`n8n`** — workflow engine that calls our `/api/preview-content` + `/api/approve-content` routes
- **`blueprints/`** — content rules per platform (LinkedIn, IG, FB, Threads, X, Bluesky)
- **`branding/`** — Eteya logos, fonts, design tokens

The parent monorepo lives at `github.com/filipthai94-hub/social-stack` (**private** — request access from Filip if needed).

## Where to dig deeper

- Architecture pipeline (full): `social-stack/docs/ARCHITECTURE.md` (parent repo)
- Per-platform content rules: `social-stack/blueprints/` (parent repo)
- Postiz upstream conventions: [docs.postiz.com](https://docs.postiz.com)
- Custom fork-changes: [FORK-CHANGELOG.md](./FORK-CHANGELOG.md) (this repo)

## Out of scope (don't touch unless asked)

- `apps/orchestrator/` Temporal workflows — production-critical, change-control needed
- `Jenkins/` — legacy CI from upstream, ignore
- `dynamicconfig/` — Temporal config, ignore
- `.coderabbit.yaml` — code review bot config, ignore
