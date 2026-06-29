# 26 — Master Package Index

**Sistema:** Mineros Broadcast  
**Documento:** `26-master-package-index.md`  
**Versión:** `1.0.0`  
**Estado:** ÍNDICE FINAL EN REVISIÓN  
**Propietario:** Club Mineros de Santiago  
**Desarrollado por:** Merchise  

---

## 0. Propósito

Este documento consolida el paquete completo de especificación de **Mineros Broadcast**.

> Nota de implementación (2026-06-28): Estructura consolidada en `apps/studio` — server Express + panel operador React en `/control` bajo una única aplicación isomórfica.

Debe responder:

```text
¿Qué documentos existen, qué assets acompañan cada módulo y cuál es el orden de implementación?
```

---

## 1. Documentos del paquete

| Archivo | Descripción |
|---|---|
| `01-layout-manager.md` | Documento de especificación del módulo `01` |
| `02-design-system(2).md` | Documento de especificación del módulo `02` |
| `02-design-system.md` | Documento de especificación del módulo `02` |
| `03-asset-manager.md` | Documento de especificación del módulo `03` |
| `04-game-engine.md` | Documento de especificación del módulo `04` |
| `05-sponsor-engine.md` | Documento de especificación del módulo `05` |
| `06-event-engine.md` | Documento de especificación del módulo `06` |
| `07-scene-engine.md` | Documento de especificación del módulo `07` |
| `08-overlay-manager.md` | Documento de especificación del módulo `08` |
| `09-integration-contracts.md` | Documento de especificación del módulo `09` |
| `10-scorebug.md` | Documento de especificación del módulo `10` |
| `11-batter-overlay.md` | Documento de especificación del módulo `11` |
| `12-lineup.md` | Documento de especificación del módulo `12` |
| `13-next-batters.md` | Documento de especificación del módulo `13` |
| `14-pitcher-overlay.md` | Documento de especificación del módulo `14` |
| `15-substitution-overlay.md` | Documento de especificación del módulo `15` |
| `16-game-event-overlay.md` | Documento de especificación del módulo `16` |
| `17-inning-transition.md` | Documento de especificación del módulo `17` |
| `18-final-score-overlay.md` | Documento de especificación del módulo `18` |
| `19-sponsor-break-overlay.md` | Documento de especificación del módulo `19` |
| `20-announcement-overlay.md` | Documento de especificación del módulo `20` |
| `21-social-lower-third.md` | Documento de especificación del módulo `21` |
| `22-countdown-overlay.md` | Documento de especificación del módulo `22` |
| `23-overlay-lifecycle.md` | Documento de especificación del módulo `23` |
| `24-operator-control-panel.md` | Documento de especificación del módulo `24` |
| `25-qa-acceptance-checklist.md` | Documento de especificación del módulo `25` |

---

## 2. Carpetas de assets detectadas

| Carpeta | Contenido |
|---|---|
| `02-design-system-assets/` | 1 assets gráficos |
| `03-asset-manager-assets/` | 3 assets gráficos |
| `04-game-engine-assets/` | 1 assets gráficos |
| `05-sponsor-engine-assets/` | 1 assets gráficos |
| `06-event-engine-assets/` | 1 assets gráficos |
| `07-scene-engine-assets/` | 1 assets gráficos |
| `08-overlay-manager-assets/` | 1 assets gráficos |
| `09-integration-contracts-assets/` | 1 assets gráficos |
| `10-scorebug-assets/` | 4 assets gráficos |
| `11-batter-overlay-assets/` | 2 assets gráficos |
| `12-lineup-assets/` | 14 assets gráficos |
| `13-next-batters-assets/` | 7 assets gráficos |
| `14-pitcher-overlay-assets/` | 6 assets gráficos |
| `15-substitution-overlay-assets/` | 4 assets gráficos |
| `16-game-event-overlay-assets/` | 4 assets gráficos |
| `17-inning-transition-assets/` | 4 assets gráficos |
| `18-final-score-overlay-assets/` | 4 assets gráficos |
| `19-sponsor-break-overlay-assets/` | 5 assets gráficos |
| `20-announcement-overlay-assets/` | 4 assets gráficos |
| `21-social-lower-third-assets/` | 4 assets gráficos |
| `22-countdown-overlay-assets/` | 4 assets gráficos |
| `23-overlay-lifecycle-assets/` | 4 assets gráficos |
| `24-operator-control-panel-assets/` | 4 assets gráficos |
| `25-qa-acceptance-checklist-assets/` | 4 assets gráficos |
| `mineros-design-assets/` | 6 assets gráficos |

---

## 3. Orden recomendado de implementación

| Fase | Módulos |
|---|---|
| Fase 1 — Base visual | `02-design-system`, `03-asset-manager`, `10-scorebug` |
| Fase 2 — Núcleo operativo | `01-layout-manager`, `04-game-engine`, `08-overlay-manager`, `09-integration-contracts` |
| Fase 3 — Overlays de juego | `11-batter-overlay`, `12-lineup`, `13-next-batters`, `14-pitcher-overlay`, `15-substitution-overlay`, `16-game-event-overlay` |
| Fase 4 — Transición y cierre | `17-inning-transition`, `18-final-score-overlay` |
| Fase 5 — Comunicación y sponsor | `19-sponsor-break-overlay`, `20-announcement-overlay`, `21-social-lower-third`, `22-countdown-overlay` |
| Fase 6 — Operación y QA | `23-overlay-lifecycle`, `24-operator-control-panel`, `25-qa-acceptance-checklist` |

---

## 4. Regla de calidad visual

Todo overlay debe validarse contra el Scorebug aprobado antes de marcarse como cerrado.

```text
Si no parece parte del sistema Scorebug, no se aprueba.
```

---

## 5. Estados de cierre

| Estado | Significado |
|---|---|
| Candidato visual en revisión | Tiene gráfica, pero requiere revisión |
| Candidato funcional en revisión | Tiene reglas y contrato, puede requerir gráfica |
| Candidato final en revisión | Listo para QA |
| Cerrado para implementación | Aprobado por usuario y checklist crítico |

---

## 6. Pendientes recomendados

1. revisar visualmente cada `FIG-001`;
2. corregir textos cortados;
3. confirmar logos oficiales;
4. marcar módulos aprobados;
5. empaquetar zip final;
6. iniciar implementación por fases.

---

# Historial

| Versión | Estado | Descripción |
|---|---|---|
| 1.0.0 | Índice final en revisión | Consolidación del paquete de documentos y assets |
