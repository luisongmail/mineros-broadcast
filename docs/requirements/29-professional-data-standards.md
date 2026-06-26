# Spec 29 — Estándares de Datos Profesionales

**Sistema:** Mineros Broadcast — plataforma de datos deportivos  
**Ámbito:** Normalización del modelo de datos al estándar MLBAM con sistema de medición métrico. Capa de adaptadores para dispositivos de medición. API pública versionada.  
**Versión:** 1.0.0  
**Estado:** APROBADO

---

## 1. Contexto y motivación

El sistema actual usa coordenadas arbitrarias de grilla (zone_x/zone_y 7×7) para pitcheos y strings libres para resultados de turnos al bate. Esta representación:

- No es interoperable con ninguna herramienta de análisis externa
- No puede recibir datos de dispositivos de medición (Rapsodo, Trackman, etc.)
- No soporta métricas avanzadas (spin rate, break, zona real, etc.)
- Hace imposible exportar datos en formatos estándar de la industria

Este spec define la migración al modelo MLBAM (Major League Baseball Advanced Media) como estándar de eventos, con **sistema de medición métrico** (metros, km/h, centímetros) para compatibilidad con el mercado latinoamericano y WBSC.

---

## 2. Decisiones de arquitectura

### 2.1 Sistema de coordenadas: MÉTRICO

| Campo | Unidad | Rango típico | Justificación |
|-------|--------|-------------|---------------|
| `plate_x` | metros | -0.30 a +0.30 | Centro = 0, izquierda negativo |
| `plate_z` | metros | 0.0 a 1.80 | Desde el suelo |
| `start_speed` | km/h | 0 a 200 | Velocidad de salida |
| `end_speed` | km/h | 0 a 180 | Velocidad al llegar al plato |
| `pfx_x` | centímetros | -50 a +50 | Movimiento horizontal |
| `pfx_z` | centímetros | -50 a +50 | Movimiento vertical |
| `sz_top` | metros | 0.50 a 1.30 | Tope de zona del bateador |
| `sz_bottom` | metros | 0.35 a 0.65 | Fondo de zona del bateador |

**Nota de conversión para integración de dispositivos:**
- 1 pie = 0.3048 metros
- 1 milla/hora = 1.60934 km/h
- 1 pulgada = 2.54 centímetros

Los adaptadores de dispositivos anglosajones (Trackman, Rapsodo) convierten a métrico antes de persistir.

### 2.2 Zona de strike: MLBAM (vocabulario estándar)

Las zonas se usan como etiquetas de clasificación, independientemente del sistema de coordenadas:

```
Vista del receptor:

   ┌────┬────┬────┐
   │ 1  │ 2  │ 3  │   11 = arriba
   ├────┼────┼────┤   12 = abajo
   │ 4  │ 5  │ 6  │   13 = adentro (lado zurdo) / afuera (diestro)
   ├────┼────┼────┤   14 = afuera (zurdo) / adentro (diestro)
   │ 7  │ 8  │ 9  │
   └────┴────┴────┘
   
   1-9:  zona de strike
   11-14: zona de bola
```

**Cálculo de zona desde coordenadas métricas:**
```typescript
function calculateZone(plateX: number, plateZ: number, szTop: number, szBottom: number, batSide: 'R'|'L'): number {
  const halfPlate = 0.2159; // metros (17 pulgadas = 0.4318m / 2)
  const thirdW = halfPlate * 2 / 3;
  const thirdH = (szTop - szBottom) / 3;

  const inStrike = Math.abs(plateX) <= halfPlate && plateZ >= szBottom && plateZ <= szTop;
  if (!inStrike) {
    // Zonas de bola
    if (plateZ > szTop) return 11;
    if (plateZ < szBottom) return 12;
    return plateX < 0 ? 13 : 14;
  }
  // Zonas 1-9
  const col = plateX < -thirdW ? 0 : plateX > thirdW ? 2 : 1;
  const row = plateZ > szTop - thirdH ? 0 : plateZ < szBottom + thirdH ? 2 : 1;
  return row * 3 + col + 1;
}
```

### 2.3 Vocabulario de eventos at-bat: MLBAM

Reemplaza el campo `result VARCHAR(50)` libre por `event_type` con vocabulario controlado:

```
Outs:
  strikeout | strikeout_double_play | field_out | force_out
  grounded_into_double_play | triple_play | fielders_choice_out
  double_play | sac_fly | sac_fly_double_play | sac_bunt | sac_bunt_double_play

Hits:
  single | double | triple | home_run

Bases por bolas / HBP:
  walk | intent_walk | hit_by_pitch

Errores / FC:
  field_error | fielders_choice

Otros:
  runner_double_play | batter_interference | catcher_interference
```

### 2.4 Clasificación de pitcheos: códigos estándar

```
FF  Recta cuatro costuras (Four-seam Fastball)
SI  Sinker / Two-seam
FC  Cutter
FS  Splitter / Forkball
SL  Slider
CU  Curveball
KC  Knuckle Curve
CH  Changeup
SC  Screwball
KN  Knuckleball
EP  Eephus

// Softball (extensión WBSC):
RB  Riseball
DB  Dropball
DR  Drop-Curve
DC  Drop-Change
```

---

## 3. Schema — Migraciones requeridas

### Migración 012 — Tabla pitches: coordenadas métricas

