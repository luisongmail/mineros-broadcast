-- Spec 29: S2 — Vocabulario controlado de eventos y runner movements en at_bats

-- event_type: vocabulario MLBAM controlado (reemplaza el uso libre de result VARCHAR(50))
-- runners: array JSON de movimientos de corredores en la jugada (estructura MLBAM)

ALTER TABLE at_bats
  ADD COLUMN event_type   VARCHAR(40)  NULL  COMMENT 'vocabulario MLBAM: single|double|triple|home_run|strikeout|walk|field_out|...',
  ADD COLUMN runners      JSON         NULL  COMMENT 'array [{runnerId,from,to,earned,outNumber,responsiblePitcherId}]';

-- Backfill: mapear result → event_type para datos existentes
UPDATE at_bats SET event_type = result
WHERE event_type IS NULL AND result IN (
  'single','double','triple','home_run',
  'strikeout','walk','intent_walk','hit_by_pitch',
  'field_out','force_out','grounded_into_double_play',
  'fielders_choice','field_error','sac_fly','sac_bunt',
  'strikeout_double_play','double_play','triple_play',
  'fielders_choice_out','sac_fly_double_play','sac_bunt_double_play',
  'catcher_interference','batter_interference'
);
