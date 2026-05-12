# Security Policy

## Reporting a vulnerability

**Eteya fork-specific issues:** email `security@eteya.ai`. Response within 72h.

**Postiz core issues:** report to upstream — https://github.com/gitroomhq/postiz-app/security.

Do NOT open public GitHub issues for security problems.

## Scope

In-scope for security reports against this fork:

- Eteya custom routes (`apps/frontend/src/app/(app)/api/{preview,approve,generate}-*`)
- Eteya carousel service integration (`../eteya-carousel-service/`)
- n8n webhook handlers and shared secrets
- Custom auth-flow modifications (`apps/frontend/src/components/auth/`)
- Eteya design-tokens / i18n translation layer

**Out of scope:** upstream Postiz core (report to upstream).

## Supported versions

Only the `main` branch is supported. Production runs the latest tagged image (`eteya-postiz:1.x`).

## Disclosure

Reporters are credited unless they prefer anonymity. We follow [responsible disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure).
