# Especificación funcional — Interfaces de anotación estadística de béisbol Live Game Scoring View

**Sistema:** módulo de anotación estadística para béisbol / sóftbol  
**Ámbito:** captura pitch-by-pitch, captura ofensiva de bola en juego, validación y publicación hacia scorebug, pizarra, acta y estadísticas.  
**Versión:** 1.1.0  
**Estado:** especificación ajustada después de revisión de grilla, orientación de bateador y flujo ofensivo.

---

## 1. Ajuste final incorporado

Después de revisar la grilla de lanzamiento, se define una regla final de diseño:

> La grilla siempre se captura desde la **vista del receptor**.  
> La lectura táctica **adentro / afuera** se calcula automáticamente según la mano de bateo registrada para el bateador en turno.

Esto significa que el anotador **no debe ajustar manualmente** la orientación del bateador durante el flujo normal.  
El sistema ya conoce si el bateador es derecho, zurdo o ambidiestro desde el lineup/roster.

Solo debe existir una opción secundaria para corregir el lado de bateo cuando el dato venga mal, esté vacío o el jugador sea switch hitter.

---

## 2. Gráficas de referencia actualizadas

### 2.1 Viaje del anotador V2

![Viaje del anotador](viaje_anotador_interfaces_beisbol_v2.png)

### 2.2 Interfaz 1 — Captura de lanzamiento V2

![Zona de captura de lanzamiento](zona_captura_lanzamiento_7x7_flujo_v2.png)

### 2.3 Interfaz 2 — Captura ofensiva de bola en juego

![Captura ofensiva bola en juego](grafica_captura_ofensiva_bola_en_juego.png)

---

## 3. Viaje del anotador

El viaje del anotador queda definido así:

```text
1. Revisar contexto permanente
2. Capturar ubicación física del lanzamiento
3. Dejar que el sistema calcule lectura táctica según bateador
4. Registrar resultado del lanzamiento
5. Registrar tipo de pitcheo
6. Si la pelota queda EN JUEGO, abrir captura ofensiva
7. Validar coherencia estadística
8. Publicar a scorebug, pizarra, acta, API y box score
```

---

## 4. Contexto permanente obligatorio

La interfaz debe mantener siempre visibles las referencias que permiten anotar sin perder contexto.

| Referencia | Descripción | Ejemplo |
|---|---|---|
| Bateador en turno | Jugador que realiza la aparición al plato. | `#12 S. Sánchez` |
| Mano del bateador | Dato usado para interpretar adentro/afuera. | `Derecho` |
| Lanzador en el montículo | Pitcher responsable del lanzamiento. | `#45 R. Gómez` |
| Receptor / catcher | Jugador que recibe y define objetivo del receptor. | `#02 M. Pérez` |
| Scorebug | Estado vivo del partido. | `TAI 2 · AST 4 · Alta 4 · 1 out · 2B/3B` |
| Conteo | Bolas y strikes antes del pitch. | `1-1` |
| Corredores | Identidad y base de cada corredor. | `R2 #18 · R3 #23` |
| Lineup | Orden al bate vigente. | `Bateador #12, sigue #18` |
| Defensa | Posiciones defensivas actuales. | `RF, CF, SS, 1B...` |

---

# Parte I — Interfaz de captura de lanzamiento

---

## 5. Propósito

La interfaz de captura de lanzamiento debe registrar con precisión cada pitcheo y separar cuatro conceptos: usando la ruta live-game-scoring

```text
ubicación física ≠ lectura táctica ≠ resultado del lanzamiento ≠ tipo de pitcheo
```

Ejemplo:

```text
Ubicación física: R3C6
Bateador: derecho
Lectura táctica automática: afuera
Resultado: strike cantado
Tipo: slider
```

---

## 6. Vista del receptor

La grilla se muestra desde la perspectiva del receptor, mirando desde atrás del home plate hacia el pitcher.

Esta vista no cambia por bateador.  
Lo que cambia es la interpretación táctica.

```text
La coordenada R3C6 siempre es el mismo punto físico.
Para bateador derecho puede ser afuera.
Para bateador zurdo puede ser adentro.
```

---

## 7. Mano del bateador y lectura automática

El sistema debe leer `battingSide` desde el roster o lineup.

| Valor | Significado |
|---|---|
| `R` | Bateador derecho |
| `L` | Bateador zurdo |
| `S` | Switch hitter / ambidiestro |
| `unknown` | Dato no informado |

### 7.1 Reglas

| Caso | Comportamiento |
|---|---|
| `R` | El sistema calcula adentro/afuera para derecho. |
| `L` | El sistema calcula adentro/afuera para zurdo. |
| `S` | El sistema usa el lado activo definido para esa aparición. |
| `unknown` | La interfaz solicita seleccionar lado de bateo. |

