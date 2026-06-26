-- Migración 009: tabla venues (estadios/canchas)
-- Dirección conforme a ISO 19160-1 / formato Google Maps

CREATE TABLE IF NOT EXISTS venues (
  id              VARCHAR(100)  NOT NULL PRIMARY KEY,
  name            VARCHAR(255)  NOT NULL,
  photo_asset_id  VARCHAR(255)  DEFAULT NULL,

  -- Dirección (estándar internacional)
  address_line1   VARCHAR(255)  DEFAULT NULL,  -- número y nombre de calle
  address_line2   VARCHAR(100)  DEFAULT NULL,  -- piso, suite, sector, etc.
  city            VARCHAR(100)  DEFAULT NULL,
  state_province  VARCHAR(100)  DEFAULT NULL,  -- región / provincia / estado
  postal_code     VARCHAR(20)   DEFAULT NULL,
  country         VARCHAR(100)  DEFAULT NULL,
  country_code    CHAR(2)       DEFAULT NULL,  -- ISO 3166-1 alpha-2 (CL, DO, US…)

  -- Integración Google Maps
  google_place_id VARCHAR(255)  DEFAULT NULL,
  latitude        DECIMAL(10,8) DEFAULT NULL,
  longitude       DECIMAL(11,8) DEFAULT NULL,

  -- Datos operativos
  capacity        INT           DEFAULT NULL,
  notes           TEXT          DEFAULT NULL,

  created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
