# Spec 28 — Eventos de Baserunning Independientes

**Estado:** CERRADO  
**Versión:** 1.0  
**Módulo:** Live Game Scoring — extensión del spec 27  
**Ruta:** `/live-game-scoring` (panel flotante sobre la interfaz existente)

---

## 1. Propósito

Registrar jugadas que mueven corredores en base sin involucrar una acción del bateador actual: wild pitch con avance, passed ball con avance, base robada, caught stealing, balk, pickoff, y errores de tiro o recepción. Incluye la distinción entre carrera limpia (earned) y sucia (unearned).

---

## 2. Definiciones

| Término | Código | Descripción |
|---------|--------|-------------|
| Base robada | `stolen_base` | Corredor avanza durante el pitcheo sin acción del bateador |
| Caught stealing | `caught_stealing` | Corredor es puesto out intentando robar |
| Wild pitch con avance | `wild_pitch_advance` | Lanzamiento descontrolado; corredor(es) avanzan. Carrera = limpia |
| Passed ball con avance | `passed_ball_advance` | Error del receptor al retener; corredor(es) avanzan. Carrera = sucia |
| Balk | `balk` | Movimiento ilegal del pitcher; todos los corredores avanzan 1 base. Carrera = limpia |
| Error de tiro (E-tiro) | `throwing_error` | Tiro fuera de control; corredor avanza extra. Carrera = sucia |
| Error de recepción (E-rec) | `receiving_error` | Fielder pierde un tiro; corredor avanza extra. Carrera = sucia |
| Pickoff out | `pickoff_out` | Pitcher/receptor saca al corredor desprevenido |
| Pickoff error | `pickoff_error` | Intento de pickoff errado; corredor avanza. Carrera = sucia |
| Interferencia del receptor | `catcher_interference` | Bateador avanza a 1ª, corredores forzados avanzan. Carrera = limpia |

---

## 3. Reglas de carrera limpia (earned) vs sucia (unearned)

- **Limpia**: wild pitch, balk, stolen base, catcher interference → el pitcher es responsable
- **Sucia**: passed ball, throwing error, receiving error, pickoff error → el pitcher NO es responsable
- La distinción se registra por corredor individual: `earnedRun: boolean`

---

## 4. Flujo del operador

1. En cualquier momento de la interfaz `/live-game-scoring` hay un botón fijo **"Eventos"** (esquina superior derecha del header)
2. Al pulsarlo se abre un panel lateral derecho (drawer) sin bloquear el flujo actual
3. El panel muestra:
   - Los corredores actualmente en base (R1, R2, R3) más el bateador si no hay at-bat activo
   - Botones de acción rápida por tipo de evento
   - Para cada evento: selector de corredor afectado + base de destino
4. Al confirmar, el evento se persiste y el estado del juego se actualiza

---

## 5. Botones de acción rápida

### Acciones de un corredor específico
```
[SB →2B]  [SB →3B]  [SB →Home]   ← según qué bases están ocupadas
[CS]                               ← caught stealing (corredor queda OUT)
[PO out]                           ← pickoff out
[PO error → +1]                    ← pickoff error, corredor avanza
```

### Acciones globales (todos los corredores)
```
[Balk]          → todos avanzan 1 base (earned)
[WP + avance]   → seleccionar qué corredores avanzan (earned)
[PB + avance]   → seleccionar qué corredores avanzan (unearned)
```

### Errores de tiro/recepción
```
[E-tiro  pos:#]  → input de posición (1-9), corredor afectado + destino (unearned)
[E-rec   pos:#]  → ídem
```

---

## 6. Modelo de datos

### Nueva tabla: `baserunning_events`

