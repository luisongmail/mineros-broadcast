-- ============================================================
-- 002_demo_seed.sql
-- Datos base del sistema (sports, overlay configs, sponsors)
-- NO contiene equipos ni partidos específicos
-- Los datos de partidos van en archivos 003_*.sql
-- ============================================================

-- ------------------------------------------------------------
-- DISCIPLINAS DEPORTIVAS
-- ------------------------------------------------------------
INSERT IGNORE INTO sports (id, name, gender, has_pitcher, default_rules) VALUES
('baseball',        'Béisbol',         'mixed', 1, '{"inningsCount":9,"maxOuts":3,"maxBalls":4,"maxStrikes":3,"batterAttempts":null,"hasPitcher":true,"timeLimitMinutes":null,"mercyRule":[],"extraInnings":{"type":"standard"},"continuousBatting":false,"buntsAllowed":true,"dpFlexAllowed":false,"pitchClockSeconds":null}'),
('baseball_amateur','Béisbol Amateur',  'mixed', 1, '{"inningsCount":7,"maxOuts":3,"maxBalls":4,"maxStrikes":3,"batterAttempts":null,"hasPitcher":true,"timeLimitMinutes":null,"mercyRule":[{"afterInning":5,"runDiff":10}],"extraInnings":{"type":"standard"},"continuousBatting":false,"buntsAllowed":true,"dpFlexAllowed":false,"pitchClockSeconds":null}'),
('softball_fast',   'Softball Rápido', 'mixed', 1, '{"inningsCount":7,"maxOuts":3,"maxBalls":4,"maxStrikes":3,"batterAttempts":null,"hasPitcher":true,"timeLimitMinutes":null,"mercyRule":[{"afterInning":5,"runDiff":10}],"extraInnings":{"type":"runner_on_second"},"continuousBatting":false,"buntsAllowed":true,"dpFlexAllowed":true,"pitchClockSeconds":null}'),
('softball_slow',   'Softball Lento',  'mixed', 1, '{"inningsCount":7,"maxOuts":3,"maxBalls":4,"maxStrikes":3,"batterAttempts":null,"hasPitcher":true,"timeLimitMinutes":null,"mercyRule":[{"afterInning":5,"runDiff":10}],"extraInnings":{"type":"runner_on_second"},"continuousBatting":true,"buntsAllowed":false,"dpFlexAllowed":false,"pitchClockSeconds":null}'),
('baseball5',       'Baseball5',       'mixed', 0, '{"inningsCount":5,"maxOuts":3,"maxBalls":null,"maxStrikes":3,"batterAttempts":1,"hasPitcher":false,"timeLimitMinutes":null,"mercyRule":[{"afterInning":3,"runDiff":10}],"extraInnings":{"type":"b5_escalating"},"continuousBatting":true,"buntsAllowed":false,"dpFlexAllowed":false,"pitchClockSeconds":null}');

-- ------------------------------------------------------------
-- OVERLAY CONFIGS — configuración default por overlay
-- ------------------------------------------------------------
INSERT INTO overlay_configs (overlay_id, default_variant, auto_hide_ms, priority, preferred_zone, config)
VALUES
  ('scorebug',                'default',   NULL,  100, 'zone-a', '{"persistent":true,"locked":true,"showSponsorBadge":true}'),
  ('batter_overlay',          'compact',   8000,   80, 'zone-c', '{"requiresPreview":true,"showHeadshot":true,"showSeasonStats":true}'),
  ('lineup_overlay',          'full',     12000,   70, 'zone-f', '{"requiresPreview":true,"allowSponsorSlot":true}'),
  ('next_batters_overlay',    'default',   7000,   65, 'zone-c', '{"requiresPreview":true,"maxPlayers":3}'),
  ('pitcher_overlay',         'default',   8000,   78, 'zone-c', '{"requiresPreview":true,"showPitchCount":true}'),
  ('game_event_overlay',      'highlight', 6000,   90, 'zone-b', '{"requiresPreview":false,"allowForceShow":true}'),
  ('inning_transition_overlay','default',  9000,   75, 'zone-f', '{"requiresPreview":false,"allowDuringLivePlay":false}'),
  ('sponsor_break_overlay',   'full',     15000,   85, 'zone-f', '{"requiresPreview":true,"commercial":true}'),
  ('announcement_overlay',    'default',  10000,   68, 'zone-d', '{"requiresPreview":true,"allowManualDismiss":true}'),
  ('social_lower_third',      'default',  10000,   60, 'zone-e', '{"requiresPreview":true,"hasTickerBehavior":false}'),
  ('countdown_overlay',       'default',  30000,   72, 'zone-f', '{"requiresPreview":true,"showSeconds":true}'),
  ('final_score_overlay',     'default',   NULL,   88, 'zone-f', '{"requiresPreview":true,"persistentUntilHidden":true}')
ON DUPLICATE KEY UPDATE
  default_variant = VALUES(default_variant),
  auto_hide_ms    = VALUES(auto_hide_ms),
  priority        = VALUES(priority),
  preferred_zone  = VALUES(preferred_zone),
  config          = VALUES(config),
  updated_at      = CURRENT_TIMESTAMP(3);

-- ------------------------------------------------------------
-- SPONSORS — patrocinadores genéricos del sistema
-- ------------------------------------------------------------
INSERT INTO sponsors (id, name, brand, asset_id, status, priority, weight, allowed_placements, start_date, end_date, exposure_limits, blackout_rules, metadata)
VALUES
  ('sponsor-agua-yaque', 'Agua Yaque', 'Agua Yaque', 'sponsors/agua-yaque-logo', 'active', 85, 60,
   '["scorebug","sponsor_overlay","fullscreen","summary"]',
   '2026-01-01', '2026-12-31',
   '{"maxPerGame":18,"minSecondsBetween":120}', '[]',
   '{"category":"bebidas"}'),
  ('sponsor-cafe-cibao', 'Café del Cibao', 'Café del Cibao', 'sponsors/cafe-cibao-logo', 'active', 72, 40,
   '["ticker","lineup","sponsor_overlay","summary"]',
   '2026-01-01', '2026-12-31',
   '{"maxPerGame":14,"minSecondsBetween":180}',
   '[{"sceneId":"final_score_overlay","blocked":true}]',
   '{"category":"alimentos"}')
ON DUPLICATE KEY UPDATE
  name = VALUES(name), asset_id = VALUES(asset_id), status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP(3);

-- ------------------------------------------------------------
-- CAMPAIGN
-- ------------------------------------------------------------
INSERT INTO campaigns (id, name, status, placements, start_date, end_date, rules)
VALUES (
  'campaign-exhibicion-2026',
  'Exhibición Softball 2026',
  'active',
  '["scorebug","ticker","sponsor_overlay","summary","lineup"]',
  '2026-01-01', '2026-12-31',
  '{"rotationMode":"weighted","allowDuringLivePlay":false,"allowBetweenInnings":true,"maxConsecutiveForSameSponsor":2}'
)
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status), updated_at = CURRENT_TIMESTAMP(3);

INSERT IGNORE INTO campaign_sponsors (campaign_id, sponsor_id) VALUES
  ('campaign-exhibicion-2026', 'sponsor-agua-yaque'),
  ('campaign-exhibicion-2026', 'sponsor-cafe-cibao');