### 7.2 Corrección manual

La interfaz debe tener una opción secundaria:

```text
Corregir lado
```

No debe llamarse `Ajuste bateador`.

Este control solo se usa cuando:

- el dato del roster viene mal;
- el bateador es switch hitter y cambió de lado;
- el lineup no tiene mano de bateo;
- el anotador necesita corregir temporalmente.

---

## 8. Objetivo del receptor

El objetivo del receptor es la zona donde el catcher pidió o presentó el guante antes del lanzamiento.

Debe mostrarse como:

```text
Objetivo receptor
```

No como `Catcher Target`.

### 8.1 Modos

| Modo | Uso |
|---|---|
| `quick_3x3` | Captura rápida recomendada. |
| `advanced_7x7` | Captura fina para análisis avanzado. |
| `same_as_location` | Cuando el operador no vio el objetivo y usa la ubicación real. |
| `unknown` | No se capturó. |

---

## 9. Ubicación real del lanzamiento

La ubicación real debe capturarse con una grilla primaria 7x7.

Desde esa celda se derivan automáticamente:

- grilla 5x5;
- grilla 3x3;
- clasificación de zona;
- lectura adentro/afuera según bateador;
- alertas de consistencia.

### 9.1 Ejemplo

```json
{
  "view": "catcher",
  "grid7": "R3C6",
  "grid5": "R2C4",
  "grid3": "R2C3",
  "battingSide": "R",
  "batterRelativeSide": "outside",
  "zoneClass": "near_edge",
  "insideStrikeZone": false
}
```

---

## 10. Clasificación automática de zona

Estas etiquetas no son decisiones del anotador.  
El anotador solo marca ubicación.  
El sistema clasifica.

| Código | Texto recomendado | Significado |
|---|---|---|
| `heart` | Centro | Zona ideal, medio de la zona. |
| `zone` | Zona | Dentro de la zona de strike operativa. |
| `edge` | Borde | Límite de la zona. |
| `near_edge` | Cerca / Apenas fuera | Fuera por poco, cerca del borde. |
| `chase` | Persecución / fuera tentador | Fuera, pero tentador para swing. |
| `waste` | Muy lejos | Claramente fuera de zona. |

### 10.1 Cambio de lenguaje

No usar en la interfaz principal:

```text
HEART / ZONE / EDGE / SHADOW / CHASE / WASTE
```

Usar:

```text
CENTRO / ZONA / BORDE / CERCA / PERSECUCIÓN / MUY LEJOS
```

El término `shadow` puede existir internamente, pero para operadores es más claro usar `CERCA` o `APENAS FUERA`.

---

## 11. Resultado del lanzamiento

El resultado se registra después de la ubicación.

| Código | Texto de interfaz | Definición |
|---|---|---|
| `ball` | Bola | Lanzamiento cantado bola. |
| `called_strike` | Strike cantado | Strike decidido por el árbitro sin swing. |
| `swinging_strike` | Swing strike | El bateador abanica y no contacta. |
| `foul` | Foul | Contacto en territorio foul. |
| `in_play` | En juego | La pelota queda viva para jugada. |
| `hit_by_pitch` | Golpeado por lanzamiento | El lanzamiento golpea al bateador. |
| `wild_pitch` | Wild pitch / WP | Lanzamiento descontrolado del pitcher. |
| `passed_ball` | Passed ball / PB | El catcher no controla un lanzamiento manejable. |

### 11.1 Texto corregido

No usar solo:

```text
HBP
```

Usar:

```text
Golpeado por lanzamiento
```

La sigla `HBP` puede aparecer como ayuda secundaria.

---

## 12. Tipo de lanzamiento

El tipo de pitcheo se registra después del resultado.

### 12.1 Catálogo béisbol

| Código | Nombre |
|---|---|
| `FB` | Recta |
| `SI` | Sinker |
| `CT` | Cutter |
| `SL` | Slider |
| `CB` | Curva |
| `CH` | Cambio |
| `SP` | Splitter |
| `KN` | Nudillo |
| `OT` | Otro |

### 12.2 Catálogo sóftbol

| Código | Nombre |
|---|---|
| `FB` | Recta |
| `CH` | Cambio |
| `RB` | Riseball |
| `DB` | Dropball |
| `CU` | Curva |
| `SC` | Screwball |
| `OT` | Otro |

---

## 13. Métricas opcionales del lanzamiento

