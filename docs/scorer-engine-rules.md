# Reglas del GameEngine por acción del Scorer

> **Contexto:** El scorer registra at-bats mediante `POST /api/at-bats`. Cada resultado dispara una secuencia de comandos al `GameEngine` a través del `StateStore`. Este documento describe exactamente qué hace el engine para cada acción, qué estado cambia y qué eventos se emiten.

---

## Reglas activas — Softball Rápido (`SOFTBALL_FAST_RULES`)

| Parámetro | Valor |
|---|---|
| Entradas | 7 |
| Outs por media entrada | 3 |
| Bolas para walk | 4 |
| Strikes para ponche | 3 |
| Lanzador | Sí (`hasPitcher: true`) |
| Regla de misericordia | +10 carreras tras la 5ª entrada |
| Extras | Corredor en 2ª base |
| Batting continuo | No |
| Toque de bola permitido | Sí |
| DP/Flex | Sí |

---

## Modelo de estado relevante

```
GameState {
  outs: 0–2          ← se reinicia a 0 al cambiar media entrada
  bases: { first, second, third }  ← booleanos independientes
  count: { balls, strikes }        ← se reinicia al cambiar bateador o entrada
  score: { away, home }
  inning: 1–7+
  inningHalf: 'top' | 'bottom'
  currentBatterId: string
  currentPitcherId: string
  lineup: { away: LineupEntry[], home: LineupEntry[] }
}
```

---

## Avance automático de corredores

A partir del resultado del at-bat, el engine avanza corredores en base automáticamente:

### Walk / HBP — Avance forzado

El bateador toma 1ª base. Los corredores avanzan **solo si son forzados** por la nueva base del bateador:

| Bases antes | Resultado |
|---|---|
| Bases vacías | Solo bateador a 1ª |
| 1ª ocupada | Bateador a 1ª, corredor de 1ª a 2ª |
| 1ª y 2ª ocupadas | Bateador a 1ª, 1ª→2ª, 2ª→3ª |
| Bases llenas | Bateador a 1ª, 1ª→2ª, 2ª→3ª, 3ª→anota (1 carrera) |
| Solo 2ª o 3ª | Bateador a 1ª, otros corredores no se mueven (no hay fuerza) |

### Single / Error / Fielder's Choice — Avance 1 base

Todos los corredores avanzan exactamente 1 base. Si alcanzan o superan home, anotan:

| Corredor | Nuevo destino |
|---|---|
| En 3ª | Anota (1 carrera automática) |
| En 2ª | 3ª base |
| En 1ª | 2ª base |
| Bateador | 1ª base |

### Double — Avance 2 bases

| Corredor | Nuevo destino |
|---|---|
| En 3ª | Anota (1 carrera automática) |
| En 2ª | Anota (1 carrera automática) |
| En 1ª | 3ª base |
| Bateador | 2ª base |

### Triple — Avance 3 bases

Todos los corredores en base anotan automáticamente. El bateador llega a 3ª base.

### Home Run

Todos los corredores en base + el bateador anotan. El sistema calcula automáticamente:
`carreras = corredores_en_base + 1`

Las bases quedan vacías.

### Carreras adicionales (campo `runs`)

Para los resultados que admiten carreras manuales (SF, SB, error con avance adicional, etc.), el campo `runs` del formulario **suma sobre** las carreras automáticas calculadas. Para HR, el campo `runs` es ignorado (el sistema auto-calcula).

---

## Secuencia de comandos por resultado

Para cada acción el `scorerRouter` ejecuta los comandos en este orden:

1. `SetBatter` — si el bateador activo difiere del enviado por el scorer
2. `SetPitcher` — si el pitcher activo difiere (solo cuando `hasPitcher: true`)
3. `AddOut` × N (N=1 para outs simples, N=2 para DP)
4. `IncrementScore` × (carreras automáticas + carreras manuales)
5. `SetBase first/second/third:true/false` — estado final de bases calculado
6. `ResetCount` — reinicia conteo a 0-0
7. `SetBatter` — avanza al siguiente bateador en el lineup circular

> **Nota:** Si los `AddOut` causan el tercer out (inning terminado), los pasos 5 y 6 se omiten porque el engine ya limpió las bases automáticamente al llamar `advanceHalfInning`.

---

## Acciones de out

### `strikeout` · `groundout` · `flyout` — K / Out-G / Out-F

**Outs a registrar:** 1  
**Bases:** No se modifican automáticamente. Los corredores no se mueven (salvo que el operador los ajuste manualmente).

