# Eteya Postiz Fork — Changelog

Custom-ändringar från [upstream Postiz](https://github.com/gitroomhq/postiz-app).

**Format:** [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) + [Conventional Commits](https://www.conventionalcommits.org/)

---

## [1.0.3] — 2026-05-12

### Added
- **Docs: agent-ready repo** — `README.md`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md` skrivna för 2026 standard (AGENTS.md spec from Linux Foundation, <150 rader).
- **Fas 4.7 — Skip Postiz YouTube-tutorial onboarding step**
  - `apps/frontend/src/components/onboarding/onboarding.modal.tsx` — step 2 wrappad i `{false && ...}` så användare direkt går till Calendar efter "Anslut kanaler"

### Changed
- **Onboarding-modal CTA-knappar** — purple gradient → Eteya lime (`bg-etLimeCore hover:bg-etLimeDeep text-etBgCanvas`)

---

## [1.0.0–1.0.2] — 2026-05-11/12 (Fas 4 Auth-rebrand)

### Added
- **Fas 4 — Auth-rebrand: single-panel Linear/Vercel-stil**
  - `apps/frontend/src/app/(app)/auth/layout.tsx` — refactor från 2-panel split → single-panel centered (max-w-420px)
  - `apps/frontend/src/components/ui/logo-text.component.tsx` — ETEYA© wordmark (Bebas Neue, 42px)
  - `apps/frontend/src/app/(provider)/layout.tsx` — `language="sv"` override
  - `libraries/react-shared-libraries/src/translation/i18n.config.ts` — `fallbackLng = 'sv'`
- **Fas 4.5 — Dölj OAuth-providers**
  - `apps/frontend/src/components/auth/login.tsx` + `register.tsx` — OAuth-providers (Authentik/Google/GitHub) gömda via `{false && ...}` feature-flag
  - `apps/frontend/src/components/auth/login.with.oidc.tsx` — feature-flag för enterprise SSO
- **Fas 4.6 — Fix disabled-state layout**
  - `auth/layout.tsx` flex → flex-col w-full (fixar trasig layout när `DISABLE_REGISTRATION=true`)

### Changed
- **`(app)/auth/layout.tsx`** — tagline borttagen ("1 ämne in. 6 plattformar ut.")
- **`register.tsx` + `login.tsx`** — H1 40px/500 → 28px/600, tighter spacing, h-48 CTA-knapp
- **PROD .env** — `DISABLE_REGISTRATION=true → false` (öppna för kunder)

---

## [0.3.0] — 2026-05-09

### Added
- **PHASE 7D — Async approve polling-pattern**
  - Ny route: `apps/frontend/src/app/(app)/api/approve-status/route.ts` (GET)
    - Pollar n8n executions API var 5:e sek tills `finished=true`
    - Matchar via `request_id` i Set Input runData
  - `nginx.conf`: ny location `/api/approve-status` → `localhost:4200`
  - `N8N_API_KEY` env-var till Postiz container (krävs för polling)
  - Frontend polling-loop i `apps/frontend/src/components/generate/generate.content.tsx`

### Changed
- **`apps/frontend/src/app/(app)/api/approve-content/route.ts`**
  - `maxDuration: 240 → 30` (n8n returnerar nu omedelbart)
  - AbortController-timeout `230s → 15s`
  - Frontend-polling tar över ansvaret för att vänta på workflow-completion

### Fixed
- **HTTP 524 Gateway Timeout vid Approve** (Cloudflare 100s cap < 3min workflow)
  - Lösning: webhook responseMode "onReceived" + frontend-polling

---

## [0.2.0] — 2026-05-09

### Added
- **PHASE 7C — Preview-mode flow (2-stage approval)**
  - Ny route: `apps/frontend/src/app/(app)/api/preview-content/route.ts` (POST)
  - Ny komponent: `apps/frontend/src/components/generate/preview.card.tsx`
  - State-machine i `generate.content.tsx`: idle → previewing → reviewing → approving → done/error
  - 6 platform-specifika char-limits + smart-trim warning
  - UUID v4 för `request_id` (idempotency)
  - Per-platform "Selected" checkboxes
  - Cost-signaling i UI

### Changed
- **`apps/frontend/src/components/generate/generate.content.tsx`** — major rewrite från 1-stage till 2-stage flow

---

## [0.1.0] — 2026-05-08

### Added
- **PHASE 7A-B — Postiz migration till VPS + Custom Generera-flik**
  - Migrate Postiz Mac → Hetzner VPS (`/opt/eteya/postiz/`)
  - Ny route: `apps/frontend/src/app/(app)/(site)/generate/page.tsx`
  - Ny route: `apps/frontend/src/app/(app)/(site)/generate/layout.tsx`
  - Ny route: `apps/frontend/src/app/(app)/api/generate-content/route.ts` (legacy)
  - Top-menu item: "Generera" (Lucide Sparkles icon)
  - Eteya Black Lime-tema (#050607 + #C8FF00)
  - Svenska translation-strings i `libraries/react-shared-libraries/src/translation/locales/sv/translation.json`

### Changed
- `var/docker/nginx.conf` — location-blocks för `/api/preview-content`, `/api/approve-content`, `/api/generate-content` (innan catch-all `/api/`)
- `Dockerfile.dev` — `NODE_OPTIONS=--max-old-space-size=6144`, `SENTRY_AUTH_TOKEN=""`, `SENTRY_DISABLE_AUTO_UPLOAD=true`
- `apps/frontend/src/components/layout/dubAnalytics.tsx` — explicit return-types för TS strict-mode

### Configured
- VPS env: `N8N_GENERATE_WEBHOOK_URL`, `N8N_PREVIEW_WEBHOOK_URL`, `N8N_APPROVE_WEBHOOK_URL`, `N8N_SHARED_SECRET`, `N8N_API_KEY`
- Cloudflare Tunnel route: `social.eteya.ai` → VPS-tunnel `eteya-services-01`

---

## Pågående customizations (sammanfattat)

### Custom routes (alla under `apps/frontend/src/app/(app)/api/`)
1. `preview-content/route.ts` — POST, proxy till n8n preview-workflow (~30s respons)
2. `approve-content/route.ts` — POST, proxy till n8n approve-webhook (~25ms async respons)
3. `approve-status/route.ts` — GET med `runId` query, pollar n8n executions API
4. `generate-content/route.ts` — POST, legacy direkt-trigger (kvar för compat)

### Custom UI
- Top-menu item "Generera" (Sparkles-ikon, position efter Calendar)
- `/generate`-sida med 2-stage Preview→Approve flow
- Preview-cards med inline-edit + char-counter + per-platform checkboxes

### Custom Docker config
- Image: `eteya-postiz:latest` (built from `Dockerfile.dev`)
- Compose env: alla N8N_* + Postiz-specifika OAuth-credentials
- Network: shared `n8n_eteya-net` Docker-network med carousel-service och n8n

### Branding
- Black Lime-tema applicerat genom CSS overrides
- (Future PHASE 7B': full UI-rebrand av Postiz components)

---

## Sync-policy med upstream

**Status:** Vi är en HARD FORK — har INTE rebased mot upstream sedan 2026-05-08.

**Rebase-strategi:**
- Custom routes ligger i `apps/frontend/src/app/(app)/api/` — minimal kollision-risk med upstream
- Custom UI-component i `components/generate/` — egen mapp, ingen upstream-mapp
- Modified files (`top.menu.tsx`, `dubAnalytics.tsx`, `nginx.conf`, `Dockerfile.dev`, sv-translation.json) — kräver care vid rebase

**När rebase:** Vid security-patches eller större Postiz-features vi vill ha. Annars hold position.

---

## Relaterade docs

- [`/docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — end-to-end pipeline
- [`/CHANGELOG.md`](../CHANGELOG.md) — root changelog för hela social-stack
- [`/blueprints/HASHTAG-POLICY.md`](../blueprints/HASHTAG-POLICY.md) — content-policies som UI:t respekterar
