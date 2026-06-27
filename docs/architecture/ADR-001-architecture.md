# ADR-001 — Arquitectura de Producción
## PlayFlow — Sistema de Overlays para Transmisión de Béisbol

**Versión:** 2.0  
**Fecha:** 2026-06-27  
**Estado:** APROBADO  
**Autores:** Squad (Sandy, Babe, Jeter, Robinson, Mariano) + Luis (product owner)
**Cambios v2.0:** Rename a PlayFlow, estructura real del monorepo, schema MLBAM actualizado, endpoints de API documentados, tareas pendientes sincronizadas.

---

## 1. VISIÓN GENERAL DEL SISTEMA

**Nombre del producto:** PlayFlow  
**Nombre técnico interno:** `playflow-server`  
**Propósito:** Sistema de overlays en tiempo real para transmisiones de béisbol. Controla la presentación visual desde un panel de operador y distribuye overlays a múltiples fuentes en OBS/Meld Studio vía WebSocket. Incluye un módulo de scoring en vivo (LiveGameScoring) con captura de pitches y at-bats compatible con estándares MLBAM/WBSC.

### Audiencia

| Rol | Interfaz | Ruta | Acceso |
|-----|---------|------|--------|
| Operador de broadcast | Control Panel | `/control` | Red local / VPN |
| Scorer / estadísticas | Live Game Scoring | `/live-game-scoring` | Red local / acceso externo |
| OBS / Meld Studio | Browser Source | `/overlay/:id` | Red local |
| Administrador | GitHub Actions + Azure Portal | — | Cloud |

---

