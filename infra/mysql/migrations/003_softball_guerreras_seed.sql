-- ============================================================
-- 003_softball_guerreras_seed.sql
-- Partido de exhibición: Las Guerreras vs Team Chile
-- Fecha: 11 de junio 2026 — Estadio Mineros Peñalolén
-- Softball Rápido Femenino
-- ============================================================

-- ------------------------------------------------------------
-- LEAGUE — contenedor para juegos de exhibición
-- ------------------------------------------------------------
INSERT INTO leagues (id, sport_id, name, short_name, country, level)
VALUES ('league-exhibicion-softball-cl', 'softball_fast', 'Softball Exhibición Chile', 'EXHIB-SB', 'CL', 'exhibition')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ------------------------------------------------------------
-- TOURNAMENT — juego de exhibición específico
-- ------------------------------------------------------------
INSERT INTO tournaments (id, league_id, name, short_name, type, season, start_date, end_date, status)
VALUES (
  'tournament-exhibicion-jun2026',
  'league-exhibicion-softball-cl',
  'Exhibición Softball — Junio 2026',
  'EXHIB-JUN26',
  'exhibition',
  '2026',
  '2026-06-11',
  '2026-06-11',
  'completed'
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ------------------------------------------------------------
-- TEAMS
-- ------------------------------------------------------------
INSERT INTO teams (id, name, short_name, logo_asset_id, city, country, primary_color, secondary_color)
VALUES
  ('team-guerreras', 'Las Guerreras', 'GUE', 'teams/guerreras-logo', 'Santiago de Chile', 'VE', '#760B24', '#FFFFFF'),
  ('team-chile',     'Team Chile',    'CHI', 'teams/teamchile-logo', 'Santiago de Chile', 'CL', '#CC0F0C', '#01299F')
ON DUPLICATE KEY UPDATE
  name            = VALUES(name),
  logo_asset_id   = VALUES(logo_asset_id),
  primary_color   = VALUES(primary_color),
  secondary_color = VALUES(secondary_color);

-- ------------------------------------------------------------
-- TOURNAMENT_TEAMS
-- ------------------------------------------------------------
INSERT IGNORE INTO tournament_teams (id, tournament_id, team_id, seeding)
VALUES
  (UUID(), 'tournament-exhibicion-jun2026', 'team-guerreras', 1),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile',     2);

-- ------------------------------------------------------------
-- PLAYERS — Las Guerreras (VE)
-- ------------------------------------------------------------
INSERT INTO players (id, first_name, last_name, name, team_id, number, position, bats, throws, photo_asset_id, nationality, gender)
VALUES
  ('player-gue-01', 'Angélica',  'González',  'Angélica González',  'team-guerreras', '20', 'LF', 'R', 'R', 'players/gue-p-01-angelica',        'VE', 'female'),
  ('player-gue-02', 'Mariela',   'Diaz',       'Mariela Diaz',       'team-guerreras', '21', '1B', 'R', 'R', 'players/gue-p-02-mariela-diaz',     'VE', 'female'),
  ('player-gue-03', 'María',     'Gabriela',   'María Gabriela',     'team-guerreras', '22', '3B', 'R', 'R', 'players/gue-p-03-maria-gabriela',   'VE', 'female'),
  ('player-gue-04', 'Jessica',   'Martínez',   'Jessica Martínez',   'team-guerreras', '23', 'P',  'R', 'R', 'players/gue-p-04-jessica',          'VE', 'female'),
  ('player-gue-05', 'Merly',     'Rodríguez',  'Merly Rodríguez',    'team-guerreras', '25', 'CF', 'R', 'R', 'players/gue-p-05-merly',            'VE', 'female'),
  ('player-gue-06', 'María',     'Mora',       'María Mora',         'team-guerreras', '26', 'C',  'R', 'R', 'players/gue-p-06-maria-mora',       'VE', 'female'),
  ('player-gue-07', 'Raquel',    'Hernández',  'Raquel Hernández',   'team-guerreras', '27', 'RF', 'R', 'R', 'players/gue-p-07-raquel',           'VE', 'female'),
  ('player-gue-08', 'Mariant',   'Reyes',      'Mariant Reyes',      'team-guerreras', '28', '2B', 'R', 'R', 'players/gue-p-08-mariant-reyes',    'VE', 'female'),
  ('player-gue-09', 'Maoly',     'Talamonty',  'Maoly Talamonty',    'team-guerreras', '29', 'SS', 'R', 'R', 'players/gue-p-09-maoly-talamonty', 'VE', 'female')
ON DUPLICATE KEY UPDATE
  name           = VALUES(name),
  photo_asset_id = VALUES(photo_asset_id),
  team_id        = VALUES(team_id);

-- ------------------------------------------------------------
-- PLAYERS — Team Chile (CL)
-- ------------------------------------------------------------
INSERT INTO players (id, first_name, last_name, name, team_id, number, position, bats, throws, photo_asset_id, nationality, gender)
VALUES
  ('player-chi-01', 'Constanza', 'Aguilera',    'Constanza Aguilera',    'team-chile', '3',  '1B',      'R', 'R', 'players/chi-p-01-constanza-aguilera',  'CL', 'female'),
  ('player-chi-02', 'Florencia', 'Honorato',    'Florencia Honorato',    'team-chile', '5',  'DP',      'R', 'R', 'players/chi-p-02-florencia-honorato',  'CL', 'female'),
  ('player-chi-03', 'Daniela',   'De Oliveira', 'Daniela De Oliveira',   'team-chile', '6',  'SS',      'R', 'R', 'players/chi-p-03-daniela-deoliveira',  'CL', 'female'),
  ('player-chi-04', 'Vanessa',   'Adams',       'Vanessa Adams',         'team-chile', '11', 'Suplente','R', 'R', 'players/chi-p-04-vanessa-adams',       'CL', 'female'),
  ('player-chi-05', 'Cecilia',   'Muñoz',       'Cecilia Muñoz',         'team-chile', '13', 'Suplente','R', 'R', 'players/chi-p-05-cecilia-munoz',       'CL', 'female'),
  ('player-chi-06', 'Martina',   'Pellizaris',  'Martina Pellizaris',    'team-chile', '16', '3B',      'R', 'R', 'players/chi-p-06-martina-pellizaris',  'CL', 'female'),
  ('player-chi-07', 'Carolina',  'Jara',        'Carolina Jara',         'team-chile', '17', '2B',      'R', 'R', 'players/chi-p-07-carolina-jara',       'CL', 'female'),
  ('player-chi-08', 'Constanza', 'Espinoza',    'Constanza Espinoza',    'team-chile', '22', 'RF',      'R', 'R', 'players/chi-p-08-constanza-espinoza',  'CL', 'female'),
  ('player-chi-09', 'Catalina',  'Guerra',      'Catalina Guerra',       'team-chile', '24', 'P',       'R', 'R', 'players/chi-p-09-catalina-guerra',     'CL', 'female'),
  ('player-chi-10', 'Marianny',  'Mendez',      'Marianny Mendez',       'team-chile', '27', 'LF',      'R', 'R', 'players/chi-p-10-marianny-mendez',     'CL', 'female'),
  ('player-chi-11', 'María',     'Mondeja',     'María Mondeja',         'team-chile', '42', 'CF',      'R', 'R', 'players/chi-p-11-maria-mondeja',       'CL', 'female'),
  ('player-chi-12', 'Barbara',   'Carrasco',    'Barbara Carrasco',      'team-chile', '14', 'C',       'R', 'R', 'players/chi-p-12-barbara-carrasco',    'CL', 'female')
ON DUPLICATE KEY UPDATE
  name           = VALUES(name),
  photo_asset_id = VALUES(photo_asset_id),
  team_id        = VALUES(team_id);

-- ------------------------------------------------------------
-- ROSTERS — Las Guerreras en el torneo
-- ------------------------------------------------------------
INSERT IGNORE INTO rosters (id, tournament_id, team_id, player_id, number, position, batting_slot, status)
VALUES
  (UUID(), 'tournament-exhibicion-jun2026', 'team-guerreras', 'player-gue-01', '20', 'LF', 1,  'active'),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-guerreras', 'player-gue-02', '21', '1B', 2,  'active'),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-guerreras', 'player-gue-03', '22', '3B', 3,  'active'),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-guerreras', 'player-gue-04', '23', 'P',  9,  'active'),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-guerreras', 'player-gue-05', '25', 'CF', 4,  'active'),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-guerreras', 'player-gue-06', '26', 'C',  5,  'active'),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-guerreras', 'player-gue-07', '27', 'RF', 6,  'active'),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-guerreras', 'player-gue-08', '28', '2B', 7,  'active'),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-guerreras', 'player-gue-09', '29', 'SS', 8,  'active');

