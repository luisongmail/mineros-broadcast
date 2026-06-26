# ADR-002 — Modelo Multideporte
## Sports, Leagues, Tournaments, Players & Game Rules

**Versión:** 1.0  
**Fecha:** 2026-06-24  
**Estado:** APROBADO  
**Depende de:** ADR-001

---

## 1. DISCIPLINAS SOPORTADAS

| Disciplina | `sport.id` | Jugadores | Entradas | Pitcher | Notas |
|-----------|-----------|----------|---------|---------|-------|
| Béisbol (M/F) | `baseball` | 9 | 9 | Sí — overhand | DH universal o sin DH |
| Béisbol amateur/HS | `baseball_amateur` | 9 | 7 | Sí | Mercy rule, sin pitch clock |
| Softball Rápido (M/F) | `softball_fast` | 9–10 | 7 | Sí — underhand windmill | DP/FLEX, re-entry, tiebreaker |
| Softball Lento (M/F) | `softball_slow` | 10 | 7 | Sí — underhand lob | Bateo continuo, bunt prohibido |
| Baseball5 (Mixto) | `baseball5` | 5 | 5 | **No** — rodada con mano | Sin balls/strikes, sets, mixto |

Extensible: el modelo soporta agregar disciplinas sin cambiar código.

---

## 2. MODELO DE DATOS

### 2.1 Diagrama de entidades

```
sports ──────────────────────────────────────────────────────┐
  id, name, has_pitcher, default_rules JSON                   │
                                                              │
    ▼ 1:N                                                     │
leagues                                                       │
  id, sport_id → sports, gender, country, level              │
  logo_asset_id, banner_asset_id                             │
                                                              │
    ▼ 1:N                                                     │
tournaments                                                   │
  id, league_id, name, type, season                          │
  logo_asset_id, banner_asset_id, trophy_asset_id            │
  rules JSON ←── NÚCLEO del sistema de reglas                │
                                                              │
    ▼ N:M vía tournament_teams                               │
teams ───────────────────────────────────────────────────────┘
  id, name, short_name, city, country, founded_year
  primary_color, secondary_color
  logo_asset_id, logo_wordmark_asset_id, logo_alternate_asset_id

    ▼ N:M vía rosters (por torneo)
players
  id, first_name, last_name, nickname
  date_of_birth, nationality, gender
  bats, throws, primary_position
  photo_asset_id, photo_action_asset_id

rosters (contrato jugador + equipo + torneo)
  id, tournament_id, team_id, player_id
  number (dorsal), position, batting_slot
  status, is_dp, is_flex, re_entry_used
  joined_date, left_date

games
  id, tournament_id, home_team_id, away_team_id
  scheduled_at, started_at, finished_at
  venue, game_number, status
  final_score JSON, game_state JSON
  rules_override JSON  ←── sobreescritura de reglas del torneo

game_lineups (alineación día de partido)
  id, game_id, roster_id
  batting_order, position, is_starter
  is_dp, is_flex, substituted_at, substituted_by_roster_id
  re_entry_used, courtesy_running_for_roster_id

at_bats (log granular de turno al bate)
  id, game_id, batter_roster_id, pitcher_roster_id (nullable)
  inning, inning_half, result
  rbi, runs, on_base, pitch_count (nullable)
  timestamp
```

### 2.2 Schema MySQL detallado

