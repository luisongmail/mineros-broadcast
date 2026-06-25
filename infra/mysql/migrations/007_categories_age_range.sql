-- 007_categories_age_range.sql
-- Agrega rango etáreo a las categorías

ALTER TABLE categories
  ADD COLUMN age_min TINYINT UNSIGNED NULL COMMENT 'Edad mínima inclusive',
  ADD COLUMN age_max TINYINT UNSIGNED NULL COMMENT 'Edad máxima inclusive';

-- Actualizar categorías con rangos etáreos correctos

-- Pequeñas Ligas
UPDATE categories SET age_min = 4,  age_max = 6  WHERE id = 'cat-pb-tball';
UPDATE categories SET name = 'Pitoco',       age_min = 7,  age_max = 8  WHERE id = 'cat-pb-novato';
UPDATE categories SET name = 'Pre-Infantil', age_min = 9,  age_max = 10 WHERE id = 'cat-pb-rookies';
UPDATE categories SET name = 'Infantil',     age_min = 11, age_max = 12 WHERE id = 'cat-pb-menor';
UPDATE categories SET age_min = 13, age_max = 14 WHERE id = 'cat-pb-junior';
UPDATE categories SET age_min = 15, age_max = 16 WHERE id = 'cat-pb-senior';
UPDATE categories SET age_min = 16, age_max = 18 WHERE id = 'cat-pb-biglearn';

-- Pony League
UPDATE categories SET age_min = 5,  age_max = 6  WHERE id = 'cat-pony-shetland';
UPDATE categories SET age_min = 13, age_max = 14 WHERE id = 'cat-pony-pony';
UPDATE categories SET age_min = 15, age_max = 16 WHERE id = 'cat-pony-colt';
UPDATE categories SET age_min = 17, age_max = 18 WHERE id = 'cat-pony-palomino';
UPDATE categories SET age_min = 19, age_max = 22 WHERE id = 'cat-pony-thorobred';

-- Federado Béisbol Masculino
UPDATE categories SET age_min = NULL, age_max = 15 WHERE id = 'cat-fed-bm-sub15';
UPDATE categories SET age_min = NULL, age_max = 18 WHERE id = 'cat-fed-bm-sub18';
UPDATE categories SET age_min = NULL, age_max = 23 WHERE id = 'cat-fed-bm-sub23';
UPDATE categories SET age_min = 18,   age_max = NULL WHERE id = 'cat-fed-bm-adulto';
UPDATE categories SET age_min = 35,   age_max = NULL WHERE id = 'cat-fed-bm-master';

-- Federado Béisbol Femenino
UPDATE categories SET age_min = NULL, age_max = 15 WHERE id = 'cat-fed-bf-sub15';
UPDATE categories SET age_min = NULL, age_max = 18 WHERE id = 'cat-fed-bf-sub18';
UPDATE categories SET age_min = NULL, age_max = 23 WHERE id = 'cat-fed-bf-sub23';
UPDATE categories SET age_min = 18,   age_max = NULL WHERE id = 'cat-fed-bf-adulto';
UPDATE categories SET age_min = 35,   age_max = NULL WHERE id = 'cat-fed-bf-master';

-- Federado Softball Femenino
UPDATE categories SET age_min = NULL, age_max = 15 WHERE id = 'cat-fed-sf-sub15';
UPDATE categories SET age_min = NULL, age_max = 18 WHERE id = 'cat-fed-sf-sub18';
UPDATE categories SET age_min = NULL, age_max = 23 WHERE id = 'cat-fed-sf-sub23';
UPDATE categories SET age_min = 18,   age_max = NULL WHERE id = 'cat-fed-sf-adulto';
UPDATE categories SET age_min = 35,   age_max = NULL WHERE id = 'cat-fed-sf-master';

-- Federado Softball Masculino
UPDATE categories SET age_min = NULL, age_max = 15 WHERE id = 'cat-fed-sm-sub15';
UPDATE categories SET age_min = NULL, age_max = 18 WHERE id = 'cat-fed-sm-sub18';
UPDATE categories SET age_min = NULL, age_max = 23 WHERE id = 'cat-fed-sm-sub23';
UPDATE categories SET age_min = 18,   age_max = NULL WHERE id = 'cat-fed-sm-adulto';
UPDATE categories SET age_min = 35,   age_max = NULL WHERE id = 'cat-fed-sm-master';

-- Béisbol5
UPDATE categories SET age_min = NULL, age_max = 14 WHERE id = 'cat-b5-sub14';
UPDATE categories SET age_min = NULL, age_max = 17 WHERE id = 'cat-b5-sub17';
UPDATE categories SET age_min = 18,   age_max = NULL WHERE id = 'cat-b5-adulto';
