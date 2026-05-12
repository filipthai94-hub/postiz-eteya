# CLAUDE.md

> Claude Code-specific overrides. Primary instructions live in [AGENTS.md](./AGENTS.md).

@AGENTS.md

## Claude Code specifics

- **Compaction:** Long /generate-debug sessions — keep FORK-CHANGELOG.md and AGENTS.md in context, drop everything else.
- **Permissions:** `pnpm`, `docker compose`, `gh`, `git`, `psql` (read-only) are pre-approved. Production deploys via `ssh root@<vps>` require explicit user-confirmation each time.
- **MCP:** Use the github MCP for issues/PRs. Don't use Supabase MCP — this repo doesn't touch Supabase.
- **Language:** Filip is Swedish — reply in Swedish unless he switches to English. Code comments stay in English.

## Path-scoped overrides

- `/apps/frontend/` — UI work. Phosphor Light icons (not Lucide). Eteya design tokens (etBgCanvas, etLimeCore etc).
- `/apps/backend/` — strictly follow Controller → Service → Repository.
- `/apps/orchestrator/` — DO NOT touch without explicit user confirmation (production Temporal workflows).

## Hard preferences (from user memory)

- Never guess — verify against code, not against audit reports or summaries.
- Open-source / free tools preferred over paid alternatives.
- Use complete tools, don't build from scratch when something exists.
- Auto mode: execute low-risk work immediately, ask before destructive actions.
