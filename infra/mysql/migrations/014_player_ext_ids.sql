-- Spec 29: S2 — Identificadores externos en tabla players

ALTER TABLE players
  ADD COLUMN mlbam_id   VARCHAR(20)  NULL  COMMENT 'ID en MLB Stats API (jugadores de referencia MLB)',
  ADD COLUMN wbsc_id    VARCHAR(30)  NULL  COMMENT 'ID en WBSC (torneos internacionales)',
  ADD COLUMN ext_ref    JSON         NULL  COMMENT 'referencias externas adicionales {fuente: id}';
