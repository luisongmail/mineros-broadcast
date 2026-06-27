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

-- Layout por defecto
INSERT IGNORE INTO layouts (id, name, is_default, zones) VALUES (
  'default-layout-001',
  'Layout por defecto',
  1,
  '{"batter":{"x":0,"y":0,"width":1920,"animIn":"slide_up","height":1080,"animOut":"fade_out","visible":true},"lineup":{"x":0,"y":0,"width":1920,"animIn":"slide_left","height":1080,"animOut":"slide_left_out","visible":true},"social":{"x":0,"y":0,"width":1920,"animIn":"slide_up","height":1080,"animOut":"fade_out","visible":true},"pitcher":{"x":0,"y":0,"width":1920,"animIn":"slide_up","height":1080,"animOut":"fade_out","visible":true},"scorebug":{"x":0,"y":0,"width":1920,"animIn":"slide_up","height":1080,"animOut":"slide_down_out","visible":true},"countdown":{"x":0,"y":0,"width":1920,"animIn":"fade_in","height":1080,"animOut":"fade_out","visible":true},"game-event":{"x":0,"y":0,"width":1920,"animIn":"slide_up","height":1080,"animOut":"fade_out","visible":true},"final-score":{"x":0,"y":0,"width":1920,"animIn":"zoom_in","height":1080,"animOut":"zoom_out","visible":true},"announcement":{"x":0,"y":0,"width":1920,"animIn":"slide_up","height":1080,"animOut":"fade_out","visible":true},"next-batters":{"x":0,"y":0,"width":1920,"animIn":"slide_up","height":1080,"animOut":"fade_out","visible":true},"substitution":{"x":0,"y":0,"width":1920,"animIn":"slide_up","height":1080,"animOut":"fade_out","visible":true},"sponsor-break":{"x":0,"y":0,"width":1920,"animIn":"slide_up","height":1080,"animOut":"fade_out","visible":true},"inning-transition":{"x":0,"y":0,"width":1920,"animIn":"fade_in","height":1080,"animOut":"fade_out","visible":true}}'
);