| Métrica | Texto recomendado | Descripción |
|---|---|---|
| `velocityMph` | Velocidad | Velocidad del lanzamiento. |
| `catcherTarget` | Objetivo receptor | Zona donde el catcher pidió el lanzamiento. |
| `umpireId` | Árbitro principal | Árbitro que cantó bola/strike. |
| `videoTimestamp` | Video | Marca de tiempo del clip. |
| `note` | Nota | Observación del operador. |
| `pitchTypeConfidence` | Confianza | Manual, automática o revisada. |

`HP-01` significa `Home Plate Umpire 01`, pero en pantalla debe mostrarse como:

```text
Árbitro principal / HP-01
```

---

## 14. Validaciones de lanzamiento

| Validación | Acción |
|---|---|
| Strike cantado fuera de zona | Advertir, no bloquear. |
| Bola dentro de zona | Advertir, no bloquear. |
| Swing fuera de zona | Registrar para chase rate. |
| Foul con dos strikes | No sumar tercer strike salvo regla aplicable. |
| En juego | Abrir interfaz ofensiva. |
| WP/PB con corredores | Solicitar avance de corredores. |
| Bateador sin mano definida | Solicitar lado de bateo. |

---

## 15. Evento de lanzamiento propuesto

```json
{
  "pitchId": "pitch-004-003",
  "plateAppearanceId": "pa-004",
  "sequence": 3,
  "contextBefore": {
    "inning": 4,
    "half": "top",
    "outs": 1,
    "balls": 1,
    "strikes": 1
  },
  "batter": {
    "playerId": "player-012",
    "displayName": "S. Sánchez",
    "battingSide": "R"
  },
  "pitcher": {
    "playerId": "player-045",
    "displayName": "R. Gómez"
  },
  "catcherTarget": {
    "captureMode": "quick_3x3",
    "grid3": "middle_outside",
    "grid7": "R3C5"
  },
  "location": {
    "view": "catcher",
    "grid7": "R3C6",
    "grid5": "R2C4",
    "grid3": "R2C3",
    "physicalSide": "right_from_catcher_view",
    "batterRelativeSide": "outside",
    "zoneClass": "near_edge",
    "insideStrikeZone": false
  },
  "result": {
    "pitchResult": "called_strike",
    "isContradictoryToLocation": true,
    "contradictionType": "outside_zone_called_strike"
  },
  "pitchType": {
    "code": "SL",
    "name": "Slider",
    "confidence": "manual"
  },
  "metrics": {
    "velocityMph": 61,
    "umpireId": "HP-01",
    "videoTimestamp": "00:42:18"
  }
}
```

---

# Parte II — Interfaz de captura ofensiva

---

## 16. Cuándo se habilita

La captura ofensiva se habilita automáticamente cuando:

```json
{
  "pitchResult": "in_play"
}
```

---

## 17. Flujo ofensivo recomendado

```text
Contacto
→ Dirección
→ Calidad
→ Resultado oficial
→ Fildeo
→ Corredores
→ Estadísticas afectadas
→ Guardar jugada
```

---

## 18. Tipo de contacto

| Código | Texto | Definición |
|---|---|---|
| `ground_ball` | Rolling | Pelota bateada por el suelo. |
| `line_drive` | Línea | Batazo bajo y fuerte con trayectoria directa. |
| `fly_ball` | Fly | Batazo elevado al outfield. |
| `pop_up` | Pop | Elevado corto o muy vertical. |
| `bunt` | Toque | Batazo intencional corto. |

---

## 19. Dirección del batazo

Debe capturarse en mapa táctil del campo.

| Código | Zona |
|---|---|
| `LF` | Jardín izquierdo |
| `LCF` | Entre LF y CF |
| `CF` | Jardín central |
| `RCF` | Entre CF y RF |
| `RF` | Jardín derecho |
| `3B` | Tercera base |
| `SS` | Shortstop |
| `2B` | Segunda base |
| `1B` | Primera base |
| `P` | Pitcher |
| `C` | Catcher |

---

## 20. Calidad del batazo

| Código | Texto | Definición |
|---|---|---|
| `weak` | Débil | Contacto pobre. |
| `medium` | Normal | Contacto promedio. |
| `hard` | Fuerte | Buen contacto. |
| `barrel` | Muy fuerte | Contacto premium. |

---

## 21. Resultado oficial

| Código | Texto |
|---|---|
| `out` | Out |
| `single` | 1B |
| `double` | 2B |
| `triple` | 3B |
| `home_run` | HR |
| `error` | Error |
| `fielders_choice` | FC |
| `double_play` | DP |
| `triple_play` | TP |
| `sac_bunt` | SAC |
| `sac_fly` | SF |
| `interference` | INT |
| `obstruction` | OBS |

---

## 22. Corredores

Cada corredor debe guardar:

