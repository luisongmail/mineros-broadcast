insert into public.teams (
  id,
  name,
  short_name,
  logo_asset_id,
  city,
  country,
  primary_color,
  secondary_color
)
values
  (
    'team-mineros',
    'Mineros de Santiago',
    'MIN',
    'AM-LOGO-001',
    'Santiago de los Caballeros',
    'DO',
    '#D71920',
    '#1B2F5B'
  ),
  (
    'team-caimanes',
    'Caimanes de El Seibo',
    'CAI',
    'AM-TEAM-CAI-001',
    'El Seibo',
    'DO',
    '#116149',
    '#E1C15A'
  )
on conflict (id) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  logo_asset_id = excluded.logo_asset_id,
  city = excluded.city,
  country = excluded.country,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  updated_at = now();

insert into public.players (
  id,
  team_id,
  number,
  name,
  position,
  bats,
  throws,
  photo_asset_id,
  stats,
  status
)
values
  ('player-min-01', 'team-mineros', '2', 'Luis Javier Peña', 'CF', 'R', 'R', 'AM-PLAYER-MIN-01', '{"avg":"0.321","obp":"0.387","slg":"0.468","hr":4,"rbi":18,"sb":11}'::jsonb, 'active'),
  ('player-min-02', 'team-mineros', '11', 'Anderson Rosario', 'SS', 'S', 'R', 'AM-PLAYER-MIN-02', '{"avg":"0.298","obp":"0.356","slg":"0.421","hr":3,"rbi":14,"sb":7}'::jsonb, 'active'),
  ('player-min-03', 'team-mineros', '34', 'Rafael de la Cruz', '1B', 'L', 'R', 'AM-PLAYER-MIN-03', '{"avg":"0.315","obp":"0.402","slg":"0.544","hr":8,"rbi":29,"doubles":12}'::jsonb, 'active'),
  ('player-min-04', 'team-mineros', '27', 'Kelvin Marte', 'RF', 'R', 'R', 'AM-PLAYER-MIN-04', '{"avg":"0.287","obp":"0.349","slg":"0.501","hr":6,"rbi":23,"sb":5}'::jsonb, 'active'),
  ('player-min-05', 'team-mineros', '15', 'Miguel Taveras', '3B', 'R', 'R', 'AM-PLAYER-MIN-05', '{"avg":"0.274","obp":"0.338","slg":"0.430","hr":5,"rbi":19,"errors":3}'::jsonb, 'active'),
  ('player-min-06', 'team-mineros', '8', 'José Manuel Lora', 'LF', 'L', 'L', 'AM-PLAYER-MIN-06', '{"avg":"0.301","obp":"0.365","slg":"0.455","hr":4,"rbi":17,"triples":2}'::jsonb, 'active'),
  ('player-min-07', 'team-mineros', '4', 'Pedro Castillo', '2B', 'R', 'R', 'AM-PLAYER-MIN-07', '{"avg":"0.269","obp":"0.331","slg":"0.389","hr":2,"rbi":15,"sb":9}'::jsonb, 'active'),
  ('player-min-08', 'team-mineros', '19', 'Carlos Jiménez', 'C', 'R', 'R', 'AM-PLAYER-MIN-08', '{"avg":"0.256","obp":"0.319","slg":"0.401","hr":3,"rbi":16,"cs_pct":"0.34"}'::jsonb, 'active'),
  ('player-min-09', 'team-mineros', '48', 'Ángel Morel', 'P', 'R', 'R', 'AM-PLAYER-MIN-09', '{"era":"2.91","ip":"43.1","so":39,"bb":12,"whip":"1.14","w":3,"l":1}'::jsonb, 'active'),
  ('player-cai-01', 'team-caimanes', '7', 'Emilio Corporán', 'CF', 'L', 'L', 'AM-PLAYER-CAI-01', '{"avg":"0.294","obp":"0.363","slg":"0.438","hr":3,"rbi":15,"sb":10}'::jsonb, 'active'),
  ('player-cai-02', 'team-caimanes', '12', 'Richard Montero', 'SS', 'R', 'R', 'AM-PLAYER-CAI-02', '{"avg":"0.281","obp":"0.342","slg":"0.412","hr":2,"rbi":13,"sb":6}'::jsonb, 'active'),
  ('player-cai-03', 'team-caimanes', '25', 'Freddy Alcántara', '1B', 'R', 'R', 'AM-PLAYER-CAI-03', '{"avg":"0.309","obp":"0.391","slg":"0.519","hr":7,"rbi":27,"doubles":10}'::jsonb, 'active'),
  ('player-cai-04', 'team-caimanes', '31', 'Juan Estévez', 'RF', 'R', 'R', 'AM-PLAYER-CAI-04', '{"avg":"0.276","obp":"0.334","slg":"0.447","hr":5,"rbi":20,"sb":4}'::jsonb, 'active'),
  ('player-cai-05', 'team-caimanes', '10', 'Samuel Paredes', '3B', 'S', 'R', 'AM-PLAYER-CAI-05', '{"avg":"0.263","obp":"0.327","slg":"0.398","hr":3,"rbi":14,"errors":4}'::jsonb, 'active'),
  ('player-cai-06', 'team-caimanes', '22', 'Wander Féliz', 'LF', 'L', 'L', 'AM-PLAYER-CAI-06', '{"avg":"0.288","obp":"0.351","slg":"0.436","hr":4,"rbi":18,"triples":1}'::jsonb, 'active'),
  ('player-cai-07', 'team-caimanes', '5', 'Yeison Ramírez', '2B', 'R', 'R', 'AM-PLAYER-CAI-07', '{"avg":"0.257","obp":"0.319","slg":"0.372","hr":1,"rbi":11,"sb":8}'::jsonb, 'active'),
  ('player-cai-08', 'team-caimanes', '18', 'Héctor Valdez', 'C', 'R', 'R', 'AM-PLAYER-CAI-08', '{"avg":"0.249","obp":"0.311","slg":"0.385","hr":2,"rbi":12,"cs_pct":"0.31"}'::jsonb, 'active'),
  ('player-cai-09', 'team-caimanes', '52', 'Rony de Jesús', 'P', 'L', 'L', 'AM-PLAYER-CAI-09', '{"era":"3.42","ip":"47.1","so":35,"bb":16,"whip":"1.28","w":2,"l":2}'::jsonb, 'active')
