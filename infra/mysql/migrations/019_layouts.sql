-- 019_layouts.sql
-- Tablas para el Layout Manager: layouts y asignación layout↔juego

CREATE TABLE IF NOT EXISTS layouts (
  id          VARCHAR(100) NOT NULL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  is_default  TINYINT(1)   NOT NULL DEFAULT 0,
  zones       JSON         NOT NULL DEFAULT (JSON_OBJECT()),
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_layouts (
  game_id     VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  layout_id   VARCHAR(100) NOT NULL,
  assigned_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (game_id),
  CONSTRAINT fk_game_layouts_game   FOREIGN KEY (game_id)   REFERENCES games(id)   ON DELETE CASCADE,
  CONSTRAINT fk_game_layouts_layout FOREIGN KEY (layout_id) REFERENCES layouts(id) ON DELETE CASCADE
);

-- Layout por defecto (16:9 broadcast estándar, safe area 60px)
INSERT IGNORE INTO layouts (id, name, is_default, zones) VALUES (
  'default-1920x1080',
  'Broadcast 1920×1080 (default)',
  1,
  JSON_OBJECT(
    'scorebug',       JSON_OBJECT('x', 60,   'y', 60,   'w', 320, 'h', 80,  'visible', TRUE),
    'batter',         JSON_OBJECT('x', 60,   'y', 880,  'w', 480, 'h', 140, 'visible', FALSE),
    'pitcher',        JSON_OBJECT('x', 1380, 'y', 880,  'w', 480, 'h', 140, 'visible', FALSE),
    'lineup',         JSON_OBJECT('x', 60,   'y', 120,  'w', 340, 'h', 600, 'visible', FALSE),
    'next-batters',   JSON_OBJECT('x', 1520, 'y', 120,  'w', 340, 'h', 400, 'visible', FALSE),
    'lower-third',    JSON_OBJECT('x', 60,   'y', 880,  'w', 1800,'h', 140, 'visible', FALSE),
    'announcement',   JSON_OBJECT('x', 560,  'y', 380,  'w', 800, 'h', 320, 'visible', FALSE),
    'countdown',      JSON_OBJECT('x', 760,  'y', 440,  'w', 400, 'h', 200, 'visible', FALSE)
  )
);
