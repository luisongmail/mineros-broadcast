# Squad Team

> Mineros Broadcast — Sistema de overlays para transmisión de béisbol en vivo

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Enruta trabajo, impone handoffs y revisión. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Babe | Lead / Arquitecto | .squad/agents/babe/charter.md | ✅ active |
| Sandy | Backend Engineer | .squad/agents/sandy/charter.md | ✅ active |
| Jeter | Frontend Engineer | .squad/agents/jeter/charter.md | ✅ active |
| Mariano | QA / Tester | .squad/agents/mariano/charter.md | ✅ active |
| Robinson | Infrastructure / DevOps | .squad/agents/robinson/charter.md | ✅ active |
| Scribe | Session Logger | .squad/agents/scribe/charter.md | ✅ active |
| Ralph | Work Monitor | .squad/agents/ralph/charter.md | ✅ active |
| Rai | RAI Reviewer | .squad/agents/Rai/charter.md | ✅ active |

## Project Context

- **Project:** Mineros Broadcast
- **Owner:** Club Mineros de Santiago / Merchise
- **Created:** 2026-06-23
- **Requested by:** luison

## Tech Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend / Overlays:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth OTP + Realtime + Storage)
- **Deploy:** Vercel (frontend) + Supabase (backend) — 100% gratuito
- **CI/CD:** GitHub Actions
- **Testing:** Vitest (unit) + Playwright (e2e)
- **Target:** Browser Source para OBS / Meld Studio + SPA operador (PC + móvil)

## Idioma de trabajo

Todas las respuestas del equipo deben ser en **español**.
