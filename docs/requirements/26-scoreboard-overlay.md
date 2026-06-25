# Especificación — Pizarra de Béisbol para Overlay Broadcast

**Sistema:** Mineros Broadcast  
**Componente:** `baseball_scoreboard_board`  
**Tipo de overlay:** Pizarra / tablero de consulta  
**Versión:** `1.0.0`  
**Estado:** Candidato para implementación  
**Referencia visual:** `pizarra_beisbol_zonas_numeradas_v7.png`

---

## 1. Propósito

La **Pizarra de Béisbol** es una gráfica de consulta para transmisión.  
No es un scorebug compacto ni debe permanecer todo el juego como marcador pequeño.

Debe utilizarse para mostrar una vista amplia, ordenada y legible del estado general del partido:

- información del torneo o liga;
- fecha del juego;
- hora de inicio;
- cantidad de entradas configuradas;
- tiempo restante;
- line score por entrada;
- totales `R / H / E`;
- equipo al bate;
- próximos tres bateadores;
- estadísticas de los próximos bateadores;
- lanzadores de ambos equipos con estadísticas del juego;
- grilla animada de auspiciadores.

La pizarra puede mostrarse en escenas de previa, pausa, cambio de entrada, entre innings, análisis, resumen o cierre.

---

## 2. Diferencia con el Scorebug

| Elemento | Scorebug | Pizarra de Béisbol |
|---|---|---|
| Uso | Persistente durante la acción | Consulta o escena especial |
| Tamaño | Compacto | Grande |
| Información principal | Marcador, inning, conteo, bases | Line score completo |
| Ubicación | Esquina o borde de pantalla | Centro o bloque amplio |
| Duración | Permanente | Temporal / por escena |
| Auspiciadores | Slot pequeño opcional | Grilla configurable animada |
| Estadísticas | Muy limitadas | Más amplias |

La pizarra **no debe duplicar innecesariamente** información propia del scorebug, como conteo de bolas/strikes, outs o diamante de bases, salvo que se defina una variante específica posterior.

---

## 3. Principios visuales

La pizarra debe respetar el sistema visual de Mineros Broadcast:

- fondo general transparente;
- placa principal negra;
- borde dorado;
- tarjetas internas oscuras;
- rojo Mineros como color de marca;
- navy como color secundario;
- blanco para información principal;
- gris para información secundaria;
- dorado para jerarquía, totales y énfasis;
- números grandes y condensados;
- etiquetas pequeñas y limpias;
- nada de estilo planilla Excel;
- nada de explicaciones largas dentro de la gráfica.

El logo de **Mineros Broadcast** debe formar parte del diseño de la pizarra como marca fija del sistema, **independiente de si Mineros juega o no**.

---

## 4. Zonas de la pizarra

La referencia gráfica queda numerada en cinco zonas.

---

# Zona 1 — Encabezado, marca y datos generales

## 1.1 Objetivo

Identificar la transmisión, el torneo/liga y los datos temporales del juego.

## 1.2 Elementos visibles

- logo fijo de Mineros Broadcast;
- texto `MINEROS BROADCAST`;
- nombre de liga o torneo;
- categoría;
- sede;
- tipo de juego;
- fecha;
- hora de inicio;
- cantidad de entradas configuradas;
- tiempo restante.

## 1.3 Datos

| Campo | Ejemplo | Fuente |
|---|---|---|
| `broadcast.brandLogoAssetId` | `asset-mineros-broadcast-logo` | Asset Manager |
| `competition.name` | `Liga Oriente` | Match Setup |
| `competition.tournament` | `Torneo Apertura 2026` | Match Setup |
| `competition.category` | `Infantil` | Match Setup |
| `venue.name` | `Estadio Lo Prado` | Match Setup |
| `game.gameType` | `Juego Regular` | Match Setup |
| `game.date` | `2026-06-25` | Match Setup |
| `game.startTime` | `13:30` | Match Setup |
| `game.configuredInnings` | `7` | Game Configuration |
| `game.remainingTime` | `48:12` | Game Clock / Operator Panel |

## 1.4 Reglas

- El logo de Mineros Broadcast es fijo.
- No depende de los equipos que juegan.
- La cantidad de entradas no debe estar fija en código.
- El tiempo restante debe poder venir del Game Clock o ser ingresado por operador.
- Si no existe tiempo restante, debe ocultarse el bloque o mostrar `--:--` solo en preview.