-- ------------------------------------------------------------
-- ROSTERS — Team Chile en el torneo
-- ------------------------------------------------------------
INSERT IGNORE INTO rosters (id, tournament_id, team_id, player_id, number, position, batting_slot, status, is_dp)
VALUES
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-01', '3',  '1B', 1,  'active', 0),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-02', '5',  'DP', 2,  'active', 1),  -- Bateadora Designada
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-03', '6',  'SS', 3,  'active', 0),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-04', '11', 'Suplente', NULL, 'active', 0),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-05', '13', 'Suplente', NULL, 'active', 0),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-06', '16', '3B', 4,  'active', 0),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-07', '17', '2B', 5,  'active', 0),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-08', '22', 'RF', 6,  'active', 0),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-09', '24', 'P',  10, 'active', 0),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-10', '27', 'LF', 7,  'active', 0),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-11', '42', 'CF', 8,  'active', 0),
  (UUID(), 'tournament-exhibicion-jun2026', 'team-chile', 'player-chi-12', '14', 'C',  9,  'active', 0);

-- ------------------------------------------------------------
-- GAME
-- ------------------------------------------------------------
INSERT INTO games (id, tournament_id, home_team_id, away_team_id, status, scheduled_at, venue, season)
VALUES (
  'game-gue-vs-chi-20260611',
  'tournament-exhibicion-jun2026',
  'team-chile',
  'team-guerreras',
  'completed',
  '2026-06-11 10:00:00',
  'Estadio Mineros Peñalolén',
  '2026'
)
ON DUPLICATE KEY UPDATE
  venue       = VALUES(venue),
  status      = VALUES(status),
  tournament_id = VALUES(tournament_id);