```sql
CREATE TABLE sports (
  id              VARCHAR(50)  PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  has_pitcher     TINYINT(1)  NOT NULL DEFAULT 1,
  default_rules   JSON        NOT NULL DEFAULT ('{}'),
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leagues (
  id              VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  sport_id        VARCHAR(50)  NOT NULL,
  name            VARCHAR(255) NOT NULL,
  short_name      VARCHAR(20)  NULL,
  gender          ENUM('male','female','mixed') NOT NULL DEFAULT 'male',
  country         VARCHAR(10)  NULL,
  level           ENUM('professional','amateur','youth','international') NOT NULL DEFAULT 'amateur',
  logo_asset_id   VARCHAR(100) NULL,
  banner_asset_id VARCHAR(100) NULL,
  metadata        JSON         NOT NULL DEFAULT ('{}'),
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tournaments (
  id               VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  league_id        VARCHAR(36)  NOT NULL,
  name             VARCHAR(255) NOT NULL,
  type             ENUM('regular_season','playoff','championship','exhibition','allstar') NOT NULL DEFAULT 'regular_season',
  season           VARCHAR(20)  NULL,
  start_date       DATE         NULL,
  end_date         DATE         NULL,
  status           ENUM('upcoming','active','completed','cancelled') NOT NULL DEFAULT 'upcoming',
  logo_asset_id    VARCHAR(100) NULL,
  banner_asset_id  VARCHAR(100) NULL,
  trophy_asset_id  VARCHAR(100) NULL,
  rules            JSON         NOT NULL DEFAULT ('{}'),
  metadata         JSON         NOT NULL DEFAULT ('{}'),
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_league_id (league_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tournament_teams (
  tournament_id  VARCHAR(36) NOT NULL,
  team_id        VARCHAR(100) NOT NULL,
  seed           INT          NULL,
  group_division VARCHAR(50)  NULL,
  is_active      TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (tournament_id, team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE players (
  id                      VARCHAR(100) PRIMARY KEY,
  first_name              VARCHAR(100) NOT NULL,
  last_name               VARCHAR(100) NOT NULL,
  nickname                VARCHAR(100) NULL,
  date_of_birth           DATE         NULL,
  nationality             VARCHAR(10)  NULL,
  gender                  ENUM('male','female','other') NOT NULL DEFAULT 'male',
  bats                    ENUM('R','L','S') NULL,
  throws                  ENUM('R','L') NULL,
  primary_position        VARCHAR(20)  NULL,
  height_cm               INT          NULL,
  weight_kg               DECIMAL(5,2) NULL,
  photo_asset_id          VARCHAR(100) NULL,
  photo_action_asset_id   VARCHAR(100) NULL,
  metadata                JSON         NOT NULL DEFAULT ('{}'),
  created_at              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rosters (
  id              VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  tournament_id   VARCHAR(36)  NOT NULL,
  team_id         VARCHAR(100) NOT NULL,
  player_id       VARCHAR(100) NOT NULL,
  number          VARCHAR(10)  NULL,
  position        VARCHAR(20)  NULL,
  batting_slot    INT          NULL,     -- para bateo continuo: posición fija en el orden
  is_dp           TINYINT(1)  NOT NULL DEFAULT 0,
  is_flex         TINYINT(1)  NOT NULL DEFAULT 0,
  re_entry_used   TINYINT(1)  NOT NULL DEFAULT 0,
  status          ENUM('active','injured','suspended','inactive') NOT NULL DEFAULT 'active',
  joined_date     DATE         NULL,
  left_date       DATE         NULL,
  metadata        JSON         NOT NULL DEFAULT ('{}'),
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_tournament_player (tournament_id, player_id),
  INDEX idx_team (tournament_id, team_id),
  INDEX idx_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- games: agregar tournament_id y rules_override al schema existente
ALTER TABLE games
  ADD COLUMN tournament_id   VARCHAR(36) NULL AFTER id,
  ADD COLUMN rules_override  JSON        NULL COMMENT 'Sobreescritura parcial de tournament.rules para este juego',
  ADD INDEX idx_tournament (tournament_id);

CREATE TABLE game_lineups_v2 (
  id                          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  game_id                     VARCHAR(100) NOT NULL,
  roster_id                   VARCHAR(36)  NOT NULL,
  batting_order               INT          NOT NULL,
  position                    VARCHAR(20)  NOT NULL,
  is_starter                  TINYINT(1)  NOT NULL DEFAULT 1,
  is_dp                       TINYINT(1)  NOT NULL DEFAULT 0,
  is_flex                     TINYINT(1)  NOT NULL DEFAULT 0,
  re_entry_used               TINYINT(1)  NOT NULL DEFAULT 0,
  substituted_at              DATETIME(3)  NULL,
  substituted_by_roster_id    VARCHAR(36)  NULL,
  courtesy_running_for_roster_id VARCHAR(36) NULL,
  created_at                  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_game_id (game_id),
  INDEX idx_roster (roster_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. GAME_RULES — SCHEMA JSON COMPLETO

### 3.1 Estructura completa de reglas

```typescript
interface GameRules {
  // ── Estructura del juego ──────────────────────────────────────────────────
  innings: number;                    // 5 | 6 | 7 | 9
  outsPerHalfInning: number;          // siempre 3
  playersOnField: number;             // 5 | 9 | 10
  battingLineupSize: number | null;   // null = continuo sin límite
  hasPitcher: boolean;
  pitchingStyle: 'overhand' | 'underhand_windmill' | 'underhand_lob' | 'hand_roll';
  usesSets: boolean;                  // Baseball5: mejor de 3 sets
  setsToWin: number | null;

  // ── Conteo ───────────────────────────────────────────────────────────────
  ballsForWalk: number | null;        // null en Baseball5 (no hay walk)
  strikesForStrikeout: number | null; // null en Baseball5
  batterAttempts: number | null;      // null = usa balls/strikes; 1 = Baseball5

  // ── Bateador designado ────────────────────────────────────────────────────
  dhRule: 'none' | 'universal' | 'dp_flex';
  extraPlayerRule: boolean;
  continuousBattingOrder: boolean;