| Campo | Descripción |
|---|---|
| `runner` | BR, R1, R2, R3 |
| `from` | Base inicial |
| `to` | Base final |
| `reason` | Causa del avance |
| `runScored` | Si anotó carrera |
| `rbiCredited` | Si acredita RBI |
| `out` | Si fue puesto out |
| `responsiblePitcherId` | Pitcher responsable |

---

## 23. Evento ofensivo propuesto

```json
{
  "eventId": "event-004-003",
  "sourcePitchId": "pitch-004-003",
  "type": "batted_ball",
  "battedBall": {
    "contactType": "line_drive",
    "direction": "RF",
    "fieldZone": "right_field",
    "quality": "hard",
    "strengthScale": 3,
    "trajectory": "low_line"
  },
  "officialResult": {
    "result": "single",
    "notation": "1B RF",
    "isHit": true,
    "isAtBat": true,
    "isPlateAppearance": true,
    "rbi": 2
  },
  "fielding": {
    "primaryFielder": "RF",
    "assist": null,
    "putout": null,
    "error": null
  },
  "runners": [
    {
      "runner": "BR",
      "from": "HOME",
      "to": "1B",
      "reason": "single",
      "runScored": false
    },
    {
      "runner": "R2",
      "from": "2B",
      "to": "HOME",
      "reason": "batted_ball",
      "runScored": true,
      "rbiCredited": true
    }
  ]
}
```

---

# Parte III — Modelo de eventos

---

## 24. Evento general

Todo evento debe tener:

| Campo | Descripción |
|---|---|
| `eventId` | Identificador único |
| `gameId` | Partido |
| `inning` | Entrada |
| `half` | Alta o baja |
| `sequence` | Orden |
| `type` | Tipo de evento |
| `contextBefore` | Estado antes |
| `payload` | Datos del evento |
| `contextAfter` | Estado posterior |
| `createdBy` | Anotador |
| `createdAt` | Fecha/hora |
| `source` | Manual, automático, importado, corregido |
| `reviewStatus` | Confirmado, pendiente, revisado |

---

## 25. Tipos principales

| Tipo | Descripción |
|---|---|
| `pitch` | Cada lanzamiento |
| `batted_ball` | Pelota en juego |
| `runner_advance` | Avance de corredor |
| `runner_out` | Out sobre corredor |
| `fielding_play` | Acción defensiva |
| `substitution` | Sustitución |
| `defensive_change` | Cambio defensivo |
| `pitching_change` | Cambio de pitcher |
| `scoring_decision` | Decisión hit/error/RBI/ER |
| `game_state_change` | Pausa, reanudación, finalización |

---

## 26. Validaciones generales

- Siempre debe existir bateador en turno.
- Siempre debe existir lanzador en el montículo.
- El scorebug debe coincidir con el estado interno.
- El conteo debe ser legal.
- No puede haber más de tres outs.
- No puede haber dos corredores en la misma base.
- Un corredor no puede avanzar sin causa.
- Un RBI debe tener causa válida.
- Un error requiere defensor responsable.
- Un out defensivo requiere putout.
- El sistema debe advertir contradicciones, pero no bloquear decisiones legítimas del árbitro.
- Toda corrección debe quedar auditada.

---

## 27. Publicación

| Destino | Datos enviados |
|---|---|
| Scorebug | marcador, inning, outs, bases, conteo, bateador, pitcher |
| Pizarra broadcast | line score, próximos bateadores, lanzadores, estadísticas |
| Acta oficial | eventos confirmados, box score, sustituciones |
| API live | eventos normalizados |
| Estadísticas | acumulados por jugador y equipo |
| Video | timestamps asociados |
| Auditoría | historial de edición |

---

## 28. Glosario

| Término | Significado |
|---|---|
| PA | Aparición al plato |
| AB | Turno oficial al bate |
| HBP | Golpeado por lanzamiento |
| RBI | Carrera impulsada |
| ER | Carrera limpia |
| UER | Carrera no limpia |
| WP | Wild pitch |
| PB | Passed ball |
| FC | Fielder's Choice |
| DP | Doble play |
| TP | Triple play |
| SAC | Toque de sacrificio |
| SF | Fly de sacrificio |
| HP Umpire | Árbitro principal detrás del catcher |
| Objetivo receptor | Zona donde el catcher pidió el lanzamiento |
| Vista receptor | Perspectiva desde detrás del home plate |
| Lectura automática | Conversión de coordenada física a adentro/afuera según bateador |

---

## 29. Archivos incluidos

```text
especificacion-interfaces-anotacion-beisbol-v2.md
viaje_anotador_interfaces_beisbol_v2.png
zona_captura_lanzamiento_7x7_flujo_v2.png
grafica_captura_ofensiva_bola_en_juego.png
```