```sql
ALTER TABLE pitches
  ADD COLUMN plate_x      DECIMAL(6,4)  NULL  COMMENT 'metros desde centro del plato',
  ADD COLUMN plate_z      DECIMAL(6,4)  NULL  COMMENT 'metros desde el suelo',
  ADD COLUMN zone         TINYINT       NULL  COMMENT '1-9 strike, 11-14 bola (MLBAM)',
  ADD COLUMN sz_top       DECIMAL(5,4)  NULL  COMMENT 'tope de zona en metros',
  ADD COLUMN sz_bottom    DECIMAL(5,4)  NULL  COMMENT 'fondo de zona en metros',
  ADD COLUMN pfx_x        DECIMAL(6,2)  NULL  COMMENT 'movimiento horizontal en cm',
  ADD COLUMN pfx_z        DECIMAL(6,2)  NULL  COMMENT 'movimiento vertical en cm',
  ADD COLUMN start_speed  DECIMAL(6,2)  NULL  COMMENT 'velocidad de salida en km/h',
  ADD COLUMN end_speed    DECIMAL(6,2)  NULL  COMMENT 'velocidad al plato en km/h',
  ADD COLUMN spin_rate    SMALLINT UNSIGNED NULL COMMENT 'revoluciones por minuto',
  ADD COLUMN spin_axis    SMALLINT UNSIGNED NULL COMMENT 'grados (0-360)',
  ADD COLUMN pitch_class  VARCHAR(2)    NULL  COMMENT 'código MLBAM/WBSC: FF SI FC SL CU CH RB DB...',
  ADD COLUMN confidence   DECIMAL(4,3)  NULL  COMMENT 'confianza del dispositivo (0.000-1.000)',
  ADD COLUMN device_id    VARCHAR(50)   NULL  COMMENT 'id del dispositivo que generó los datos';
```

### Migración 013 — Tabla at_bats: vocabulario controlado + runner movements

```sql
ALTER TABLE at_bats
  ADD COLUMN event_type   VARCHAR(40)   NULL  COMMENT 'vocabulario MLBAM',
  ADD COLUMN runners      JSON          NULL  COMMENT 'array de movimientos [{runnerId, from, to, earned, outNumber}]';
```

### Migración 014 — Tabla players: identificadores externos

```sql
ALTER TABLE players
  ADD COLUMN mlbam_id     VARCHAR(20)   NULL  COMMENT 'ID en MLB Stats API',
  ADD COLUMN wbsc_id      VARCHAR(30)   NULL  COMMENT 'ID en WBSC (torneos internacionales)',
  ADD COLUMN ext_ref      JSON          NULL  COMMENT 'referencias externas {fuente: id}';
```

---

## 4. stateStore — Runner identity

Cambio en la representación de bases en memoria:

```typescript
// ANTES (actual):
bases: { first: boolean, second: boolean, third: boolean }

// DESPUÉS:
bases: {
  first:  RunnerOnBase | null,
  second: RunnerOnBase | null,
  third:  RunnerOnBase | null,
}

interface RunnerOnBase {
  id:         string;    // player_id (FK a players)
  name:       string;    // nombre completo
  number:     string;    // número de camiseta
  originBase: 'home' | '1B' | '2B' | '3B';
  earned:     boolean;   // para carrera limpia/sucia
}
```

Los comandos del stateStore que afectan bases deben actualizarse:
- `SetBase` → `PlaceRunner(base, runner)` y `RemoveRunner(base)`
- `IncrementScore` → acepta parámetro `runner?: RunnerOnBase` para calcular earned/unearned

---

## 5. Capa de adaptadores de dispositivos

### 5.1 Interfaz base (paquete `packages/device-adapters`)

```typescript
interface DeviceAdapter {
  readonly deviceId: string;
  readonly protocol: 'wifi-rest' | 'bluetooth-le' | 'file-import' | 'usb-serial';

  connect(config: DeviceConfig): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<'ok' | 'error'>;

  onPitchData(handler: (data: NormalizedPitchData) => void): () => void;
  onHitData?(handler: (data: NormalizedHitData) => void): () => void;
}

interface NormalizedPitchData {
  // Coordenadas métricas (siempre en este sistema)
  plateX:      number;   // metros
  plateZ:      number;   // metros
  startSpeed:  number;   // km/h
  endSpeed?:   number;   // km/h
  spinRate?:   number;   // rpm
  spinAxis?:   number;   // grados
  pfxX?:       number;   // cm
  pfxZ?:       number;   // cm
  pitchClass?: string;   // código MLBAM/WBSC
  confidence?: number;   // 0-1
  rawData:     unknown;  // payload original del dispositivo
}
```

### 5.2 Adaptadores en scope S3

| Adaptador | Protocolo | Prioridad |
|-----------|-----------|-----------|
| `CsvFileImportAdapter` | file-import | Alta — permite cargar exportaciones históricas de cualquier dispositivo |
| `RapsodoAdapter` | wifi-rest | Media — integración tiempo real para semi-pro |
| `BlastMotionAdapter` | bluetooth-le | Media — datos de bat sensor |

---

## 6. API pública v1

### Nuevos endpoints

```
GET  /api/v1/games/:id/live          → liveData MLBAM-compatible
GET  /api/v1/games/:id/pitches       → con coordenadas métricas + zona
GET  /api/v1/players/:id/stats       → estadísticas calculadas
POST /api/v1/devices/import-csv      → importar CSV de dispositivo
```

---

## 7. Orden de implementación (este spec)

| Sprint | Tarea | Resultado |
|--------|-------|-----------|
| S1 | Migración schema pitches + conversión PitchGrid a coordenadas reales | Pitcheos con posición física real en metros |
| S2 | stateStore runner identity + at_bats event_type | Corredores identificados en tiempo real |
| S3 | CsvFileImportAdapter (Rapsodo/Trackman CSV → métrico) | Importación de datos históricos de dispositivos |

Specs futuros cubrirán: API v1, analytics engine, adaptadores hardware, export WBSC.
