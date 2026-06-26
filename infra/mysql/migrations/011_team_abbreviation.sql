-- Añade columna abbreviation (máx 4 chars) a teams
-- Inicializa con los primeros 3 chars del short_name si existe

ALTER TABLE teams
  ADD COLUMN abbreviation VARCHAR(4) NULL DEFAULT NULL
  AFTER short_name;

UPDATE teams
  SET abbreviation = UPPER(LEFT(short_name, 3))
  WHERE abbreviation IS NULL AND short_name IS NOT NULL AND short_name != '';