| Paso | Comando | Efecto en engine |
|---|---|---|
| 1 | `AddOut` | Si `outs + 1 < 3`: incrementa `outs`, resetea `count` a 0-0, emite `outs_changed` + `batter_changed` |
| 2 | — | Si `outs + 1 == 3`: llama `advanceHalfInning` → resetea `outs=0`, `bases=vacías`, `count=0-0`, cambia `inningHalf`/`inning` |
| 3 | `ResetCount` | Solo si la entrada **no** terminó |
| 4 | `SetBatter` | Siguiente en el lineup circular del equipo al bate |

> **Nota:** En un out con bases llenas y bola en el cuadro (groundout), los corredores pueden avanzar. Esto no se calcula automáticamente. El operador usa los controles manuales de bases.

---

### `sacrifice_fly` — SF (Fly de sacrificio)

**Outs a registrar:** 1  
**Carreras:** Las que ingrese el operador en el campo `runs`.

| Paso | Comando | Efecto |
|---|---|---|
| 1 | `AddOut` | Igual que strikeout/groundout |
| 2 | `IncrementScore` × N | N = `runs` ingresado por el operador |
| 3 | `ResetCount` | Si la entrada no terminó |
| 4 | `SetBatter` | Siguiente en el lineup |

**Bases:** No se modifican automáticamente. El operador debe limpiar la 3ª base si el corredor que anotó estaba ahí.

---

### `sacrifice_bunt` — SB (Toque de sacrificio)

Idéntico a `sacrifice_fly`. Bases y carreras son completamente manuales.

---

### `double_play` — DP (Doble play)

**Outs a registrar:** 2

| Paso | Comando | Efecto |
|---|---|---|
| 1 | `AddOut` (×2) | Registra los dos outs. Si el 3er out cae en el DP, el segundo `AddOut` cierra la entrada |
| 2 | `ResetCount` | Solo si la entrada no terminó |
| 3 | `SetBatter` | Siguiente en el lineup |

**Bases:** No se modifican. El operador debe ajustar qué bases quedaron vacías tras el doble play.

---

## Acciones de llegada a base (sin out)

Para estas acciones el engine **no registra out**. El bateador llega a base y el conteo se reinicia.

### `walk` / `hbp` — Base por bolas / Hit por lanzamiento

**Avance:** Forzado según bases ocupadas (ver tabla de avance forzado arriba).

| Paso | Comando | Efecto |
|---|---|---|
| 1 | `SetBase first/second/third:…` | Aplica el nuevo estado de bases calculado |
| 2 | `IncrementScore` × N | N = carreras forzadas (solo si bases llenas) + `runs` manual |
| 3 | `ResetCount` | Reinicia a 0-0 |
| 4 | `SetBatter` | Siguiente en el lineup |

---

### `single` — Sencillo

**Avance:** 1 base. Corredor en 3ª anota automáticamente.

| Paso | Comando | Efecto |
|---|---|---|
| 1 | `SetBase` para cada base | Estado final calculado con avance de 1 base |
| 2 | `IncrementScore` × N | N = corredores que anotaron (1 si había corredor en 3ª) + `runs` manual |
| 3 | `ResetCount` | Reinicia conteo |
| 4 | `SetBatter` | Siguiente en el lineup |

---

### `double` — Doble

**Avance:** 2 bases. Corredores en 2ª y 3ª anotan automáticamente. Corredor en 1ª va a 3ª.

---

### `triple` — Triple

**Avance:** 3 bases. Todos los corredores en base anotan automáticamente. Bateador a 3ª.

---

### `home_run` — Home Run

**Bases:** Quedan completamente vacías.  
**Carreras:** Automáticas: `corredores_en_base + 1` (bateador + todos los que estaban).  
El campo `runs` del scorer es ignorado — el sistema calcula el total exacto.

---

### `error` — Error del fildeador

Tratado igual que un sencillo: avance de 1 base para todos, corredor en 3ª anota. El operador puede ajustar si el error permitió avances adicionales.

---

### `fielders_choice` — Fielder's Choice (FC)

**Base a ocupar:** 1ª base (bateador llega safe). Avance de 1 base para corredores.

> **Nota:** El out fue sobre otro corredor en base. El `scorerRouter` no registra out para el bateador (0 outs en su turno). Si se produjo un out en otra base, el operador debe registrarlo manualmente con el control de outs del panel.

---

## Avance de bateador — lógica del lineup circular

