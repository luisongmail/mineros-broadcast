# Work Routing

Cmmmo decidir quin maneja qu tarea.

## Routing Table

| Tipo de trabajo | Enrutar a | Ejemplos |
|-----------------|-----------|---------|
| Arquitectura, contratos, decisiones de alcance | Babe | Definir interfaces entre motores, resolver conflictos de diseo, revisar PRs |
| Motores backend (Game, Event, Scene, Sponsor, Layout, Overlay Manager) | Sandy | Implementar GE/EE/SE engines, API, DB schema, Supabase Realtime, Auth OTP |
| Overlays visuales, Design System, Control Panel | Jeter | Scorebug, Batter, Lineup, todos los overlays React, UI del operador |
| Tests unitarios, componentes, e2e, revisinnn QA | Mariano | Vitest, Playwright, criterios de aceptacinnn, QA checklist |
| Infra, CI/CD, monorepo, deploy, branch protection | Robinson | Supabase config, Vercel, GitHub Actions, semantic versioning, Changesets |
| Revisinnn de calidad (Reviewer) | Babe + Mariano | Aprobar/rechazar artefactos de otros agentes |
| Session logging | Scribe |  nunca requiere enrutamiento manual |Automtico 
| Revisinnn RAI | Rai | Credenciales, PII, contenido daino, logos protegidos |

## Issue Routing

| Label | Accinnn | Quin |
|-------|--------|-------|
| `squad` | Triaje: analizar issue, asignar label `squad:{miembro}` | Babe |
| `squad:babe` | Tomar el issue y completarlo | Babe |
| `squad:sandy` | Tomar el issue y completarlo | Sandy |
| `squad:jeter` | Tomar el issue y completarlo | Jeter |
| `squad:mariano` | Tomar el issue y completarlo | Mariano |
| `squad:robinson` | Tomar el issue y completarlo | Robinson |

## Reglas

1. **Eager por  spawn de todos los agentes que puedan iniciar trabajo en paralelo.defecto** 
2. **Scribe siempre corre** despus de trabajo sustancial, siempre como `mode: "background"`.
 coordinador responde directamente.** No spawn en quPara release va X?" "
 pick el que tiene el dominio primario.
 fan-out.** Spawn todos los agentes relevantes en paralelo.
6. **Anticipar trabajo downstream.** Si Sandy implementa un motor, Mariano escribe tests simultneamente.