---

# Zona 2 — Pizarra oficial / Line Score

## 2.1 Objetivo

Mostrar la pizarra tradicional de béisbol con carreras por entrada y totales.

## 2.2 Elementos visibles

- equipo visitante;
- logo del equipo visitante;
- abreviatura visitante;
- equipo local;
- logo del equipo local;
- abreviatura local;
- columnas dinámicas por entrada;
- totales `R / H / E`;
- leyenda breve de `R / H / E`;
- configuración de entradas.

## 2.3 Datos

| Campo | Ejemplo | Fuente |
|---|---|---|
| `teams.away.displayName` | `Team Anderson` | Match Setup |
| `teams.away.abbr` | `TAI` | Match Setup |
| `teams.away.logoAssetId` | `asset-team-anderson-logo` | Asset Manager |
| `teams.home.displayName` | `Astros` | Match Setup |
| `teams.home.abbr` | `AST` | Match Setup |
| `teams.home.logoAssetId` | `asset-astros-logo` | Asset Manager |
| `lineScore.innings[]` | entradas 1 a 7 | Game Engine |
| `lineScore.totals.runs` | `4` | Game Engine |
| `lineScore.totals.hits` | `6` | Official Scoring |
| `lineScore.totals.errors` | `0` | Official Scoring |
| `game.configuredInnings` | `7` | Game Configuration |

## 2.4 Reglas

- El visitante siempre va arriba.
- El local siempre va abajo.
- La cantidad de columnas de entradas depende de `game.configuredInnings`.
- Para juegos de 5 entradas, se muestran 5 columnas.
- Para juegos de 6 entradas, se muestran 6 columnas.
- Para juegos de 7 entradas, se muestran 7 columnas.
- Para juegos especiales, el layout debe ajustar el ancho de columnas.
- Las columnas `R / H / E` siempre deben quedar al final.
- Las carreras (`R`) deben ser el total de mayor jerarquía.
- Las entradas no jugadas se muestran como `-`.
- Si el local no batea la última entrada por estar ganando, puede mostrarse `X` si el Game Engine lo informa.
- No debe mostrar `ALTA`, `BAJA`, `OUTS`, `BASES` ni diamante de bases en esta zona.
- No debe duplicar información que corresponde al scorebug.

---

# Zona 3 — Equipo al bate y próximos bateadores

## 3.1 Objetivo

Mostrar qué equipo está al bate y cuáles son los próximos tres bateadores, con estadísticas resumidas de cada jugador.

## 3.2 Elementos visibles

- logo del equipo al bate;
- nombre del equipo al bate;
- estado `AL BATE`;
- próximos tres bateadores;
- orden próximo;
- número de camiseta;
- nombre;
- posición;
- mano de bateo;
- promedio de bateo;
- hits;
- carreras impulsadas;
- desempeño en el juego actual.

## 3.3 Datos

| Campo | Ejemplo | Fuente |
|---|---|---|
| `battingTeam.teamId` | `astros` | Game Engine |
| `battingTeam.logoAssetId` | `asset-astros-logo` | Asset Manager |
| `battingTeam.displayName` | `Astros` | Match Setup |
| `nextBatters[0].order` | `1` | Game Engine |
| `nextBatters[0].playerNumber` | `#12` | Roster |
| `nextBatters[0].playerName` | `S. Sánchez` | Roster |
| `nextBatters[0].position` | `SS` | Roster / Game Engine |
| `nextBatters[0].battingHand` | `BD` | Roster |
| `nextBatters[0].avg` | `.333` | Stats Engine |
| `nextBatters[0].hits` | `2` | Stats Engine |
| `nextBatters[0].rbi` | `1` | Stats Engine |
| `nextBatters[0].today` | `1-2` | Game Stats |

## 3.4 Estadísticas mínimas por jugador

Cada jugador en la lista debe mostrar:

| Estadística | Descripción |
|---|---|
| `AVG` | Promedio de bateo |
| `H` | Hits |
| `RBI` | Carreras impulsadas |
| `HOY` | Desempeño del juego actual |

## 3.5 Reglas

- Siempre se muestran tres próximos bateadores si la información está disponible.
- Si solo hay uno o dos bateadores disponibles, se muestran las tarjetas disponibles.
- Si no existen estadísticas, se muestran guiones o se ocultan las columnas estadísticas según configuración.
- No debe mostrarse diamante de bases.
- No debe mostrarse conteo de bolas/strikes.
- No debe mostrarse outs.
- El equipo al bate debe venir del Game Engine.
- El logo del equipo al bate debe venir del Asset Manager.
- Si falta el logo, usar fallback con abreviatura del equipo.