on conflict (id) do update
set
  team_id = excluded.team_id,
  number = excluded.number,
  name = excluded.name,
  position = excluded.position,
  bats = excluded.bats,
  throws = excluded.throws,
  photo_asset_id = excluded.photo_asset_id,
  stats = excluded.stats,
  status = excluded.status,
  updated_at = now();

insert into public.games (
  id,
  home_team_id,
  away_team_id,
  status,
  scheduled_at,
  started_at,
  venue,
  season,
  game_number,
  final_score,
  game_state
)
values (
  'game-2026-06-24-min-cai-001',
  'team-mineros',
  'team-caimanes',
  'live',
  '2026-06-24T19:00:00-04:00',
  '2026-06-24T19:08:00-04:00',
  'Estadio Cibao',
  'LIDOM 2026-2027',
  12,
  null,
  '{
    "gameId": "game-2026-06-24-min-cai-001",
    "status": "live",
    "inning": 4,
    "inningHalf": "bottom",
    "outs": 1,
    "bases": { "first": true, "second": false, "third": true },
    "count": { "balls": 2, "strikes": 1 },
    "score": { "home": 3, "away": 2 },
    "homeTeam": {
      "id": "team-mineros",
      "name": "Mineros de Santiago",
      "shortName": "MIN",
      "logoAssetId": "AM-LOGO-001"
    },
    "awayTeam": {
      "id": "team-caimanes",
      "name": "Caimanes de El Seibo",
      "shortName": "CAI",
      "logoAssetId": "AM-TEAM-CAI-001"
    },
    "currentBatterId": "player-min-04",
    "currentPitcherId": "player-cai-09"
  }'::jsonb
)
on conflict (id) do update
set
  home_team_id = excluded.home_team_id,
  away_team_id = excluded.away_team_id,
  status = excluded.status,
  scheduled_at = excluded.scheduled_at,
  started_at = excluded.started_at,
  venue = excluded.venue,
  season = excluded.season,
  game_number = excluded.game_number,
  final_score = excluded.final_score,
  game_state = excluded.game_state,
  updated_at = now();

