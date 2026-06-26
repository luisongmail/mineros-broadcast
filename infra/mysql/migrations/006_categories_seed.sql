-- 006_categories_seed.sql
-- Categorías oficiales por deporte
-- Pequeñas Ligas, Pony League, Federado (béisbol/softball/béisbol5)

INSERT IGNORE INTO categories (id, sport_id, name, description, active) VALUES

-- ─── PEQUEÑAS LIGAS — Béisbol Masculino (nomenclatura local) ────────────────
('cat-pb-tball',        'baseball_m', 'T-Ball',           'Iniciación, 4-6 años',                              1),
('cat-pb-novato',       'baseball_m', 'Pitoco',           'División Pitoco (Novato), 7-8 años',                1),
('cat-pb-rookies',      'baseball_m', 'Pre-Infantil',     'División Pre-Infantil (Rookies), 9-10 años',        1),
('cat-pb-menor',        'baseball_m', 'Infantil',         'División Infantil (Pequeñas Ligas), 11-12 años',    1),
('cat-pb-intermediate', 'baseball_m', 'Intermediate 50/70', 'División Intermediate (50/70), 11-13 años',      1),
('cat-pb-junior',       'baseball_m', 'Junior',           'División Junior League, 12-14 años',                1),
('cat-pb-senior',       'baseball_m', 'Senior',           'División Senior League, 13-16 años',                1),

-- ─── PONY LEAGUE — Béisbol Masculino ─────────────────────────────────────────
('cat-pony-shetland',  'baseball_m', 'Shetland',  'Pony League, 5-6 años',   1),
('cat-pony-pony',      'baseball_m', 'Pony',      'Pony League, 13-14 años', 1),
('cat-pony-colt',      'baseball_m', 'Colt',      'Pony League, 15-16 años', 1),
('cat-pony-palomino',  'baseball_m', 'Palomino',  'Pony League, 17-18 años', 1),
('cat-pony-thorobred', 'baseball_m', 'Thorobred', 'Pony League, 19-22 años', 1),

-- ─── FEDERADO — Béisbol Masculino ────────────────────────────────────────────
('cat-fed-bm-sub15',  'baseball_m', 'Sub-15', 'Béisbol Federado Masculino Sub-15', 1),
('cat-fed-bm-sub18',  'baseball_m', 'Sub-18', 'Béisbol Federado Masculino Sub-18', 1),
('cat-fed-bm-sub23',  'baseball_m', 'Sub-23', 'Béisbol Federado Masculino Sub-23', 1),
('cat-fed-bm-adulto', 'baseball_m', 'Adulto', 'Béisbol Federado Masculino Adulto', 1),
('cat-fed-bm-master', 'baseball_m', 'Máster', 'Béisbol Federado Masculino Máster', 1),

-- ─── FEDERADO — Béisbol Femenino ─────────────────────────────────────────────
('cat-fed-bf-sub15',  'baseball_f', 'Sub-15', 'Béisbol Federado Femenino Sub-15', 1),
('cat-fed-bf-sub18',  'baseball_f', 'Sub-18', 'Béisbol Federado Femenino Sub-18', 1),
('cat-fed-bf-sub23',  'baseball_f', 'Sub-23', 'Béisbol Federado Femenino Sub-23', 1),
('cat-fed-bf-adulto', 'baseball_f', 'Adulto', 'Béisbol Federado Femenino Adulto', 1),
('cat-fed-bf-master', 'baseball_f', 'Máster', 'Béisbol Federado Femenino Máster', 1),

-- ─── FEDERADO — Softball Femenino ────────────────────────────────────────────
('cat-fed-sf-sub15',  'softball_fast_f', 'Sub-15', 'Softball Federado Femenino Sub-15', 1),
('cat-fed-sf-sub18',  'softball_fast_f', 'Sub-18', 'Softball Federado Femenino Sub-18', 1),
('cat-fed-sf-sub23',  'softball_fast_f', 'Sub-23', 'Softball Federado Femenino Sub-23', 1),
('cat-fed-sf-adulto', 'softball_fast_f', 'Adulto', 'Softball Federado Femenino Adulto', 1),
('cat-fed-sf-master', 'softball_fast_f', 'Máster', 'Softball Federado Femenino Máster', 1),

-- ─── FEDERADO — Softball Masculino ───────────────────────────────────────────
('cat-fed-sm-sub15',  'softball_fast_m', 'Sub-15', 'Softball Federado Masculino Sub-15', 1),
('cat-fed-sm-sub18',  'softball_fast_m', 'Sub-18', 'Softball Federado Masculino Sub-18', 1),
('cat-fed-sm-sub23',  'softball_fast_m', 'Sub-23', 'Softball Federado Masculino Sub-23', 1),
('cat-fed-sm-adulto', 'softball_fast_m', 'Adulto', 'Softball Federado Masculino Adulto', 1),
('cat-fed-sm-master', 'softball_fast_m', 'Máster', 'Softball Federado Masculino Máster', 1),

-- ─── BÉISBOL5 ─────────────────────────────────────────────────────────────────
('cat-b5-sub14',  'baseball5', 'Sub-14', 'Béisbol5 Sub-14', 1),
('cat-b5-sub17',  'baseball5', 'Sub-17', 'Béisbol5 Sub-17', 1),
('cat-b5-adulto', 'baseball5', 'Adulto', 'Béisbol5 Adulto', 1);
