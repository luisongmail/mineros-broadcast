-- Spec 29: S1 — Coordenadas físicas métricas en tabla pitches
-- Sistema de referencia: metros (plate_x/plate_z), km/h (velocidades), cm (movimiento)
-- Zona MLBAM: 1-9 strike, 11-14 bola — calculada desde coordenadas reales

ALTER TABLE pitches
  ADD COLUMN plate_x      DECIMAL(7,4)       NULL  COMMENT 'metros desde centro del plato (izq negativo, der positivo)',
  ADD COLUMN plate_z      DECIMAL(7,4)       NULL  COMMENT 'metros desde el suelo',
  ADD COLUMN zone         TINYINT UNSIGNED   NULL  COMMENT '1-9 zona strike, 11-14 zona bola (MLBAM)',
  ADD COLUMN sz_top       DECIMAL(5,4)       NULL  COMMENT 'tope de zona de strike en metros (se mide por bateador)',
  ADD COLUMN sz_bottom    DECIMAL(5,4)       NULL  COMMENT 'fondo de zona de strike en metros',
  ADD COLUMN pfx_x        DECIMAL(6,2)       NULL  COMMENT 'movimiento horizontal en cm vs lanzamiento sin efecto',
  ADD COLUMN pfx_z        DECIMAL(6,2)       NULL  COMMENT 'movimiento vertical en cm vs lanzamiento sin efecto',
  ADD COLUMN start_speed  DECIMAL(6,2)       NULL  COMMENT 'velocidad de salida en km/h',
  ADD COLUMN end_speed    DECIMAL(6,2)       NULL  COMMENT 'velocidad al llegar al plato en km/h',
  ADD COLUMN spin_rate    SMALLINT UNSIGNED  NULL  COMMENT 'revoluciones por minuto (rpm)',
  ADD COLUMN spin_axis    SMALLINT UNSIGNED  NULL  COMMENT 'eje de rotación en grados (0-360)',
  ADD COLUMN pitch_class  VARCHAR(2)         NULL  COMMENT 'código MLBAM/WBSC: FF SI FC SL CU CH RB DB DR DC KN EP SC',
  ADD COLUMN confidence   DECIMAL(4,3)       NULL  COMMENT 'confianza de clasificación del dispositivo (0.000-1.000)',
  ADD COLUMN device_id    VARCHAR(50)        NULL  COMMENT 'identificador del dispositivo que generó los datos';