  // ── Sustituciones ────────────────────────────────────────────────────────
  starterReEntry: boolean;
  courtesyRunner: {
    forPitcher: boolean;
    forCatcher: boolean;
    oncePerInning: boolean;
  } | null;

  // ── Corredores ───────────────────────────────────────────────────────────
  leadingOff: boolean;
  stealing: 'anytime' | 'on_release' | 'restricted' | 'none';

  // ── Extra innings ────────────────────────────────────────────────────────
  extraInningsRule: {
    type: 'none' | 'international_tiebreaker' | 'b5_escalating' | 'eternal';
    tiebreakerBase: 'second' | 'first' | null;
    canEndInTie: boolean;
    maxExtraInnings: number | null;
  };

  // ── Mercy rule ────────────────────────────────────────────────────────────
  mercyRule: Array<{ afterInning: number; runDiff: number }> | null;

  // ── Tiempo ────────────────────────────────────────────────────────────────
  timeLimit: { minutes: number; stopNewInningAfter: number } | null;

  // ── Pace of play (modernos) ───────────────────────────────────────────────
  pitchClock: { noRunners: number; withRunners: number; batterReady: number } | null;
  pickoffLimit: number | null;
  shiftRestriction: boolean;

  // ── Reglas especiales ────────────────────────────────────────────────────
  buntAllowed: boolean;
  infieldFlyRule: boolean;
  balkType: 'standard' | 'illegal_pitch' | 'none';

  // ── Género (Baseball5 mixto) ──────────────────────────────────────────────
  mixedGenderRules: {
    minPerGender: number;
    alternateBattingOrder: boolean;
  } | null;

  // ── Display (derivado, sobreescribible) ───────────────────────────────────
  display: {
    showCount: boolean;
    showPitchCount: boolean;
    showPitcherStats: boolean;
    showSetCounter: boolean;
    inningLabel: string;
    maxInningsDisplay: number;
  };
}
```

### 3.2 Configuraciones predefinidas por disciplina

#### Béisbol profesional (MLB/WBSC/LIDOM)
```json
{
  "innings": 9, "playersOnField": 9, "battingLineupSize": 9,
  "hasPitcher": true, "pitchingStyle": "overhand",
  "ballsForWalk": 4, "strikesForStrikeout": 3, "batterAttempts": null,
  "dhRule": "universal", "extraPlayerRule": false, "continuousBattingOrder": false,
  "starterReEntry": false, "courtesyRunner": null,
  "leadingOff": true, "stealing": "anytime",
  "extraInningsRule": { "type": "international_tiebreaker", "tiebreakerBase": "second", "canEndInTie": false, "maxExtraInnings": null },
  "mercyRule": null,
  "timeLimit": null,
  "pitchClock": { "noRunners": 15, "withRunners": 18, "batterReady": 8 },
  "pickoffLimit": 2, "shiftRestriction": true,
  "buntAllowed": true, "infieldFlyRule": true, "balkType": "standard",
  "mixedGenderRules": null,
  "display": { "showCount": true, "showPitchCount": true, "showPitcherStats": true, "showSetCounter": false, "inningLabel": "Entrada", "maxInningsDisplay": 9 }
}
```

#### Softball Rápido (WBSC/Olímpico)
```json
{
  "innings": 7, "playersOnField": 9, "battingLineupSize": 9,
  "hasPitcher": true, "pitchingStyle": "underhand_windmill",
  "ballsForWalk": 4, "strikesForStrikeout": 3, "batterAttempts": null,
  "dhRule": "dp_flex", "extraPlayerRule": false, "continuousBattingOrder": false,
  "starterReEntry": true,
  "courtesyRunner": { "forPitcher": true, "forCatcher": true, "oncePerInning": true },
  "leadingOff": false, "stealing": "on_release",
  "extraInningsRule": { "type": "international_tiebreaker", "tiebreakerBase": "second", "canEndInTie": false, "maxExtraInnings": null },
  "mercyRule": [{ "afterInning": 3, "runDiff": 20 }, { "afterInning": 4, "runDiff": 15 }, { "afterInning": 5, "runDiff": 7 }],
  "timeLimit": null, "pitchClock": null, "pickoffLimit": null, "shiftRestriction": false,
  "buntAllowed": true, "infieldFlyRule": true, "balkType": "illegal_pitch",
  "mixedGenderRules": null,
  "display": { "showCount": true, "showPitchCount": true, "showPitcherStats": true, "showSetCounter": false, "inningLabel": "Entrada", "maxInningsDisplay": 7 }
}
```

#### Baseball5 (WBSC — Mixto)
```json
{
  "innings": 5, "playersOnField": 5, "battingLineupSize": 5,
  "hasPitcher": false, "pitchingStyle": "hand_roll",
  "ballsForWalk": null, "strikesForStrikeout": null, "batterAttempts": 1,
  "dhRule": "none", "extraPlayerRule": false, "continuousBattingOrder": false,
  "starterReEntry": false, "courtesyRunner": null,
  "leadingOff": false, "stealing": "on_release",
  "extraInningsRule": { "type": "b5_escalating", "tiebreakerBase": "first", "canEndInTie": true, "maxExtraInnings": 7 },
  "mercyRule": [{ "afterInning": 3, "runDiff": 15 }, { "afterInning": 4, "runDiff": 10 }],
  "timeLimit": null,
  "pitchClock": null, "pickoffLimit": null, "shiftRestriction": false,
  "buntAllowed": false, "infieldFlyRule": false, "balkType": "none",
  "mixedGenderRules": { "minPerGender": 2, "alternateBattingOrder": true },
  "display": { "showCount": false, "showPitchCount": false, "showPitcherStats": false, "showSetCounter": true, "inningLabel": "Entrada", "maxInningsDisplay": 5 }
}
```

---

## 4. RESOLUCIÓN DE REGLAS EN EL SERVIDOR

```typescript
// Al cargar un partido:
function resolveGameRules(tournament: Tournament, game: Game): GameRules {
  const sportDefaults = sports[tournament.league.sport_id].defaultRules;
  const tournamentRules = tournament.rules;
  const gameOverrides = game.rulesOverride ?? {};
  
  // Merge: sport defaults ← tournament ← game override
  return deepMerge(sportDefaults, tournamentRules, gameOverrides);
}

