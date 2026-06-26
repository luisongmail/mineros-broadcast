-- ============================================================
-- Schema inicial completo — Broadcast System v0.5.0
-- Incluye: modelo base, multideporte, scorer panel
-- ============================================================

-- ------------------------------------------------------------
-- SPORTS — disciplinas deportivas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sports (
  id           VARCHAR(50) PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  gender       VARCHAR(20) NOT NULL DEFAULT 'mixed',
  has_pitcher  TINYINT(1) NOT NULL DEFAULT 1,
  default_rules JSON NOT NULL COMMENT 'GameRules JSON template base',
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- LEAGUES — ligas por deporte/país
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leagues (
  id              VARCHAR(100) PRIMARY KEY,
  sport_id        VARCHAR(50) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  short_name      VARCHAR(50) NULL,
  country         VARCHAR(10) NOT NULL DEFAULT 'DO',
  level           VARCHAR(50) NULL,
  logo_asset_id   VARCHAR(100) NULL,
  banner_asset_id VARCHAR(100) NULL,
  active          TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_leagues_sport_id (sport_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TOURNAMENTS — torneos dentro de una liga
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournaments (
  id               VARCHAR(100) PRIMARY KEY,
  league_id        VARCHAR(100) NOT NULL,
  name             VARCHAR(255) NOT NULL,
  short_name       VARCHAR(50) NULL,
  type             VARCHAR(50) NULL,
  season           VARCHAR(20) NULL,
  start_date       DATE NULL,
  end_date         DATE NULL,
  rules            JSON NULL COMMENT 'GameRules que sobreescribe el sport default',
  logo_asset_id    VARCHAR(100) NULL,
  banner_asset_id  VARCHAR(100) NULL,
  trophy_asset_id  VARCHAR(100) NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'upcoming',
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_tournaments_league_id (league_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TEAMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id                       VARCHAR(100) PRIMARY KEY,
  name                     VARCHAR(255) NOT NULL,
  short_name               VARCHAR(50) NOT NULL,
  logo_asset_id            VARCHAR(100) NULL,
  logo_wordmark_asset_id   VARCHAR(100) NULL,
  logo_alternate_asset_id  VARCHAR(100) NULL,
  city                     VARCHAR(255) NULL,
  country                  VARCHAR(10) NULL DEFAULT 'DO',
  primary_color            VARCHAR(20) NULL,
  secondary_color          VARCHAR(20) NULL,
  founded_year             INT NULL,
  created_at               DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at               DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TOURNAMENT_TEAMS — equipos en un torneo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournament_teams (
  id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tournament_id VARCHAR(100) NOT NULL,
  team_id       VARCHAR(100) NOT NULL,
  seeding       INT NULL,
  eliminated    TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tt (tournament_id, team_id),
  INDEX idx_tt_tournament (tournament_id),
  INDEX idx_tt_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- PLAYERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id                    VARCHAR(100) PRIMARY KEY,
  first_name            VARCHAR(100) NULL,
  last_name             VARCHAR(100) NULL,
  nickname              VARCHAR(100) NULL,
  name                  VARCHAR(255) NOT NULL,
  team_id               VARCHAR(100) NULL,
  number                VARCHAR(20) NOT NULL,
  position              VARCHAR(20) NOT NULL,
  bats                  VARCHAR(10) NULL,
  throws                VARCHAR(10) NULL,
  photo_asset_id        VARCHAR(100) NULL,
  photo_action_asset_id VARCHAR(100) NULL,
  stats                 JSON NOT NULL DEFAULT ('{}'),
  status                VARCHAR(50) NOT NULL DEFAULT 'active',
  date_of_birth         DATE NULL,
  nationality           VARCHAR(10) NULL DEFAULT 'DO',
  gender                VARCHAR(10) NULL DEFAULT 'male',
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_players_team_id (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- ROSTERS — jugador + equipo + torneo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rosters (
  id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tournament_id VARCHAR(100) NOT NULL,
  team_id       VARCHAR(100) NOT NULL,
  player_id     VARCHAR(100) NOT NULL,
  number        VARCHAR(10) NOT NULL,
  position      VARCHAR(20) NOT NULL,
  batting_slot  INT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'active',
  is_dp         TINYINT(1) NOT NULL DEFAULT 0,
  is_flex       TINYINT(1) NOT NULL DEFAULT 0,
  re_entry_used TINYINT(1) NOT NULL DEFAULT 0,
  joined_date   DATE NULL,
  left_date     DATE NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_roster (tournament_id, team_id, player_id),
  INDEX idx_roster_tournament (tournament_id),
  INDEX idx_roster_team (team_id),
  INDEX idx_roster_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- GAMES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
  id             VARCHAR(100) PRIMARY KEY,
  tournament_id  VARCHAR(100) NULL,
  home_team_id   VARCHAR(100) NULL,
  away_team_id   VARCHAR(100) NULL,
  status         VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  scheduled_at   DATETIME(3) NOT NULL,
  started_at     DATETIME(3) NULL,
  finished_at    DATETIME(3) NULL,
  venue          VARCHAR(255) NULL,
  season         VARCHAR(100) NULL,
  game_number    INT NULL,
  final_score    JSON NULL,
  game_state     JSON NULL,
  rules_override JSON NULL COMMENT 'GameRules que sobreescribe el torneo para este partido',
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_games_tournament (tournament_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- GAME_LINEUPS — alineación día de partido
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_lineups (
  id                              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id                         VARCHAR(100) NULL,
  team_id                         VARCHAR(100) NULL,
  player_id                       VARCHAR(100) NULL,
  roster_id                       VARCHAR(36) NULL,
  batting_order                   INT NOT NULL,
  position                        VARCHAR(20) NOT NULL,
  is_starter                      TINYINT(1) NOT NULL DEFAULT 1,
  is_dp                           TINYINT(1) NOT NULL DEFAULT 0,
  is_flex                         TINYINT(1) NOT NULL DEFAULT 0,
  re_entry_used                   TINYINT(1) NOT NULL DEFAULT 0,
  courtesy_running_for_roster_id  VARCHAR(36) NULL,
  substituted_at                  DATETIME(3) NULL,
  substituted_by                  VARCHAR(100) NULL,
  created_at                      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_game_lineups_game_id (game_id),
  INDEX idx_game_lineups_team_id (team_id),
  INDEX idx_game_lineups_roster (roster_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- AT_BATS — log granular del scorer panel
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS at_bats (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id           VARCHAR(100) NOT NULL,
  batter_roster_id  VARCHAR(36) NULL,
  batter_player_id  VARCHAR(100) NULL,
  pitcher_roster_id VARCHAR(36) NULL,
  player_id         VARCHAR(100) NOT NULL COMMENT 'legacy — usar batter_player_id',
  inning            INT NOT NULL,
  inning_half       VARCHAR(10) NULL,
  result            VARCHAR(50) NOT NULL,
  rbi               INT NOT NULL DEFAULT 0,
  runs              INT NOT NULL DEFAULT 0,
  on_base           TINYINT(1) NOT NULL DEFAULT 0,
  pitch_count       INT NULL,
  notes             TEXT NULL,
  `timestamp`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_at_bats_game (game_id),
  INDEX idx_at_bats_inning (game_id, inning, inning_half),
  INDEX idx_at_bats_batter (batter_player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- SPONSORS / CAMPAIGNS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponsors (
  id                 VARCHAR(100) PRIMARY KEY,
  name               VARCHAR(255) NOT NULL,
  brand              VARCHAR(255) NOT NULL,
  asset_id           VARCHAR(100) NULL,
  status             VARCHAR(50) NOT NULL DEFAULT 'draft',
  priority           INT NOT NULL DEFAULT 50,
  weight             INT NOT NULL DEFAULT 10,
  allowed_placements JSON NOT NULL DEFAULT ('[]'),
  start_date         DATETIME(3) NULL,
  end_date           DATETIME(3) NULL,
  exposure_limits    JSON NOT NULL DEFAULT ('{}'),
  blackout_rules     JSON NOT NULL DEFAULT ('[]'),
  metadata           JSON NOT NULL DEFAULT ('{}'),
  created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaigns (
  id          VARCHAR(100) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  status      VARCHAR(50) NOT NULL DEFAULT 'draft',
  placements  JSON NOT NULL DEFAULT ('[]'),
  start_date  DATETIME(3) NULL,
  end_date    DATETIME(3) NULL,
  rules       JSON NOT NULL DEFAULT ('{}'),
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaign_sponsors (
  campaign_id VARCHAR(100) NOT NULL,
  sponsor_id  VARCHAR(100) NOT NULL,
  PRIMARY KEY (campaign_id, sponsor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_impressions (
  id               VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  sponsor_id       VARCHAR(100) NULL,
  campaign_id      VARCHAR(100) NULL,
  game_id          VARCHAR(100) NULL,
  placement        VARCHAR(100) NOT NULL,
  zone_id          VARCHAR(100) NULL,
  scene_id         VARCHAR(100) NULL,
  `trigger`        VARCHAR(50) NOT NULL,
  started_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at         DATETIME(3) NULL,
  duration_seconds INT NULL,
  INDEX idx_sponsor_impressions_game_id (game_id),
  INDEX idx_sponsor_impressions_sponsor_id (sponsor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- OPERATOR_ACTIONS / OVERLAY_CONFIGS / BROADCAST_SESSIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operator_actions (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id     VARCHAR(100) NULL,
  operator_id VARCHAR(100) NOT NULL,
  role        VARCHAR(50) NOT NULL,
  action      VARCHAR(100) NOT NULL,
  overlay_id  VARCHAR(100) NULL,
  payload     JSON NOT NULL DEFAULT ('{}'),
  result      VARCHAR(50) NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_operator_actions_game_id (game_id),
  INDEX idx_operator_actions_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS overlay_configs (
  overlay_id      VARCHAR(100) PRIMARY KEY,
  default_variant VARCHAR(100) NULL,
  auto_hide_ms    INT NULL,
  priority        INT NOT NULL DEFAULT 50,
  preferred_zone  VARCHAR(100) NULL,
  config          JSON NOT NULL DEFAULT ('{}'),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS broadcast_sessions (
  id         VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id    VARCHAR(100) NULL,
  state_json JSON NOT NULL DEFAULT ('{}'),
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_game_id (game_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