---

# Zona 4 — Lanzadores

## 4.1 Objetivo

Mostrar los lanzadores de ambos equipos y sus estadísticas del juego.

## 4.2 Elementos visibles

- logo o abreviatura del equipo;
- número del lanzador;
- nombre del lanzador;
- innings lanzados;
- carreras permitidas;
- hits permitidos;
- bases por bolas;
- ponches;
- cantidad de lanzamientos.

## 4.3 Datos

| Campo | Ejemplo | Fuente |
|---|---|---|
| `pitchers.away.teamAbbr` | `TAI` | Match Setup |
| `pitchers.away.teamLogoAssetId` | `asset-team-anderson-logo` | Asset Manager |
| `pitchers.away.playerNumber` | `#45` | Roster |
| `pitchers.away.playerName` | `R. Gómez` | Roster |
| `pitchers.away.ip` | `3.0 IP` | Stats Engine |
| `pitchers.away.runsAllowed` | `4 R` | Stats Engine |
| `pitchers.away.hitsAllowed` | `6 H` | Stats Engine |
| `pitchers.away.walks` | `2 BB` | Stats Engine |
| `pitchers.away.strikeouts` | `3 K` | Stats Engine |
| `pitchers.away.pitchCount` | `64 PIT` | Pitch Count |
| `pitchers.home.*` | equivalente | Stats Engine |

## 4.4 Reglas

- Deben mostrarse los lanzadores de ambos equipos.
- Cada lanzador debe estar identificado con su equipo.
- El logo del equipo debe tener fallback por abreviatura.
- `PIT` debe tener énfasis visual.
- Si no hay conteo de lanzamientos, ocultar `PIT` o mostrar `--`.
- Si hubo relevo, la pizarra puede mostrar el lanzador actual por defecto.
- Una variante posterior puede incluir lanzador abridor y relevistas.

---

# Zona 5 — Auspiciadores

## 5.1 Objetivo

Mostrar auspiciadores en formato de tarjetas configurables, con espacio para logo y texto, usando animación de carrusel.

## 5.2 Tipo de componente

La zona 5 debe ser una **grilla configurable de tarjetas de auspiciadores**.

No debe ser una fila simple de logos.

Cada tarjeta debe permitir:

- logo;
- nombre de marca;
- texto corto;
- opcionalmente categoría o claim;
- estilo visual según configuración.

## 5.3 Valor por defecto

Por defecto se muestran **3 tarjetas visibles**.

```text
[Tarjeta 1] [Tarjeta 2] [Tarjeta 3] [Siguiente parcial]
```

## 5.4 Animación

La animación debe ser tipo carrusel horizontal:

- dirección: de derecha a izquierda;
- entrada: una nueva tarjeta aparece desde la derecha;
- salida: la tarjeta más antigua sale hacia la izquierda;
- duración sugerida de transición: `450ms`;
- tiempo visible sugerido por grupo: `5000ms`;
- easing: `ease-in-out`;
- debe poder pausarse en preview o cuando el operador bloquee el layout.

## 5.5 Configuración desde Layout Manager

La cantidad de tarjetas visibles debe ser configurable desde la sección de layout.

Campos sugeridos:

```json
{
  "sponsorGrid": {
    "enabled": true,
    "visibleCards": 3,
    "direction": "right_to_left",
    "transitionMs": 450,
    "holdMs": 5000,
    "showPartialNextCard": true,
    "cardGapPx": 22,
    "cardMode": "logo_text"
  }
}
```

## 5.6 Datos de tarjeta

| Campo | Ejemplo | Fuente |
|---|---|---|
| `sponsors[].sponsorId` | `merchise` | Sponsor Engine |
| `sponsors[].logoAssetId` | `asset-sponsor-merchise` | Asset Manager |
| `sponsors[].displayName` | `Merchise` | Sponsor Engine |
| `sponsors[].text` | `Tecnología para la transmisión` | Sponsor Engine |
| `sponsors[].priority` | `1` | Sponsor Engine |
| `sponsors[].active` | `true` | Sponsor Engine |
| `sponsors[].campaignId` | `campaign-001` | Sponsor Engine |

