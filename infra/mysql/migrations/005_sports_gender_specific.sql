-- 005_sports_gender_specific.sql
-- Deportes con género específico requeridos por Mineros de Santiago
-- Softball Femenino/Masculino, Béisbol Femenino/Masculino, Béisbol5

INSERT IGNORE INTO sports (id, name, gender, has_pitcher, default_rules) VALUES

-- Softball Femenino
('softball_fast_f',
 'Softball Femenino',
 'female',
 1,
 '{"inningsCount":7,"maxOuts":3,"maxBalls":4,"maxStrikes":3,"batterAttempts":null,"hasPitcher":true,"timeLimitMinutes":null,"mercyRule":[{"afterInning":5,"runDiff":10}],"extraInnings":{"type":"runner_on_second"},"continuousBatting":false,"buntsAllowed":true,"dpFlexAllowed":true,"pitchClockSeconds":null}'
),

-- Softball Masculino
('softball_fast_m',
 'Softball Masculino',
 'male',
 1,
 '{"inningsCount":7,"maxOuts":3,"maxBalls":4,"maxStrikes":3,"batterAttempts":null,"hasPitcher":true,"timeLimitMinutes":null,"mercyRule":[{"afterInning":5,"runDiff":10}],"extraInnings":{"type":"runner_on_second"},"continuousBatting":false,"buntsAllowed":true,"dpFlexAllowed":true,"pitchClockSeconds":null}'
),

-- Béisbol Femenino
('baseball_f',
 'Béisbol Femenino',
 'female',
 1,
 '{"inningsCount":9,"maxOuts":3,"maxBalls":4,"maxStrikes":3,"batterAttempts":null,"hasPitcher":true,"timeLimitMinutes":null,"mercyRule":[],"extraInnings":{"type":"standard"},"continuousBatting":false,"buntsAllowed":true,"dpFlexAllowed":false,"pitchClockSeconds":null}'
),

-- Béisbol Masculino
('baseball_m',
 'Béisbol Masculino',
 'male',
 1,
 '{"inningsCount":9,"maxOuts":3,"maxBalls":4,"maxStrikes":3,"batterAttempts":null,"hasPitcher":true,"timeLimitMinutes":null,"mercyRule":[],"extraInnings":{"type":"standard"},"continuousBatting":false,"buntsAllowed":true,"dpFlexAllowed":false,"pitchClockSeconds":null}'
),

-- Béisbol5 — actualizar nombre del registro existente (no crear duplicado)
-- ('baseball5' ya existe como 'mixed', solo se actualiza el nombre)
UPDATE sports SET name = 'Béisbol5' WHERE id = 'baseball5';
