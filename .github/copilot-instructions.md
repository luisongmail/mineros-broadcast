# Copilot Instructions — Mineros Broadcast

**Sistema de overlays para transmisión de béisbol en vivo — Club Mineros de Santiago**  
Stack: Turborepo + pnpm | React + TypeScript + Vite + Tailwind | Supabase + Vercel | Vitest + Playwright

## Estructura del monorepo

```
packages/core/              → Contratos IC-003, tipos, envelopes (fuente: 09-integration-contracts.md)
packages/design-system/     → Tokens visuales y componentes base (fuente: 02-design-system.md)
packages/asset-manager/     → Motor de assets, fuente única de verdad visual (fuente: 03-asset-manager.md)
packages/game-engine/       → Motor deportivo, fuente única de verdad deportiva (fuente: 04-game-engine.md)
packages/sponsor-engine/    → Reglas comerciales (fuente: 05-sponsor-engine.md)
packages/event-engine/      → Transforma eventos deportivos en acciones (fuente: 06-event-engine.md)
packages/scene-engine/      → Gestión de escenas de transmisión (fuente: 07-scene-engine.md)
packages/overlay-manager/   → Orquestador de renders (fuente: 08-overlay-manager.md)
packages/layout-manager/    → Orquestador visual — zonas, Preview/Program (fuente: 01-layout-manager.md)
packages/overlays/{name}/   → Overlays individuales (fuentes: 10-22)
apps/overlay-server/        → Browser Source + panel del operador real en `/control` (fuente: 24)
infra/supabase/             → Migraciones PostgreSQL + seed
docs/requirements/          → Especificaciones originales (NO modificar — 26 documentos aprobados)
```

## Documentos de requerimientos (`docs/requirements/`)

Antes de implementar cualquier módulo, leer el documento correspondiente. Son la fuente de verdad del sistema.

| Archivo | Módulo | Estado |
|---------|--------|--------|
| `00-master-index.md` | Índice maestro + principios del sistema | APROBADO |
| `01-layout-manager.md` | Layout Manager — zonas, Preview/Program, perfiles | CERRADO |
| `02-design-system.md` | Design System — paleta, tipografías, grid, safe area | CERRADO |
| `03-asset-manager.md` | Asset Manager — flujo de vida, metadata, assetId | CERRADO |
| `04-game-engine.md` | Game Engine — estado deportivo, comandos, eventos, auditoría | CERRADO |
| `05-sponsor-engine.md` | Sponsor Engine — campañas, placements, vigencias | CERRADO |
| `06-event-engine.md` | Event Engine — eventos → acciones visuales/comerciales | CERRADO |
| `07-scene-engine.md` | Scene Engine — catálogo de escenas, transiciones | CERRADO |
| `08-overlay-manager.md` | Overlay Manager — contrato de render, estados | CERRADO |
| `09-integration-contracts.md` | Contratos de integración — envelope IC-003, tipos de mensaje | CERRADO |
| `10-scorebug.md` | Overlay Scorebug — marcador permanente | CERRADO |
| `11-batter-overlay.md` | Overlay Bateador | CERRADO |
| `12-lineup.md` | Overlay Lineup | CERRADO |
| `13-next-batters.md` | Overlay Próximos Bateadores | CERRADO |
| `14-pitcher-overlay.md` | Overlay Pitcher | CERRADO |
| `15-substitution-overlay.md` | Overlay Sustitución | CERRADO |
| `16-game-event-overlay.md` | Overlay Evento de Juego | CERRADO |
| `17-inning-transition.md` | Overlay Transición de Entrada | CERRADO |
| `18-final-score-overlay.md` | Overlay Marcador Final | CERRADO |
| `19-sponsor-break-overlay.md` | Overlay Pausa Comercial | CERRADO |
| `20-announcement-overlay.md` | Overlay Anuncio | CERRADO |
| `21-social-lower-third.md` | Overlay Lower Third Social | CERRADO |
| `22-countdown-overlay.md` | Overlay Cuenta Regresiva | CERRADO |
| `23-overlay-lifecycle.md` | Ciclo de vida de overlays | CERRADO |
| `24-operator-control-panel.md` | Panel del Operador — acciones, roles, reglas de seguridad | CERRADO |
| `25-qa-acceptance-checklist.md` | Checklist de aceptación QA | CERRADO |
| `26-master-package-index.md` | Índice final del paquete + orden de implementación | CERRADO |
```

## Comandos

```bash
pnpm install              # instalar dependencias
pnpm turbo build          # compilar todos los paquetes
pnpm turbo test           # tests unitarios (Vitest)
pnpm turbo lint           # lint
pnpm turbo typecheck      # type check
pnpm turbo dev            # modo desarrollo
pnpm changeset            # crear changeset para release semántico
```

## Arquitectura — principios clave

- **Fuente única de verdad deportiva:** Game Engine. Ningún overlay calcula marcador, inning, outs, bases ni conteo.
- **Fuente única de verdad visual:** Asset Manager. Todos los recursos se consumen por `assetId`, nunca por ruta local.
- **Contratos explícitos:** Todo mensaje entre componentes usa el envelope estándar `IC-003`: campos obligatorios `schemaVersion`, `messageType`, `correlationId`, `source`, `target`, `timestamp`, `payload`. Ver `packages/core/src/index.ts`.
- **Flujo visual:** `hidden` → `preview` → (Take) → `live`. Nunca saltar Preview a Program.
- **Canvas:** 1920×1080, Grid 24×12, Safe Area 60px.
- **Overlays independientes:** componentes aislados que consumen datos, no los calculan ni los almacenan.
- **Toda corrección manual se audita** (GE-017): operador, comando, estado anterior, estado nuevo, motivo.

## Design tokens (02-design-system.md)

| Token | Valor |
|-------|-------|
| Mineros Red | `#D71920` |
| Mineros Navy | `#1B2F5B` |
| Mineros Gold | `#D4AF37` |
| Broadcast Black | `#0D0D0D` |
| Tipografía principal | Bebas Neue |
| Tipografía secundaria | Inter / fallback Arial |
| Espaciado base | 4px (escala: 4,8,12,16,24,32,48,64) |
| Bordes | 6px (componentes), 4px (badges), 8px (full screen) |
| Sombra | `0px 2px 8px rgba(0,0,0,.25)` |