insert into public.game_lineups (
  id,
  game_id,
  team_id,
  player_id,
  batting_order,
  position,
  is_starter
)
values
  ('lineup-min-01', 'game-2026-06-24-min-cai-001', 'team-mineros', 'player-min-01', 1, 'CF', true),
  ('lineup-min-02', 'game-2026-06-24-min-cai-001', 'team-mineros', 'player-min-02', 2, 'SS', true),
  ('lineup-min-03', 'game-2026-06-24-min-cai-001', 'team-mineros', 'player-min-03', 3, '1B', true),
  ('lineup-min-04', 'game-2026-06-24-min-cai-001', 'team-mineros', 'player-min-04', 4, 'RF', true),
  ('lineup-min-05', 'game-2026-06-24-min-cai-001', 'team-mineros', 'player-min-05', 5, '3B', true),
  ('lineup-min-06', 'game-2026-06-24-min-cai-001', 'team-mineros', 'player-min-06', 6, 'LF', true),
  ('lineup-min-07', 'game-2026-06-24-min-cai-001', 'team-mineros', 'player-min-07', 7, '2B', true),
  ('lineup-min-08', 'game-2026-06-24-min-cai-001', 'team-mineros', 'player-min-08', 8, 'C', true),
  ('lineup-min-09', 'game-2026-06-24-min-cai-001', 'team-mineros', 'player-min-09', 9, 'P', true),
  ('lineup-cai-01', 'game-2026-06-24-min-cai-001', 'team-caimanes', 'player-cai-01', 1, 'CF', true),
  ('lineup-cai-02', 'game-2026-06-24-min-cai-001', 'team-caimanes', 'player-cai-02', 2, 'SS', true),
  ('lineup-cai-03', 'game-2026-06-24-min-cai-001', 'team-caimanes', 'player-cai-03', 3, '1B', true),
  ('lineup-cai-04', 'game-2026-06-24-min-cai-001', 'team-caimanes', 'player-cai-04', 4, 'RF', true),
  ('lineup-cai-05', 'game-2026-06-24-min-cai-001', 'team-caimanes', 'player-cai-05', 5, '3B', true),
  ('lineup-cai-06', 'game-2026-06-24-min-cai-001', 'team-caimanes', 'player-cai-06', 6, 'LF', true),
  ('lineup-cai-07', 'game-2026-06-24-min-cai-001', 'team-caimanes', 'player-cai-07', 7, '2B', true),
  ('lineup-cai-08', 'game-2026-06-24-min-cai-001', 'team-caimanes', 'player-cai-08', 8, 'C', true),
  ('lineup-cai-09', 'game-2026-06-24-min-cai-001', 'team-caimanes', 'player-cai-09', 9, 'P', true)
on conflict (id) do update
set
  game_id = excluded.game_id,
  team_id = excluded.team_id,
  player_id = excluded.player_id,
  batting_order = excluded.batting_order,
  position = excluded.position,
  is_starter = excluded.is_starter;