## 5.7 Reglas

- El Sponsor Engine decide qué auspiciadores están activos.
- El Layout Manager decide cuántas tarjetas se ven.
- El Overlay Manager renderiza la animación.
- La pizarra no decide elegibilidad comercial.
- Si hay menos sponsors que tarjetas visibles, se centra la grilla.
- Si no hay sponsors activos, se oculta la zona o se muestra un placeholder de broadcast configurable.
- La tarjeta debe tener logo y texto.
- La tarjeta debe soportar solo logo en casos especiales, pero el modo por defecto es `logo_text`.

---

## 5. Contrato JSON propuesto

```json
{
  "schemaVersion": "1.0.0",
  "correlationId": "uuid",
  "overlay": "baseball_scoreboard_board",
  "variant": "full_board",
  "branding": {
    "brandName": "Mineros Broadcast",
    "brandLogoAssetId": "asset-mineros-broadcast-logo"
  },
  "competition": {
    "name": "Liga Oriente",
    "tournament": "Torneo Apertura 2026",
    "category": "Infantil"
  },
  "venue": {
    "name": "Estadio Lo Prado"
  },
  "game": {
    "gameId": "game-2026-001",
    "gameType": "Juego Regular",
    "date": "2026-06-25",
    "startTime": "13:30",
    "configuredInnings": 7,
    "remainingTime": "48:12",
    "status": "live"
  },
  "teams": {
    "away": {
      "teamId": "team-anderson",
      "displayName": "Team Anderson",
      "abbr": "TAI",
      "logoAssetId": "asset-team-anderson-logo"
    },
    "home": {
      "teamId": "astros",
      "displayName": "Astros",
      "abbr": "AST",
      "logoAssetId": "asset-astros-logo"
    }
  },
  "lineScore": {
    "innings": [
      { "inning": 1, "away": 0, "home": 1 },
      { "inning": 2, "away": 0, "home": 0 },
      { "inning": 3, "away": 1, "home": 0 },
      { "inning": 4, "away": 1, "home": 3 },
      { "inning": 5, "away": null, "home": null },
      { "inning": 6, "away": null, "home": null },
      { "inning": 7, "away": null, "home": null }
    ],
    "totals": {
      "away": {
        "runs": 2,
        "hits": 5,
        "errors": 1
      },
      "home": {
        "runs": 4,
        "hits": 6,
        "errors": 0
      }
    }
  },
  "battingTeam": {
    "teamId": "astros",
    "displayName": "Astros",
    "abbr": "AST",
    "logoAssetId": "asset-astros-logo"
  },
  "nextBatters": [
    {
      "order": 1,
      "playerId": "player-012",
      "playerNumber": "12",
      "playerName": "S. Sánchez",
      "position": "SS",
      "battingHand": "BD",
      "avg": ".333",
      "hits": 2,
      "rbi": 1,
      "today": "1-2"
    },
    {
      "order": 2,
      "playerId": "player-018",
      "playerNumber": "18",
      "playerName": "C. Arias",
      "position": "CF",
      "battingHand": "BI",
      "avg": ".286",
      "hits": 1,
      "rbi": 0,
      "today": "0-1"
    },
    {
      "order": 3,
      "playerId": "player-023",
      "playerNumber": "23",
      "playerName": "I. Córdova",
      "position": "1B",
      "battingHand": "BD",
      "avg": ".417",
      "hits": 3,
      "rbi": 2,
      "today": "2-2"
    }
  ],
  "pitchers": {
    "away": {
      "teamId": "team-anderson",
      "teamAbbr": "TAI",
      "teamLogoAssetId": "asset-team-anderson-logo",
      "playerId": "player-045",
      "playerNumber": "45",
      "playerName": "R. Gómez",
      "ip": "3.0",
      "runsAllowed": 4,
      "hitsAllowed": 6,
      "walks": 2,
      "strikeouts": 3,
      "pitchCount": 64
    },
    "home": {
      "teamId": "astros",
      "teamAbbr": "AST",
      "teamLogoAssetId": "asset-astros-logo",
      "playerId": "player-021",
      "playerNumber": "21",
      "playerName": "C. Jara",
      "ip": "4.0",
      "runsAllowed": 2,
      "hitsAllowed": 5,
      "walks": 1,
      "strikeouts": 5,
      "pitchCount": 54
    }
  },
  "sponsors": [
    {
      "sponsorId": "merchise",
      "displayName": "Merchise",
      "logoAssetId": "asset-sponsor-merchise",
      "text": "Tecnología para la transmisión",
      "priority": 1,
      "active": true
    },
    {
      "sponsorId": "storeware",
      "displayName": "Storeware",
      "logoAssetId": "asset-sponsor-storeware",
      "text": "Plataforma oficial de datos",
      "priority": 2,
      "active": true
    },
    {
      "sponsorId": "pjd",
      "displayName": "PJD",
      "logoAssetId": "asset-sponsor-pjd",
      "text": "Auspiciador de la jornada",
      "priority": 3,
      "active": true
    }
  ],
  "layout": {
    "preferredZone": "center",
    "priority": 80,
    "persistent": false,
    "safeArea": 60,
    "durationMs": 12000,
    "sponsorGrid": {
      "enabled": true,
      "visibleCards": 3,
      "direction": "right_to_left",
      "transitionMs": 450,
      "holdMs": 5000,
      "showPartialNextCard": true,
      "cardGapPx": 22,
      "cardMode": "logo_text"
    }
  }
}
```