```sql
CREATE TABLE IF NOT EXISTS baserunning_events (
  id              BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  game_id         VARCHAR(100)  NOT NULL,
  inning          INT           NOT NULL,
  inning_half     VARCHAR(10)   NOT NULL,
  event_type      VARCHAR(30)   NOT NULL,   -- stolen_base, balk, wild_pitch_advance, etc.
  runner_label    VARCHAR(5)    NOT NULL,   -- R1, R2, R3, BR
  from_base       VARCHAR(5)    NOT NULL,   -- 1B, 2B, 3B, HOME
  to_base         VARCHAR(5)    NOT NULL,   -- 2B, 3B, HOME, OUT
  run_scored      TINYINT(1)    NOT NULL DEFAULT 0,
  earned_run      TINYINT(1)    NOT NULL DEFAULT 1,
  fielder_pos     TINYINT       NULL,       -- posición del fildeador en errores (1-9)
  operator_id     VARCHAR(100)  NULL,
  timestamp       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_br_game (game_id),
  INDEX idx_br_inning (game_id, inning, inning_half)
);
```

---

## 7. Endpoint del servidor

### `POST /api/baserunning-event`

**Body:**
```json
{
  "gameId": "string",
  "eventType": "stolen_base | caught_stealing | wild_pitch_advance | passed_ball_advance | balk | throwing_error | receiving_error | pickoff_out | pickoff_error | catcher_interference",
  "runners": [
    {
      "runnerLabel": "R1 | R2 | R3 | BR",
      "fromBase": "1B | 2B | 3B",
      "toBase": "2B | 3B | HOME | OUT",
      "runScored": true,
      "earnedRun": true,
      "fielderPos": 6
    }
  ]
}
```

**Respuesta:**
```json
{ "action": "recorded", "runsScored": 1, "earnedRuns": 0 }
```

**Efecto en el estado del juego:**
- Actualiza bases según los `toBase` de cada corredor
- Si `runScored = true`: incrementa marcador del equipo que batea
- Publica evento WS al panel de control

---

## 8. Integración con el estado del juego

Después de persistir el evento, el servidor llama al `stateStore` para:
1. Limpiar las bases de los corredores que avanzaron más allá de 3B o quedaron OUT
2. Actualizar el marcador si hay carreras anotadas
3. Agregar out si `toBase = 'OUT'`

---

## 9. Panel de Eventos — UI

```
┌─ Eventos de baserunning ──────────────── [×] ┐
│                                               │
│  Corredores activos:                          │
│  ● R1 en 1B   ● R2 en 2B   — sin R3          │
│                                               │
│  ── Acciones rápidas ──────────────────────   │
│  [SB R1→2B]  [SB R1→3B]  [SB R2→3B]          │
│  [CS R1]     [CS R2]                          │
│  [Balk — todos +1]                            │
│                                               │
│  ── Wild pitch / Passed ball ──────────────   │
│  Tipo: [WP ▼]   R1→[2B ▼]   R2→[3B ▼]       │
│  [Registrar avance]                           │
│                                               │
│  ── Error ─────────────────────────────────   │
│  Tipo: [E-tiro ▼]  Pos: [6]  Corredor: [R1]  │
│  Avanza a: [3B ▼]                             │
│  [Registrar error]                            │
└───────────────────────────────────────────────┘
```

---

## 10. Consulta del historial

El endpoint `GET /api/at-bats/:gameId` extiende su respuesta para incluir los `baserunning_events` intercalados cronológicamente, permitiendo una vista completa del inning.

---

## 11. Criterios de aceptación

- [ ] Todos los tipos de evento se persisten correctamente en `baserunning_events`
- [ ] Balk actualiza todas las bases en el estado del juego
- [ ] Base robada actualiza la base del corredor en el estado
- [ ] Caught stealing agrega 1 out y limpia la base
- [ ] Carreras anotadas se reflejan en el marcador
- [ ] `earnedRun` es `false` para passed_ball, throwing_error, receiving_error, pickoff_error
- [ ] `earnedRun` es `true` para stolen_base, wild_pitch_advance, balk, catcher_interference
- [ ] El panel de eventos no interfiere con el flujo de anotación activo
- [ ] Historial incluye los eventos de baserunning intercalados

---

## 12. Fuera de alcance (spec 29+)

- Reconstrucción automática del inning para cálculo de earned runs por pitcher (ERA)
- Múltiples errores en la misma jugada
- Interferencia del corredor