Después de **cualquier** resultado, el scorer avanza automáticamente al siguiente bateador:

```
mismo inningHalf → siguiente índice en lineup[battingTeamRole] (circular)
inningHalf cambió → primer bateador disponible en lineup[newBattingRole]
                    (continúa desde donde ese equipo quedó, o desde índice 0)
```

El lineup se recorre en el orden `batting_order` tal como fue cargado desde `game_lineups`.  
Al llegar al último bateador, vuelve al primero (`% lineup.length`).

---

## Estadísticas por jugador

El sistema calcula estadísticas en tiempo real a partir de la tabla `at_bats` tras cada turno al bate. Las estadísticas se transmiten por WebSocket con el tipo de mensaje `player_stats`.

| Estadística | Descripción | Incluye |
|---|---|---|
| AB (at-bats) | Turnos al bate oficiales | Excluye walk, HBP, SF, SB |
| H (hits) | Imparables | single, double, triple, HR |
| 2B | Dobles | — |
| 3B | Triples | — |
| HR | Home runs | — |
| RBI | Carreras impulsadas | Campo `rbi` del scorer |
| BB | Bases por bolas | walk + HBP |
| K | Ponches | strikeout |
| AVG | Promedio del juego | H / AB |
| HOY | Línea del juego | Formato `"H-AB"` (ej. `"2-3"`) |

---

## Secuencias automáticas por media entrada

Al cerrar cada media entrada (`inning_ended`), el sistema ejecuta automáticamente:

| Fase | Duración | Qué muestra |
|---|---|---|
| **Outro** | 8 segundos | Jugadora MVP de la entrada (más hits/RBI) con resumen: carreras anotadas e imparables |
| **Patrocinador** | 8 segundos | SponsorBreak overlay (si hay patrocinador configurado) |
| **Intro** | 8 segundos | NextBatters overlay con los 3 próximos bateadores del equipo en turno |

Después de la secuencia, el juego continúa normalmente. El Scorebug permanece visible durante toda la secuencia.

### Datos del outro (GameEvent overlay)

- **Tipo de evento:** `mvp_inning`
- **Jugadora destacada:** mayor número de RBI en la entrada; en caso de empate, mayor cantidad de hits
- **Resumen de la entrada:** `"N carreras, M imparables"` o `"Sin carreras"` si la entrada fue en cero

### Datos del intro (NextBatters overlay)

- Muestra las 3 próximas bateadoras del equipo en turno: actual, en espera (on deck), y la siguiente
- El overlay se actualiza con el nuevo estado del lineup al inicio de la nueva media entrada

---

## Eventos emitidos por el engine

| Acción | Eventos emitidos |
|---|---|
| Out (sin cerrar entrada) | `outs_changed`, `count_changed`, `batter_changed` |
| Out (cierra entrada) | `inning_ended`, `inning_started` |
| Walk/Hit/Base segura | `bases_changed`, `count_changed`, `batter_changed` |
| HR | `bases_changed` (×3), `count_changed`, `batter_changed` |
| Carrera anotada | `run_scored` |
| Cambio de bateador | `batter_changed`, `count_changed` |

---

## Cierre de juego

El engine evalúa el fin del juego tras cada `advanceHalfInning`:

| Condición | Resultado |
|---|---|
| `inning >= 7` y `inningHalf === 'top'` y `score.home > score.away` | Juego terminado (local gana sin necesidad de batear en baja) |
| `inning >= 7` y `inningHalf === 'bottom'` y `score.home !== score.away` | Juego terminado |
| Empate después de 7 entradas | Extras con corredor en 2ª base |
| Regla de misericordia: +10 carreras de diferencia tras la 5ª entrada | Requiere `EndGame` manual desde el control |

---

## Limitaciones conocidas

| Limitación | Impacto | Workaround |
|---|---|---|
| SF/SB no limpia corredor de 3ª | El corredor que anotó queda marcado en 3ª | Operador usa control de bases para limpiar manualmente |
| DP no actualiza bases específicas | La base del corredor puesto out no se limpia | Operador ajusta bases manualmente |
| `fielders_choice` con out en otra base | El out no se registra automáticamente en el bateador | Operador usa el control de outs del panel |
| Error con avance extra | Solo se auto-avanza 1 base; avances adicionales por el error no se calculan | Operador usa control de bases |
| Avance de corredor en groundout con bases llenas | No se calcula automáticamente el avance de un corredor cuando hay 2 outs y bola en el cuadro | Operador ajusta bases manualmente |
