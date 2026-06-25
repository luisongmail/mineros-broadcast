-- Migración 010: clubs, associations y relación club→team

-- Asociaciones deportivas (FEDOBEISBOL, FEDOSOFBOL, FEPABEIS, etc.)
CREATE TABLE IF NOT EXISTS associations (
  id           VARCHAR(100)  NOT NULL PRIMARY KEY,
  name         VARCHAR(255)  NOT NULL,
  short_name   VARCHAR(50)   DEFAULT NULL,
  country_code CHAR(2)       DEFAULT NULL,
  sport_id     VARCHAR(100)  DEFAULT NULL,
  website      VARCHAR(255)  DEFAULT NULL,
  created_at   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clubs deportivos (pueden tener varios equipos en distintas categorías)
CREATE TABLE IF NOT EXISTS clubs (
  id             VARCHAR(100)  NOT NULL PRIMARY KEY,
  name           VARCHAR(255)  NOT NULL,
  short_name     VARCHAR(50)   DEFAULT NULL,
  city           VARCHAR(100)  DEFAULT NULL,
  country        VARCHAR(100)  DEFAULT NULL,
  country_code   CHAR(2)       DEFAULT NULL,
  logo_asset_id  VARCHAR(255)  DEFAULT NULL,
  federated      TINYINT(1)    NOT NULL DEFAULT 0,
  association_id VARCHAR(100)  DEFAULT NULL,
  notes          TEXT          DEFAULT NULL,
  created_at     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_club_association FOREIGN KEY (association_id) REFERENCES associations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar club_id a teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS club_id VARCHAR(100) DEFAULT NULL AFTER country;
ALTER TABLE teams ADD CONSTRAINT IF NOT EXISTS fk_team_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL;