-- ------------------------------------------------------------
-- GAME_LINEUPS — Las Guerreras (titulares)
-- ------------------------------------------------------------
INSERT IGNORE INTO game_lineups (id, game_id, team_id, player_id, batting_order, position, is_starter)
VALUES
  (UUID(), 'game-gue-vs-chi-20260611', 'team-guerreras', 'player-gue-01', 1,  'LF', 1),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-guerreras', 'player-gue-02', 2,  '1B', 1),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-guerreras', 'player-gue-03', 3,  '3B', 1),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-guerreras', 'player-gue-05', 4,  'CF', 1),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-guerreras', 'player-gue-06', 5,  'C',  1),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-guerreras', 'player-gue-07', 6,  'RF', 1),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-guerreras', 'player-gue-08', 7,  '2B', 1),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-guerreras', 'player-gue-09', 8,  'SS', 1),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-guerreras', 'player-gue-04', 9,  'P',  1);

-- ------------------------------------------------------------
-- GAME_LINEUPS — Team Chile (titulares, DP en posición 2)
-- ------------------------------------------------------------
INSERT IGNORE INTO game_lineups (id, game_id, team_id, player_id, batting_order, position, is_starter, is_dp)
VALUES
  (UUID(), 'game-gue-vs-chi-20260611', 'team-chile', 'player-chi-01', 1,  '1B', 1, 0),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-chile', 'player-chi-02', 2,  'DP', 1, 1),  -- Bateadora Designada
  (UUID(), 'game-gue-vs-chi-20260611', 'team-chile', 'player-chi-03', 3,  'SS', 1, 0),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-chile', 'player-chi-06', 4,  '3B', 1, 0),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-chile', 'player-chi-07', 5,  '2B', 1, 0),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-chile', 'player-chi-08', 6,  'RF', 1, 0),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-chile', 'player-chi-10', 7,  'LF', 1, 0),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-chile', 'player-chi-11', 8,  'CF', 1, 0),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-chile', 'player-chi-12', 9,  'C',  1, 0),
  (UUID(), 'game-gue-vs-chi-20260611', 'team-chile', 'player-chi-09', 10, 'P',  1, 0);