## Plan de releases semántico

| Release | Contenido |
|---------|-----------|
| v0.1.0 | Design System tokens + Asset Manager + Scorebug |
| v0.2.0 | Game Engine + Layout Manager + Overlay Manager + Integration Contracts |
| v0.3.0 | Batter, Lineup, Next Batters, Pitcher, Substitution, Game Event overlays |
| v0.4.0 | Inning Transition, Final Score |
| v0.5.0 | Sponsor Break, Announcement, Social Lower Third, Countdown |
| v1.0.0 | Overlay Lifecycle, Control Panel, QA Acceptance Checklist, e2e tests |

## Squad AI Team

This repo uses **Squad** (`create-squad`) to manage an AI agent team. The coordinator lives at `.github/agents/squad.agent.md`. Team roster, routing rules, and decisions are tracked under `.squad/`.

- **Trigger Squad** by talking to the coordinator: _"Squad, build X"_ or _"{AgentName}, fix Y"_
- **Team state files** (`.squad/decisions.md`, `.squad/agents/*/history.md`) are append-only — never rewrite or reorder entries
- **Shared decisions** go to `.squad/decisions/inbox/{agent}-{slug}.md` (drop-box pattern) — Scribe merges them into `decisions.md`
- **Ceremonies** are defined in `.squad/ceremonies.md` — a Design Review runs automatically before any multi-agent task involving 2+ agents on shared systems

## Git Workflow

All feature work branches from `dev`, not `main`.

| Branch | Purpose |
|--------|---------|
| `main` | Stable released code only |
| `dev` | Integration — all feature work lands here |
| `insiders` | Early-access, synced from `dev` |

**Branch naming:** `squad/{issue-number}-{kebab-slug}` — e.g. `squad/42-add-auth`

```bash
# Start issue work
git checkout dev && git pull origin dev
git checkout -b squad/{number}-{slug}

# Open draft PR targeting dev
gh pr create --base dev --title "{description}" --body "Closes #{number}" --draft

# After merge cleanup
git checkout dev && git pull origin dev
git branch -d squad/{number}-{slug}
git push origin --delete squad/{number}-{slug}
```

**Never** branch from `main`, target `main` directly in a PR, or commit directly to `main`/`dev`.

**Parallel issues:** Use `git worktree` (one worktree per issue) rather than branch-switching. Name worktrees `../{repo-name}-{issue-number}`.

## Reviewer Rejection — Strict Lockout

When a reviewer rejects work, the original author is **locked out** of that artifact — they cannot self-revise, advise, or co-author the fix. A different agent must own the revision. Lockout persists through the full revision cycle; if all eligible agents are locked out, escalate to the user.

## MCP State Bridge

The `squad_state` MCP server provides `squad_state_read/write/append/delete/list` tools for agents to persist state without hand-rolling git commits. Configured in `.copilot/mcp-config.json`. Agents must use these tools for mutable `.squad/` state — they must not switch branches or commit squad state directly.