## 2. DIAGRAMA DE ARQUITECTURA DE PRODUCCIÓN

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INTERNET / AZURE CDN                         │
└──────────────────────┬──────────────────┬───────────────────────────┘
                       │                  │
              ┌────────▼────────┐  ┌──────▼──────────────────────────┐
              │  Static Web App │  │     App Service B1 Linux        │
              │  playflow-      │  │     playflow-server            │
              │  overlays       │  │     $12.41/mes                  │
              │  (Free Tier)    │  │                                  │
              │                 │  │  Node.js + Express + WS         │
              │  /overlay/:id   │  │  ├── REST API  /api/*           │
              │  Browser Source │  │  ├── WebSocket wss://           │
              │  para OBS       │  │  ├── /control  (SPA fallback)   │
              │                 │  │  └── /scorer   (SPA fallback)   │
              │  CDN global     │  └──────────────┬──────────────────┘
              └─────────────────┘                 │
                                   ┌──────────────▼─────────────────┐
                                   │  MySQL Flexible Server B1MS    │
                                   │  playflow-db                  │
                                   │  $12.41/mes + storage $3.20    │
                                   │                                │
                                   │  DB: playflow_db              │
                                   │  User: playflow_app           │
                                   │                                │
                                   │  • teams / players / games     │
                                   │  • game_lineups / at_bats      │
                                   │  • sponsors / campaigns        │
                                   │  • operator_actions (auditoría)│
                                   │  • playflow_sessions (estado) │
                                   └────────────────────────────────┘

Costo total producción: ~$33/mes
```

---

## 3. NAMING CONVENTIONS

### 3.1 Convención general

Los identificadores de infraestructura son **funcionales y desacoplados del cliente**. El nombre del club no aparece en credenciales, nombres de recursos Azure, imágenes Docker ni conexiones de base de datos. Esto garantiza portabilidad si el sistema se reutiliza para otro equipo.

### 3.2 Tabla de identificadores

| Identificador | Valor | Contexto |
|--------------|-------|---------|
| Nombre de base de datos | `playflow_db` | MySQL, local y producción |
| Usuario de base de datos | `playflow_app` | MySQL, mínimos privilegios |
| Imagen Docker | `playflow-server` | Docker Hub / ACR |
| Contenedor Docker | `playflow-server` | docker-compose, local |
| Azure App Service | `playflow-server` | Portal Azure |
| Azure MySQL Server | `playflow-db` | Portal Azure |
| Azure Container Registry | `playflowacr` | Portal Azure (sin guiones) |
| Azure Static Web App | `playflow-overlays` | Portal Azure |
| Azure Resource Group | `rg-playflow-prod-eastus` | Portal Azure (CAF compliant) |
| Tag de imagen producción | `playflow-server:{git-sha}` | Pipeline CI/CD |
| Tag de imagen latest | `playflow-server:latest` | docker-compose local |

### 3.3 DATABASE_URL por entorno

```bash
# Desarrollo local (Docker Compose)
DATABASE_URL=mysql://playflow_app:***@localhost:3306/playflow_db

# Producción Azure
DATABASE_URL=mysql://playflow_app:***@playflow-db.mysql.database.azure.com:3306/playflow_db
```

---

## 4. COMPONENTES — DEFINICIÓN Y RESPONSABILIDADES

### 4.0 Resource Group — Contenedor de todos los recursos Azure

| Propiedad | Valor |
|----------|-------|
| Nombre | `rg-playflow-prod-eastus` |
| Región | East US (Virginia) |
| Convención | Azure CAF: `rg-{workload}-{environment}-{region}` |
| Propósito | Agrupar y gestionar todos los recursos del sistema como una unidad |

**Todos los recursos Azure residen en este grupo:**

```
rg-playflow-prod-eastus/
├── playflow-server          ← App Service Plan B1 + Web App (Node.js)
├── playflow-db              ← MySQL Flexible Server B1ms
├── playflowacr              ← Azure Container Registry (Basic)
└── playflow-overlays        ← Static Web App (Free)
```

**Beneficios de agrupar:**
- Un solo comando para eliminar toda la infraestructura: `az group delete --name rg-playflow-prod-eastus`
- Control de acceso (IAM) aplicado al grupo aplica a todos los recursos
- Monitoreo y costos agrupados en Azure Portal
- Todos los recursos en la misma región East US — sin latencia inter-región

---

### 4.1 Static Web Apps (Azure) — Free Tier

| Propiedad | Valor |
|----------|-------|
| Nombre Azure | `playflow-overlays` |
| Costo | $0/mes |
| Propósito | Servir páginas de overlay para OBS (Browser Source) |
| Rutas | `/overlay/:id` |
| Build | `pnpm turbo build --filter studio` → `dist/` |
| CDN | Global automático (Microsoft CDN) |
| CI/CD | GitHub Actions integrado automáticamente |
| Actualización | En cada push a `main` en paths de overlays |

**Justificación:** Los overlays son páginas estáticas que necesitan carga ultrarrápida para OBS. CDN global es imposible en App Service sin Azure Front Door (costo adicional). Static Web Apps lo provee gratis.

### 4.2 App Service B1 Linux — Node.js Server

| Propiedad | Valor |
|----------|-------|
| Nombre Azure | `playflow-server` |
| Costo | $12.41/mes |
| SKU | B1ms — 1 vCPU, 1.75 GB RAM |
| Runtime | Docker container (imagen `playflow-server:{sha}`) |
| Puerto interno | 8080 |
| Rutas servidas | `/api/*`, `wss://`, `/control`, `/scorer` |
| Persistencia | `/home` persistente entre reinicios |
| Escalado | Manual (no autoescalado en B1) |

**Responsabilidades:**
- WebSocket hub: broadcast de estado a todos los clientes conectados
- REST API: recibir comandos del operador y scorer
- Game State: fuente única de verdad deportiva en memoria + write-through a MySQL
- Restore on startup: leer último estado de `playflow_sessions` al arrancar

### 4.3 MySQL Flexible Server B1MS

| Propiedad | Valor |
|----------|-------|
| Nombre Azure | `playflow-db` |
| Costo | $12.41/mes compute + $3.20/mes storage 32GB |
| Versión | MySQL 8.0 |
| SKU | B1ms — 1 vCPU, 2 GB RAM |
| Base de datos | `playflow_db` |
| Usuario app | `playflow_app` |
| Conexiones máx. | 85 conexiones concurrentes |
| Backup | 7 días automático incluido |
| Acceso | Solo desde App Service (Private Access / VNet) |

### 4.4 Azure Container Registry

| Propiedad | Valor |
|----------|-------|
| Nombre Azure | `playflowacr` |
| Costo | $5.00/mes (Basic tier) |
| Propósito | Almacenar imagen Docker `playflow-server` |
| Retención | Últimas 5 imágenes por tag |

---

## 5. STACK TECNOLÓGICO

### 5.1 Estructura del monorepo

```
playflow/                             ← raíz del monorepo
├── apps/
│   └── studio/                       ← app principal (antes studio)
│       ├── server/                   ← Node.js Express + WebSocket
│       │   ├── index.ts              ← entry point, CORS, static files
│       │   ├── stateStore.ts         ← game state + broadcast hub + RunnerOnBaseWithPitcher
│       │   ├── commandHandler.ts     ← procesamiento de comandos WS
│       │   ├── scorerRouter.ts       ← API /api/scorer/pitches, /at-bats, /substitutions
│       │   ├── pitchesRouter.ts      ← API /api/games/:id/pitches, /game-events
│       │   ├── baserunningRouter.ts  ← API /api/games/:id/baserunning (responsible_pitcher_id)
│       │   ├── gameConfigRouter.ts   ← API /api/games, /api/context
│       │   ├── gameConfigRouter.ts   ← API /api/games, /api/lineups
│       │   ├── leaguesTournamentsRouter.ts ← API torneos, ligas, standings
│       │   ├── teamsRouter.ts        ← API equipos y jugadores
│       │   ├── sponsorsRouter.ts     ← API sponsors y campañas
│       │   ├── layoutRouter.ts       ← API layouts de transmisión
│       │   ├── venuesRouter.ts       ← API recintos deportivos
│       │   └── db.ts                 ← cliente MySQL (mysql2)
│       ├── src/                      ← React SPA (Vite)
│       │   ├── pages/
│       │   │   ├── OverlayPage.tsx         ← Browser Source OBS
│       │   │   ├── OperatorControlPanel.tsx ← panel operador /control
│       │   │   ├── LiveGameScoringPage.tsx  ← scorer en vivo /live-game-scoring
│       │   │   └── ScorerPage.tsx           ← scorer legacy /scorer
│       │   └── App.tsx               ← router principal
│       ├── Dockerfile                ← multi-stage build
│       └── vite.config.ts            ← strictPort: 5173
├── packages/
│   ├── core/                         ← contratos IC-003, tipos, envelopes
│   ├── design-system/                ← tokens visuales, componentes base
│   ├── game-engine/                  ← motor deportivo (fuente única de verdad)
│   ├── event-engine/                 ← eventos → acciones visuales
│   ├── scene-engine/                 ← gestión de escenas
│   ├── overlay-manager/              ← orquestador de renders
│   ├── asset-manager/                ← motor de assets
│   ├── sponsor-engine/               ← reglas comerciales
│   ├── layout-manager/               ← zonas, Preview/Program
│   ├── event-bus/                    ← bus de eventos interno
│   └── overlays/                     ← 13 overlays individuales
│       ├── scorebug/
│       ├── batter/
│       ├── pitcher/
│       ├── lineup/
│       ├── next-batters/
│       ├── substitution/
│       ├── game-event/
│       ├── inning-transition/
│       ├── final-score/
│       ├── sponsor-break/
│       ├── announcement/
│       ├── social-lower-third/
│       └── countdown/
├── infra/
│   ├── mysql/migrations/             ← 000_playflow_seed.sql + 001_gap_fields.sql
│   └── supabase/                     ← schema legacy (referencia histórica)
├── docker-compose.yml                ← entorno local completo
├── .env.example                      ← plantilla de variables (puertos documentados)
└── turbo.json                        ← pipeline de build
```

### 5.2 Decisiones tecnológicas ratificadas

| Decisión | Elección | Descartadas | Razón |
|---------|---------|------------|-------|
| Lenguaje | TypeScript estricto | JavaScript | Type safety cross-package |
| Build | Turborepo + pnpm | Nx, Yarn workspaces | Caching de build, pipelines paralelas |
| Frontend | React + Vite + Tailwind | Next.js, Vue | SPA pura, sin SSR necesario |
| Backend | Node.js + Express | Fastify, Deno | Ecosistema, soporte WebSocket nativo |
| WebSocket | `ws` nativo | Socket.IO | Menor overhead, compatible con OBS |
| Base de datos | MySQL 8.0 Flexible | PostgreSQL, SQLite, SQL Server Express | Precio managed en Azure, features suficientes |
| Cliente DB | `mysql2` directo | Prisma, TypeORM | Sin overhead de ORM para schema simple |
| Contenedor | Docker multi-stage | — | Reproducibilidad, Azure-ready |
| CI/CD | GitHub Actions | Azure DevOps | Gratis en repo con minutos incluidos |
| Compute | App Service B1 | Container Apps, Functions, VM | WebSocket always-on, precio, sin gestión de OS |
| CDN overlays | Static Web Apps Free | Front Door, App Service | CDN global sin costo adicional |

**Descartados con justificación:**
- **Azure Functions:** no soporta WebSocket persistente
- **SQL Server Express:** requiere VM (~$30/mes), más caro y más gestión que MySQL managed
- **Supabase:** pausa el proyecto tras 7 días sin actividad (inaceptable en temporada)
- **SQLite:** no soporta acceso concurrente desde scorer externo
- **Azure Table Storage:** no tiene SQL aggregations (necesario para estadísticas)

---

## 6. BASE DE DATOS — SCHEMA

### 6.1 Convenciones MySQL

- PKs: `CHAR(36)` con `DEFAULT (UUID())`
- JSON flexible: columnas `JSON` para estados complejos
- Timestamps: `DATETIME(3)` para precisión de milisegundos
- Sin foreign keys enforced (performance en insert intensivo de stats)
- Índices explícitos en `game_id`, `player_id`, `timestamp`

### 6.2 Entidades (31 tablas en producción)

```sql
-- ─── ESTADO DE TRANSMISIÓN ────────────────────────────────────────────
playflow_sessions  (id, game_id, state_json JSON, started_at, updated_at)

-- ─── IDENTIDAD / ESTRUCTURA ───────────────────────────────────────────
associations        (id, name, country_code, ...)
sports              (id, name, has_pitcher, default_rules JSON)
leagues             (id, sport_id, name, country, mlbam_id, wbsc_id)
tournaments         (id, league_id, name, type, season, rules JSON,
                     structure_type, has_playoffs, playoff_format)
clubs               (id, name, city, country, federated)
teams               (id, name, short_name, abbreviation,
                     mlbam_id, wbsc_id, primary_color, secondary_color)
players             (id, first_name, last_name, bats, throws, position,
                     mlbam_id, wbsc_id, ext_ref JSON)
venues              (id, name, city, latitude, longitude, capacity)

-- ─── TORNEO / COMPETENCIA ─────────────────────────────────────────────
tournament_teams    (tournament_id, team_id, seeding, eliminated)
tournament_groups   (id, tournament_id, name)
tournament_group_teams (group_id, team_id, seeding)
standings           (id, tournament_id, team_id, JG, JP, PCT, RA, RC, GB)
rosters             (id, tournament_id, team_id, player_id,
                     number, position, is_dp, is_flex, re_entry_used)
coaching_staff      (id, team_id, tournament_id, name, role)

-- ─── PARTIDO ──────────────────────────────────────────────────────────
games               (id, tournament_id, home_team_id, away_team_id,
                     status, scheduled_at, started_at, finished_at,
                     final_score JSON, game_state JSON, rules_override JSON,
                     ext JSON)
game_lineups        (id, game_id, team_id, player_id, roster_id,
                     batting_order, position, defensive_position,
                     is_starter, is_dp, is_flex, re_entry_used,
                     substituted_at, substituted_by)

-- ─── SCORING EN VIVO (MLBAM-compliant) ───────────────────────────────
pitches             (id, game_id, at_bat_id, pitcher_player_id,
                     batter_player_id, pitch_num, umpire_call,
                     pitch_type,                          -- tipo FF/SL/CU/CH
                     plate_x, plate_z,                    -- coordenadas métricas
                     pfx_x, pfx_z,                        -- movimiento en metros
                     start_speed, end_speed,              -- km/h
                     spin_rate, spin_axis,                 -- RPM / grados
                     zone, sz_top, sz_bottom,             -- zona MLBAM 1-14
                     pitch_class, confidence, device_id, ext JSON)

at_bats             (id, game_id, inning, inning_half,
                     batter_player_id, pitcher_player_id,
                     batter_roster_id, pitcher_roster_id,
                     event_type,        -- vocabulario MLBAM: single/double/walk/field_out/…
                     rbi, runs,
                     earned_runs,       -- MLBAM earnedRuns (para ERA)
                     unearned_runs,     -- MLBAM unearnedRuns
                     is_plate_appearance, -- 0 para sac_bunt
                     is_at_bat,           -- 0 para walk/HBP/sac_fly/sac_bunt
                     on_base, pitch_count,
                     contact_type,      -- line_drive/fly_ball/ground_ball/popup/bunt_grounder
                     hit_direction,     -- LF/CF/RF/3B/SS/2B/1B/P/C
                     hit_data JSON,     -- type, direction, hardness
                     runners JSON,      -- snapshot bases post at-bat
                     substitution_type, -- pinch_hitter | pinch_runner | null
                     batting_team_id, outs_before, score_home, score_away,
                     video_timestamp, ext JSON)

baserunning_events  (id, game_id, inning, inning_half,
                     event_type,        -- advance/score/caught_stealing/…
                     player_id, responsible_pitcher_id,  -- pitcher que puso al corredor
                     from_base, to_base, run_scored,
                     earned_run,        -- 1=limpia, 0=sucia
                     scoring_team_id, fielder_pos,
                     outs_before, video_timestamp, ext JSON)

game_events         (id, game_id, event_type, at_bat_id,
                     inning, inning_half,
                     batter_player_id, pitcher_player_id,
                     payload JSON,      -- datos específicos del tipo de evento
                     sequence,          -- orden secuencial por juego
                     context_before JSON, -- estado del juego antes del evento
                     context_after JSON,  -- estado del juego después del evento
                     review_status,     -- confirmed | pending_review | corrected
                     operator_id, outs_before, score_home, score_away,
                     video_timestamp)

-- ─── COMERCIAL ────────────────────────────────────────────────────────
sponsors            (id, name, brand, status, priority, weight,
                     allowed_placements JSON, exposure_limits JSON)
campaigns           (id, name, sponsor_id, status, placements JSON,
                     start_date, end_date, rules JSON)
campaign_sponsors   (campaign_id, sponsor_id)
sponsor_impressions (id, sponsor_id, campaign_id, game_id, placement,
                     trigger, started_at, ended_at, duration_seconds)

-- ─── OPERACIÓN / OVERLAY ──────────────────────────────────────────────
operator_actions    (id, game_id, operator_id, role, action,
                     overlay_id, payload JSON, result)
overlay_configs     (overlay_id, default_variant, auto_hide_ms,
                     priority, preferred_zone, config JSON)
layouts             (id, name, is_default, zones JSON)
game_layouts        (game_id, layout_id, assigned_at)
```

### 6.3 Migración PostgreSQL → MySQL

| PostgreSQL | MySQL 8.0 |
|-----------|----------|
| `UUID` | `CHAR(36) DEFAULT (UUID())` |
| `JSONB` | `JSON` |
| `gen_random_uuid()` | `UUID()` |
| `SERIAL` | `INT AUTO_INCREMENT` |
| `TEXT[]` | `JSON` |
| `TIMESTAMPTZ` | `DATETIME(3)` |
| `CREATE EXTENSION` | no aplica |

---

## 7. PLATAFORMA DE DESARROLLO — COSTO CERO

### 7.1 Herramientas requeridas

| Herramienta | Versión | Propósito | Costo |
|------------|---------|---------|-------|
| Node.js | 20 LTS | Runtime | $0 |
| pnpm | 9.x | Package manager | $0 |
| Docker Desktop | Latest | MySQL local + builds | $0 |
| Git | Any | Control de versiones | $0 |
| VS Code | Latest | IDE recomendado | $0 |
| OBS Studio | 30+ | Testing de Browser Sources | $0 |
| **Total** | | | **$0** |

### 7.2 Stack local con Docker Compose

```yaml
# docker-compose.yml (entorno completo local)
services:
  db:
    image: mysql:8.0
    ports: ["3306:3306"]
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: playflow_db
      MYSQL_USER: playflow_app
      MYSQL_PASSWORD: dev_password
    volumes:
      - db_dev_data:/var/lib/mysql
      - ./infra/mysql/migrations:/docker-entrypoint-initdb.d

  server:
    image: playflow-server:latest
    build: apps/studio              # ← directorio correcto
    ports: ["8080:8080"]
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://playflow_app:dev_password@db:3306/playflow_db
    depends_on: [db]

volumes:
  db_dev_data:
```

### Puertos fijos del sistema

| Servicio | Puerto | Notas |
|---------|--------|-------|
| Express API + WS | `:3001` | Dev local (`NODE_ENV=development`) |
| Vite SPA | `:5173` | `strictPort: true` |
| MySQL | `:3306` | Docker Compose y local |
| Docker (studio full) | `:8080` | Producción |

### 7.3 Comandos de desarrollo

```bash
# Setup inicial
pnpm install

# Desarrollo (hot reload, Vite :5173 + Node.js :3001)
docker compose up db -d          # solo MySQL en Docker
pnpm turbo dev                   # Vite + Node.js locales

# Tests y validación
pnpm turbo test                  # Vitest unit tests
pnpm turbo typecheck             # TypeScript checks
pnpm turbo lint                  # ESLint

# Simular producción completa
pnpm turbo build
docker compose up --build        # app completa en Docker :8080
```

---

## 8. VARIABLES DE ENTORNO

### 8.1 Producción (Azure App Service — Application Settings)

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=mysql://playflow_app:***@playflow-db.mysql.database.azure.com:3306/playflow_db
ALLOWED_ORIGIN=https://playflow-overlays.azurestaticapps.net
```

### 8.2 Desarrollo local (`.env`)

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=mysql://playflow_app:dev_password@localhost:3306/playflow_db
# ALLOWED_ORIGIN no requerido en dev (CORS abierto)
```

### 8.3 Vite build (Static Web App)

```bash
# Solo en CI/CD para el build de Static Web App
VITE_API_URL=https://playflow-server.azurewebsites.net/api
VITE_WS_URL=wss://playflow-server.azurewebsites.net
```

---

## 9. FLUJO DE DESARROLLO

### 9.1 Branching strategy

```
main         ── Deploy automático a PRODUCCIÓN (Azure)
dev          ── Integración continua
insiders     ── Early access, sincronizado desde dev
squad/*      ── Ramas de feature/fix por agentes e issues
```

**Reglas estrictas:**
- Nunca push directo a `main` ni `dev`
- Todo trabajo parte de `dev`
- PR siempre targeta `dev`, nunca `main`
- `main` solo recibe merges de `dev` mediante PR con review aprobado

### 9.2 Ciclo de vida de un cambio

```
1. Crear rama desde dev
   git checkout dev && git pull origin dev
   git checkout -b squad/{issue-number}-{kebab-slug}

2. Desarrollar localmente
   pnpm turbo dev          # servidor local
   pnpm turbo test         # tests pasan
   pnpm turbo typecheck    # sin errores TS

3. Push y PR a dev
   git push origin squad/{issue-number}-{slug}
   gh pr create --base dev --draft \
     --title "{descripción}" \
     --body "Closes #{issue-number}"

4. GitHub Actions CI (automático en PR)
   ├── pnpm install
   ├── pnpm turbo typecheck
   ├── pnpm turbo lint
   └── pnpm turbo test

5. Code review y aprobación → merge a dev

6. Cuando dev está estable → PR dev → main (release)

7. GitHub Actions Deploy (automático en push a main)
   ├── Build Docker → push a playflowacr
   ├── Deploy imagen → playflow-server (App Service)
   └── Build SPA → deploy → playflow-overlays (Static Web App)
```

### 9.3 Naming de ramas

```
squad/{issue-number}-{kebab-slug}

Ejemplos:
  squad/42-mysql-migration
  squad/55-scorer-panel
  squad/67-stats-module
```

---

## 10. PIPELINE CI/CD — GITHUB ACTIONS

### 10.1 Workflow CI (`.github/workflows/ci.yml`)

**Trigger:** Pull Request hacia `dev` o `main`

```
jobs:
  typecheck  → pnpm turbo typecheck
  lint       → pnpm turbo lint
  test       → pnpm turbo test (con coverage)
```

### 10.2 Workflow Deploy (`.github/workflows/deploy.yml`)

**Trigger:** Push a `main`

```
jobs:
  build-and-push-docker:
    - docker build -t playflowacr.azurecr.io/playflow-server:{sha}
    - docker push playflowacr.azurecr.io/playflow-server:{sha}
    - az webapp config container set \
        --name playflow-server \
        --resource-group playflow-prod-rg \
        --docker-custom-image-name playflowacr.azurecr.io/playflow-server:{sha}

  deploy-static-web-app:
    - pnpm turbo build --filter studio
    - Deploy dist/ → playflow-overlays (SWA token)
```

### 10.3 GitHub Secrets requeridos

| Secret | Descripción |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service Principal JSON para `az` CLI |
| `ACR_USERNAME` | Usuario de `playflowacr` |
| `ACR_PASSWORD` | Password de `playflowacr` |
| `AZURE_WEBAPP_NAME` | `playflow-server` |
| `DATABASE_URL` | Conexión MySQL producción |
| `ALLOWED_ORIGIN` | URL del Static Web App |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Token de deploy SWA |

---

## 11. MODELO DE SEGURIDAD

| Capa | Mecanismo |
|------|---------|
| DB ↔ App Service | Private Access (VNet) — MySQL no expuesto a internet |
| App Service → Cliente | HTTPS obligatorio, TLS 1.2+ |
| WebSocket | `wss://` en producción (TLS termina en App Service) |
| Credenciales | Azure Key Vault → App Settings (nunca en código ni git) |
| Control Panel | Sin auth v1 — acceso por red local / VPN |
| Scorer Panel | Sin auth v1 — restricción por IP si necesario |
| **Auth v2 (futuro)** | Azure AD B2C o JWT si se requiere acceso externo |

---

## 12. MÓDULO DE SCORING EN VIVO

### 12.1 Flujos de ingesta

```
Flujo A — Pitch por pitch (durante at-bat):
  Scorer → /live-game-scoring → POST /api/scorer/pitches/:gameId
    → MySQL pitches (persistencia)
    → stateStore.sendCommand('AddBall'|'AddStrike'|'ResetCount') (WS broadcast)
    → Scorebug overlay actualiza conteo

Flujo B — Registro del at-bat:
  Scorer → POST /api/scorer/at-bats/:gameId
    → MySQL at_bats (is_at_bat, is_plate_appearance, earned_runs automáticos)
    → stateStore.sendCommand('AddOut'|'IncrementScore') (WS broadcast)
    → Overlays actualizan marcador / stats

Flujo C — Corrimiento de bases:
  Scorer → POST /api/games/:gameId/baserunning
    → MySQL baserunning_events (responsible_pitcher_id del corredor en base)
    → stateStore.sendCommand('SetBase') (WS broadcast)

Flujo D — Sustitución:
  Scorer → POST /api/scorer/substitutions/:gameId
    Tipos: pitching_change | pinch_hitter | pinch_runner | defensive_change | double_switch
    → stateStore (SetPitcher/SetBatter/SetBase según tipo)
    → MySQL game_lineups (substituted_at, substituted_by)
    → MySQL game_events (event_type='substitution', payload JSON, context_before)

Flujo E — Corrección post at-bat:
  Scorer → DELETE /api/scorer/at-bats/:id (eliminar para reingreso)
  (PATCH de edición: pendiente de implementar)
```

### 12.2 Estándares de datos (Spec 29 / MLBAM)

| Estándar | Campo | Implementado |
|---------|-------|-------------|
| Coordenadas métricas | `plate_x`, `plate_z` (metros) | ✅ |
| Movimiento | `pfx_x`, `pfx_z` (metros) | ✅ |
| Velocidad | `start_speed`, `velocityKmh` (km/h) | ✅ |
| Spin | `spin_rate` (RPM), `spin_axis` (grados) | ✅ |
| Zonas | MLBAM 1-9 / 11-14 | ✅ |
| IDs externos | `mlbam_id`, `wbsc_id` en players/teams/leagues | ✅ |
| Vocab eventos | `field_out`, `walk`, `hit_by_pitch`, `sac_fly`… | ✅ |
| PA vs AB | `is_plate_appearance`, `is_at_bat` | ✅ |
| Earned runs | `earned_runs`, `unearned_runs` en at_bats | ✅ |
| Pitcher responsable | `responsible_pitcher_id` en baserunning_events | ✅ |
| `RunnerOnBaseWithPitcher` | stateStore rastrea pitcher por corredor | ✅ |
| Contexto de evento | `context_before/after` en game_events | ✅ |
| Sustituciones | 5 tipos MLBAM en game_events | ✅ |

### 12.3 API endpoints del scorer

```
POST /api/scorer/pitches/:gameId         — registrar lanzamiento
GET  /api/scorer/pitches/:gameId         — historial de pitches del juego
POST /api/scorer/at-bats/:gameId         — registrar at-bat
DELETE /api/scorer/at-bats/:id           — eliminar último at-bat
POST /api/scorer/substitutions/:gameId   — registrar sustitución
GET  /api/scorer/context/:gameId         — contexto del juego (lineups, score, estado)
GET  /api/games/:gameId/baserunning      — eventos de corrimiento
POST /api/games/:gameId/baserunning      — registrar corrimiento/carrera
GET  /api/games/:gameId/game-events      — log de eventos del partido
POST /api/games/:gameId/game-events      — registrar evento arbitrario
```

---

## 13. COSTOS

### 13.1 Producción

| Recurso | Nombre Azure | SKU | Costo/mes |
|---------|-------------|-----|----------|
| **Resource Group** | `rg-playflow-prod-eastus` | — | $0.00 |
| App Service Plan | `playflow-server` | B1 Linux | $12.41 |
| MySQL Flexible | `playflow-db` | B1ms | $12.41 |
| MySQL Storage | — | 32 GB | $3.20 |
| Static Web App | `playflow-overlays` | Free | $0.00 |
| Container Registry | `playflowacr` | Basic | $5.00 |
| **Total** | | | **~$33/mes** |

### 13.2 Desarrollo

| Recurso | Costo |
|---------|-------|
| MySQL local (Docker) | $0 |
| Node.js + Vite locales | $0 |
| GitHub Actions CI (2,000 min/mes free) | $0 |
| **Total** | **$0** |

---

## 14. ESTADO DE IMPLEMENTACIÓN

### 14.1 Completado ✅

| Módulo | Detalle |
|--------|---------|
| Schema MySQL | 31 tablas — `000_playflow_seed.sql` + `001_gap_fields.sql` |
| mysql2 integration | `db.ts` con pool de conexiones |
| write-through game state | `playflow_sessions` actualizado en cada comando WS |
| restore-on-startup | Lee último estado de `playflow_sessions` al arrancar |
| Docker Compose | MySQL + App Service en local, puertos fijos documentados |
| `.env.example` | Tabla de puertos y variables documentadas |
| Scorer en vivo (`/live-game-scoring`) | Pitches, at-bats, log unificado, bloqueo in_play |
| Sustituciones backend | 5 tipos MLBAM en `POST /api/scorer/substitutions/:gameId` |
| MLBAM compliance | field_out, is_at_bat, is_pa, earned_runs, spin_rate/axis, responsible_pitcher_id |
| context_before/after | game_events con snapshot de estado antes/después |
| RunnerOnBaseWithPitcher | stateStore rastrea pitcher responsable por corredor |
| Overlays (13) | scorebug, batter, pitcher, lineup, next-batters, substitution, game-event, inning-transition, final-score, sponsor-break, announcement, social-lower-third, countdown |
| Panel operador (`/control`) | OperatorControlPanel con WS real |

### 14.2 Pendiente ⏳

| # | Tarea | Prioridad |
|---|-------|----------|
| 1 | UI de sustituciones en LiveGameScoringPage | 🔴 Alta |
| 2 | PATCH /api/scorer/at-bats/:id (edición del último evento) | 🔴 Alta |
| 3 | Modo edición del último at-bat en LiveGameScoringPage | 🔴 Alta |
| 4 | Agregaciones de stats en tiempo real (AVG/ERA/etc.) | 🟡 Media |
| 5 | GitHub Actions CI workflow | 🟡 Media |
| 6 | GitHub Actions deploy workflow | 🟡 Media |
| 7 | Aprovisionamiento Azure (az CLI scripts) | 🟡 Media |

---

## 15. PRINCIPIOS DE ARQUITECTURA (FUENTE: docs/requirements)

Estos principios son inmutables y aplican a todo desarrollo presente y futuro:

1. **Fuente única de verdad deportiva:** Game Engine. Ningún overlay calcula marcador, inning, outs, bases ni conteo.
2. **Fuente única de verdad visual:** Asset Manager. Todos los recursos se consumen por `assetId`, nunca por ruta local.
3. **Contratos explícitos:** Todo mensaje entre componentes usa el envelope IC-003: `schemaVersion`, `messageType`, `correlationId`, `source`, `target`, `timestamp`, `payload`.
4. **Flujo visual:** `hidden` → `preview` → (Take) → `live`. Nunca saltar Preview a Program.
5. **Canvas:** 1920×1080, Grid 24×12, Safe Area 60px.
6. **Overlays independientes:** componentes aislados que consumen datos, no los calculan ni almacenan.
7. **Toda corrección manual se audita** (GE-017): operador, comando, estado anterior, estado nuevo, motivo.
8. **Credenciales desacopladas del cliente:** nombres de infra son funcionales, no referencian al club.

---

*Documento generado por Squad — para modificaciones abrir PR con base en `dev`.*