// Las reglas resueltas se envían al cliente junto con el estado inicial:
// WebSocket message type: 'game_config'
// payload: { gameState, gameRules, roster }
```

---

## 5. IMPACTO EN OVERLAYS POR REGLA

| Overlay | `hasPitcher=false` | `continuousBatting=true` | `showCount=false` | `usesSets=true` |
|---------|-------------------|------------------------|------------------|----------------|
| Scorebug | Oculta stats de pitcher, oculta conteo | Sin cambio | Oculta balls-strikes | Muestra Set counter |
| BatterOverlay | Sin cambio | Muestra "#8 de 15" | Sin conteo activo | Sin cambio |
| PitcherOverlay | **No se renderiza** | Sin cambio | Sin cambio | Sin cambio |
| LineupOverlay | Sin cambio | Muestra roster completo | Sin cambio | Sin cambio |
| NextBatters | Sin cambio | Cicla todo el roster | Sin cambio | Sin cambio |
| InningTransition | Sin cambio | Sin cambio | Sin cambio | Muestra "Set X" |
| Substitution | Sin cambio | "Sustitución defensiva (sigue en batting)" | Sin cambio | Sin cambio |

---

## 6. ASSETS DE MEDIOS

| Entidad | Campo | Tipo recomendado | Tamaño máx |
|---------|-------|-----------------|-----------|
| `leagues` | `logo_asset_id` | PNG transparente | 512×512 |
| `leagues` | `banner_asset_id` | JPG/PNG | 1920×400 |
| `tournaments` | `logo_asset_id` | PNG transparente | 512×512 |
| `tournaments` | `banner_asset_id` | JPG/PNG | 1920×400 |
| `tournaments` | `trophy_asset_id` | PNG transparente | 512×512 |
| `teams` | `logo_asset_id` | PNG transparente | 512×512 |
| `teams` | `logo_wordmark_asset_id` | PNG transparente | 1024×256 |
| `teams` | `logo_alternate_asset_id` | PNG transparente | 512×512 |
| `players` | `photo_asset_id` | JPG (headshot) | 400×500 |
| `players` | `photo_action_asset_id` | JPG (acción) | 800×600 |

Todos los assets se almacenan y sirven a través del **Asset Manager** (`assetId`). La ruta real la resuelve el Asset Manager, nunca el overlay directamente.

---

## 7. SEED DE DISCIPLINAS (datos de referencia)

```sql
INSERT INTO sports (id, name, has_pitcher, default_rules) VALUES
  ('baseball',         'Béisbol',             1, '{"innings":9,"dhRule":"universal",...}'),
  ('baseball_amateur', 'Béisbol Amateur',     1, '{"innings":7,"dhRule":"none","mercyRule":[{"afterInning":5,"runDiff":10}],...}'),
  ('softball_fast',    'Softball Rápido',     1, '{"innings":7,"dhRule":"dp_flex","pitchingStyle":"underhand_windmill",...}'),
  ('softball_slow',    'Softball Lento',      1, '{"innings":7,"continuousBattingOrder":true,"buntAllowed":false,...}'),
  ('baseball5',        'Baseball5',           0, '{"innings":5,"batterAttempts":1,"ballsForWalk":null,...}');
```

---

*Documento complementario de ADR-001. Para el ciclo de desarrollo ver: `docs/development/DEVELOPMENT-CYCLE.md`*