insert into public.sponsors (
  id,
  name,
  brand,
  asset_id,
  status,
  priority,
  weight,
  allowed_placements,
  start_date,
  end_date,
  exposure_limits,
  blackout_rules,
  metadata
)
values
  (
    'sponsor-agua-yaque',
    'Agua Yaque',
    'Agua Yaque',
    'AM-SPONSOR-101',
    'active',
    85,
    60,
    '["scorebug","sponsor_overlay","fullscreen","summary"]'::jsonb,
    '2026-06-01T00:00:00Z',
    '2026-12-31T23:59:59Z',
    '{"maxPerGame":18,"minSecondsBetween":120}'::jsonb,
    '[]'::jsonb,
    '{"category":"bebidas","owner":"comercial","contact":"ejecutivo-agua-yaque"}'::jsonb
  ),
  (
    'sponsor-cafe-cibao',
    'Café del Cibao',
    'Café del Cibao',
    'AM-SPONSOR-102',
    'active',
    72,
    40,
    '["ticker","lineup","sponsor_overlay","summary"]'::jsonb,
    '2026-06-15T00:00:00Z',
    '2026-12-31T23:59:59Z',
    '{"maxPerGame":14,"minSecondsBetween":180}'::jsonb,
    '[{"sceneId":"final_score_overlay","blocked":true}]'::jsonb,
    '{"category":"alimentos","owner":"comercial","contact":"ejecutivo-cafe-cibao"}'::jsonb
  )
on conflict (id) do update
set
  name = excluded.name,
  brand = excluded.brand,
  asset_id = excluded.asset_id,
  status = excluded.status,
  priority = excluded.priority,
  weight = excluded.weight,
  allowed_placements = excluded.allowed_placements,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  exposure_limits = excluded.exposure_limits,
  blackout_rules = excluded.blackout_rules,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.campaigns (
  id,
  name,
  status,
  placements,
  start_date,
  end_date,
  rules
)
values (
  'campaign-temporada-regular-2026',
  'Temporada Regular Mineros 2026',
  'active',
  '["scorebug","ticker","sponsor_overlay","summary","lineup"]'::jsonb,
  '2026-06-01T00:00:00Z',
  '2026-12-31T23:59:59Z',
  '{"rotationMode":"weighted","allowDuringLivePlay":false,"allowBetweenInnings":true,"maxConsecutiveForSameSponsor":2}'::jsonb
)
on conflict (id) do update
set
  name = excluded.name,
  status = excluded.status,
  placements = excluded.placements,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  rules = excluded.rules,
  updated_at = now();

insert into public.campaign_sponsors (campaign_id, sponsor_id)
values
  ('campaign-temporada-regular-2026', 'sponsor-agua-yaque'),
  ('campaign-temporada-regular-2026', 'sponsor-cafe-cibao')
on conflict (campaign_id, sponsor_id) do nothing;

insert into public.sponsor_impressions (
  id,
  sponsor_id,
  campaign_id,
  game_id,
  placement,
  zone_id,
  scene_id,
  trigger,
  started_at,
  ended_at,
  duration_seconds
)
values
  (
    'impression-demo-001',
    'sponsor-agua-yaque',
    'campaign-temporada-regular-2026',
    'game-2026-06-24-min-cai-001',
    'scorebug',
    'zone-a',
    'scorebug',
    'automatic',
    '2026-06-24T19:11:00-04:00',
    '2026-06-24T19:13:30-04:00',
    150
  ),
  (
    'impression-demo-002',
    'sponsor-cafe-cibao',
    'campaign-temporada-regular-2026',
    'game-2026-06-24-min-cai-001',
    'lineup',
    'zone-f',
    'lineup_overlay',
    'manual',
    '2026-06-24T18:57:00-04:00',
    '2026-06-24T18:57:20-04:00',
    20
  )
on conflict (id) do update
set
  sponsor_id = excluded.sponsor_id,
  campaign_id = excluded.campaign_id,
  game_id = excluded.game_id,
  placement = excluded.placement,
  zone_id = excluded.zone_id,
  scene_id = excluded.scene_id,
  trigger = excluded.trigger,
  started_at = excluded.started_at,
  ended_at = excluded.ended_at,
  duration_seconds = excluded.duration_seconds;

