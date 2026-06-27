# Squad Decisions

## Active Decisions

No decisions recorded yet.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction

---

### 2026-06-26: Regla de gobernanza — Estándares irrenunciables

**Decisión:** Los estándares de datos definidos en `docs/requirements/29-professional-data-standards.md` son **irrenunciables**. Ningún agente puede romperlos ni degradarlos sin:
1. Detener el trabajo
2. Presentar justificación al usuario
3. Obtener aprobación explícita antes de continuar

**Estándares protegidos:**

| Estándar | Ámbito | Spec |
|----------|--------|------|
| **MLBAM vocabulario de eventos** | `event_type` en `at_bats` — vocabulario controlado, sin strings libres | §2.3 |
| **MLBAM zona de strike** | Zonas 1-9 / 11-14, calculadas desde coordenadas métricas | §2.2 |
| **MLBAM códigos de pitcheo** | `pitch_class` con códigos FF/SI/FC/SL/CU/CH/RB/DB… | §2.4 |
| **Sistema métrico** | Coordenadas en metros/km/h/cm — NUNCA en pies/mph/pulgadas almacenados | §2.1 |
| **WBSC extensión softball** | Códigos RB/DB/DR/DC reconocidos igual que MLBAM | §2.4 |
| **RunnerOnBase | null** | Bases en stateStore con identidad del corredor — nunca boolean | §4 |
| **API v1 versionada** | Endpoints bajo `/api/v1/` — no mezclar con rutas internas | §6 |

**Ejemplos de violación que REQUIEREN aprobación:**
- Cambiar `event_type` a string libre en lugar de vocabulario controlado
- Almacenar velocidades en mph en vez de km/h
- Quitar `batting_team_id` o `inning_half` de at_bats (pierden trazabilidad MLBAM)
- Agregar un campo `zone` fuera del rango 1-9/11-14
- Revertir bases a `boolean` desde `RunnerOnBase | null`

**Responsable de verificación:** Todo agente que modifique `at_bats`, `pitches`, `baserunning_events`, `game_events`, `stateStore.ts`, `apiV1Router.ts` o cualquier migración SQL.