---

## 6. Responsabilidades por motor

| Motor | Responsabilidad |
|---|---|
| Game Engine | Estado del juego, line score, equipo al bate, próximos bateadores |
| Match Setup | Equipos, liga, torneo, categoría, sede, fecha, hora |
| Game Configuration | Cantidad de entradas |
| Game Clock | Tiempo restante |
| Roster | Jugadores, números, posiciones, mano de bateo |
| Stats Engine | AVG, H, RBI, HOY, IP, R, H, BB, K, PIT |
| Asset Manager | Logos de equipos, logo Mineros Broadcast, logos de sponsors |
| Sponsor Engine | Auspiciadores activos, prioridad, texto, campaña |
| Layout Manager | Posición, safe area, cantidad de tarjetas visibles, conflictos |
| Overlay Manager | Render, animaciones, preview/program, fallbacks |

---

## 7. Estados del overlay

| Estado | Descripción |
|---|---|
| `hidden` | No visible |
| `preview` | Visible solo para operador |
| `program` | Visible en transmisión |
| `animating_in` | Entrada |
| `holding` | Estado estable |
| `sponsor_transition` | Movimiento de carrusel de auspiciadores |
| `animating_out` | Salida |
| `error_fallback` | Muestra último estado válido |

---

## 8. Fallbacks

| Falta | Comportamiento |
|---|---|
| Logo Mineros Broadcast | Mostrar texto `MINEROS BROADCAST` |
| Logo de equipo | Mostrar badge con abreviatura |
| Entradas configuradas | Usar 7 como fallback solo en preview |
| Tiempo restante | Mostrar `--:--` o esconder tarjeta |
| Estadísticas de bateador | Mostrar `-` en columna |
| Próximos bateadores | Mostrar tarjetas vacías con `POR DEFINIR` |
| Stats de lanzador | Mostrar solo nombre y equipo |
| Sponsors activos | Ocultar zona o mostrar placeholder |
| Logo sponsor | Mostrar inicial de marca |
| Texto sponsor | Mostrar solo nombre de marca |

---

## 9. Criterios de aceptación

La pizarra queda lista para implementación cuando:

- muestra logo fijo de Mineros Broadcast independiente de los equipos;
- no muestra `ALTA/BAJA`, `OUTS`, `BASES` ni diamante de bases;
- tiene line score dominante;
- tiene entradas configurables;
- muestra `R / H / E`;
- muestra liga, torneo, categoría, sede, fecha, inicio y tiempo restante;
- muestra logos de equipos en el line score;
- muestra equipo al bate;
- muestra próximos tres bateadores;
- muestra estadísticas por próximo bateador;
- muestra lanzadores con estadísticas del juego;
- muestra auspiciadores como tarjetas con logo y texto;
- la grilla de auspiciadores es configurable desde layout;
- por defecto muestra 3 tarjetas de auspiciador;
- el carrusel se anima de derecha a izquierda;
- usa assets por `assetId`;
- respeta safe area;
- puede operar en preview y program;
- conserva último estado válido ante fallas;
- no calcula estado deportivo dentro del componente visual.

---

## 10. Referencia gráfica

Archivo de referencia visual:

```text
pizarra_beisbol_zonas_numeradas_v7.png
```

Archivo de especificación:

```text
baseball-scoreboard-board-spec.md
```