insert into public.operator_actions (
  id,
  game_id,
  operator_id,
  role,
  action,
  overlay_id,
  payload,
  result,
  created_at
)
values
  (
    'operator-action-001',
    'game-2026-06-24-min-cai-001',
    'operator-001',
    'director',
    'preview_overlay',
    'batter_overlay',
    '{"target":"preview","playerId":"player-min-04","correlationId":"corr-operator-action-000101"}'::jsonb,
    'ok',
    '2026-06-24T19:24:10-04:00'
  ),
  (
    'operator-action-002',
    'game-2026-06-24-min-cai-001',
    'operator-001',
    'director',
    'take_overlay',
    'batter_overlay',
    '{"target":"program","playerId":"player-min-04","correlationId":"corr-operator-action-000102"}'::jsonb,
    'ok',
    '2026-06-24T19:24:15-04:00'
  ),
  (
    'operator-action-003',
    'game-2026-06-24-min-cai-001',
    'operator-002',
    'operador',
    'hide_overlay',
    'lineup_overlay',
    '{"target":"program","reason":"auto_hide_complete","correlationId":"corr-operator-action-000103"}'::jsonb,
    'ok',
    '2026-06-24T19:24:38-04:00'
  )
on conflict (id) do update
set
  game_id = excluded.game_id,
  operator_id = excluded.operator_id,
  role = excluded.role,
  action = excluded.action,
  overlay_id = excluded.overlay_id,
  payload = excluded.payload,
  result = excluded.result,
  created_at = excluded.created_at;

insert into public.overlay_configs (
  overlay_id,
  default_variant,
  auto_hide_ms,
  priority,
  preferred_zone,
  config
)
values
  ('scorebug', 'default', null, 100, 'zone-a', '{"persistent":true,"locked":true,"showSponsorBadge":true}'::jsonb),
  ('batter_overlay', 'compact', 8000, 80, 'zone-c', '{"requiresPreview":true,"showHeadshot":true,"showSeasonStats":true}'::jsonb),
  ('lineup_overlay', 'full', 12000, 70, 'zone-f', '{"requiresPreview":true,"allowSponsorSlot":true}'::jsonb),
  ('next_batters_overlay', 'default', 7000, 65, 'zone-c', '{"requiresPreview":true,"maxPlayers":3}'::jsonb),
  ('pitcher_overlay', 'default', 8000, 78, 'zone-c', '{"requiresPreview":true,"showPitchCount":true}'::jsonb),
  ('game_event_overlay', 'highlight', 6000, 90, 'zone-b', '{"requiresPreview":false,"allowForceShow":true}'::jsonb),
  ('inning_transition_overlay', 'default', 9000, 75, 'zone-f', '{"requiresPreview":false,"allowDuringLivePlay":false}'::jsonb),
  ('sponsor_break_overlay', 'full', 15000, 85, 'zone-f', '{"requiresPreview":true,"commercial":true}'::jsonb),
  ('announcement_overlay', 'default', 10000, 68, 'zone-d', '{"requiresPreview":true,"allowManualDismiss":true}'::jsonb),
  ('social_lower_third', 'default', 10000, 60, 'zone-e', '{"requiresPreview":true,"hasTickerBehavior":false}'::jsonb),
  ('countdown_overlay', 'default', 30000, 72, 'zone-f', '{"requiresPreview":true,"showSeconds":true}'::jsonb),
  ('final_score_overlay', 'default', null, 88, 'zone-f', '{"requiresPreview":true,"persistentUntilHidden":true}'::jsonb)
on conflict (overlay_id) do update
set
  default_variant = excluded.default_variant,
  auto_hide_ms = excluded.auto_hide_ms,
  priority = excluded.priority,
  preferred_zone = excluded.preferred_zone,
  config = excluded.config,
  updated_at = now();
