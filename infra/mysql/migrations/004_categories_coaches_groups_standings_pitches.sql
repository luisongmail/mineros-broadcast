-- ============================================================
-- Categorías, cuerpo técnico, grupos, standings y pitcheos
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id           VARCHAR(100) PRIMARY KEY,
  sport_id     VARCHAR(50) NOT NULL,
  name         VARCHAR(100) NOT NULL,
  description  TEXT NULL,
  active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_categories_sport_id (sport_id),
  INDEX idx_categories_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_categories (
  team_id      VARCHAR(100) NOT NULL,
  category_id  VARCHAR(100) NOT NULL,
  PRIMARY KEY (team_id, category_id),
  INDEX idx_team_categories_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coaching_staff (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  team_id         VARCHAR(100) NOT NULL,
  tournament_id   VARCHAR(100) NULL,
  name            VARCHAR(255) NOT NULL,
  role            VARCHAR(50) NOT NULL COMMENT 'manager|coach_bateo|coach_bases|pitcher_coach|utilero|otro',
  photo_asset_id  VARCHAR(100) NULL,
  active          TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_coaching_staff_team_id (team_id),
  INDEX idx_coaching_staff_tournament_id (tournament_id),
  INDEX idx_coaching_staff_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tournament_groups (
  id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tournament_id VARCHAR(100) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  order_num     INT NOT NULL DEFAULT 0,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_tournament_groups_tournament_id (tournament_id),
  INDEX idx_tournament_groups_order_num (tournament_id, order_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tournament_group_teams (
  group_id   VARCHAR(36) NOT NULL,
  team_id    VARCHAR(100) NOT NULL,
  seeding    INT NULL,
  PRIMARY KEY (group_id, team_id),
  INDEX idx_tournament_group_teams_team_id (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS standings (
  id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tournament_id VARCHAR(100) NOT NULL,
  group_id      VARCHAR(36) NULL,
  team_id       VARCHAR(100) NOT NULL,
  JG            INT NOT NULL DEFAULT 0,
  JP            INT NOT NULL DEFAULT 0,
  JE            INT NOT NULL DEFAULT 0,
  PCT           DECIMAL(5,3) NOT NULL DEFAULT 0,
  RA            INT NOT NULL DEFAULT 0,
  RC            INT NOT NULL DEFAULT 0,
  `Dif`         INT NOT NULL DEFAULT 0,
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_standings_tournament_group_team (tournament_id, group_id, team_id),
  INDEX idx_standings_tournament_group (tournament_id, group_id),
  INDEX idx_standings_team_id (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pitches (
  id                 VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id            VARCHAR(100) NOT NULL,
  at_bat_id          VARCHAR(36) NULL,
  pitcher_player_id  VARCHAR(100) NOT NULL,
  batter_player_id   VARCHAR(100) NOT NULL,
  pitch_num          INT NOT NULL COMMENT 'secuencia dentro del at-bat',
  pitch_type         VARCHAR(20) NULL COMMENT 'recta|cambio|curva|slider|sinker|cortada',
  zone_x             INT NULL COMMENT '1-7 columna en grilla 7x7',
  zone_y             INT NULL COMMENT '1-7 fila en grilla 7x7',
  umpire_call        VARCHAR(10) NOT NULL COMMENT 'ball|strike|foul|hit|hbp',
  inning             INT NOT NULL,
  inning_half        VARCHAR(5) NOT NULL,
  operator_id        VARCHAR(100) NOT NULL,
  `timestamp`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_pitches_game_id (game_id),
  INDEX idx_pitches_at_bat_id (at_bat_id),
  INDEX idx_pitches_game_pitcher (game_id, pitcher_player_id),
  INDEX idx_pitches_game_inning (game_id, inning, inning_half)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_events (
  id                 VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id            VARCHAR(100) NOT NULL,
  event_type         VARCHAR(50) NOT NULL COMMENT 'pitch|batted_ball|out|run|substitution|...',
  at_bat_id          VARCHAR(36) NULL,
  inning             INT NOT NULL,
  inning_half        VARCHAR(5) NOT NULL,
  batter_player_id   VARCHAR(100) NULL,
  pitcher_player_id  VARCHAR(100) NULL,
  payload            JSON NOT NULL DEFAULT ('{}') COMMENT 'datos específicos del evento (zona, secuencia out, tipo hit, etc.)',
  operator_id        VARCHAR(100) NOT NULL,
  created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_game_events_game_id (game_id),
  INDEX idx_game_events_game_inning_half (game_id, inning, inning_half)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS category_id VARCHAR(100) NULL AFTER league_id,
  ADD COLUMN IF NOT EXISTS structure_type VARCHAR(50) NULL DEFAULT 'round_robin' COMMENT 'round_robin|single_elimination|double_elimination|group_stage|exhibition',
  ADD COLUMN IF NOT EXISTS num_rounds INT NULL DEFAULT 1 COMMENT 'a cuantas vueltas',
  ADD COLUMN IF NOT EXISTS has_playoffs TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS playoff_format VARCHAR(50) NULL COMMENT 'semifinal_final|quarterfinal_semi_final';

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS category_id VARCHAR(100) NULL AFTER tournament_id;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS active TINYINT(1) NOT NULL DEFAULT 1 AFTER founded_year;
