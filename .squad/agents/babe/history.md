# Historial — Babe (Lead / Arquitecto)

## Contexto inicial — 2026-06-23

**Proyecto:** Mineros Broadcast  
**Solicitado por:** luison  
**Descripción:** Sistema de overlays para transmisión de béisbol en vivo del Club Mineros de Santiago. 26 módulos especificados, arquitectura event-driven con 8 motores + 13 overlays + control panel de operador.

**Stack:**  Turborepo + pnpm | React + TypeScript + Vite + Tailwind | Supabase + Vercel | GitHub Actions | Vitest + Playwright

**Arquitectura:** Layout Manager orquesta zonas y Preview/Program. Game Engine es fuente de verdad deportiva. Asset Manager es fuente de verdad visual. Event Engine transforma eventos en acciones visuales. Todos los componentes se comunican mediante envelopes explícitos (IC-003).

**Idioma:** Español en todas las respuestas.
