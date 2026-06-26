# ADR-001 — Arquitectura de Producción
## Broadcast System — Club Mineros de Santiago

**Versión:** 1.0  
**Fecha:** 2026-06-24  
**Estado:** APROBADO  
**Autores:** Squad (Sandy, Babe, Jeter, Robinson, Mariano) + Luis (product owner)

---

## 1. VISIÓN GENERAL DEL SISTEMA

**Nombre técnico del sistema:** `broadcast-server`  
**Propósito:** Sistema de overlays en tiempo real para transmisiones de béisbol del Club Mineros de Santiago. Controla la presentación visual desde un panel de operador y distribuye overlays a múltiples fuentes en OBS/Meld Studio vía WebSocket.

### Audiencia

| Rol | Interfaz | Acceso |
|-----|---------|--------|
| Operador de broadcast | `/control` — Control Panel web | Red local / VPN |
| Scorer / estadísticas | `/scorer` — Scorer interface web | Red local / acceso externo |
| OBS / Meld Studio | `/overlay/:id` — Browser Source | Red local |
| Administrador | GitHub Actions + Azure Portal | Cloud |

---

## 2. DIAGRAMA DE ARQUITECTURA DE PRODUCCIÓN

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INTERNET / AZURE CDN                         │
└──────────────────────┬──────────────────┬───────────────────────────┘
                       │                  │
              ┌────────▼────────┐  ┌──────▼──────────────────────────┐
              │  Static Web App │  │     App Service B1 Linux        │
              │  broadcast-     │  │     broadcast-server            │
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
                                   │  broadcast-db                  │
                                   │  $12.41/mes + storage $3.20    │
                                   │                                │
                                   │  DB: broadcast_db              │
                                   │  User: broadcast_app           │
                                   │                                │
                                   │  • teams / players / games     │
                                   │  • game_lineups / at_bats      │
                                   │  • sponsors / campaigns        │
                                   │  • operator_actions (auditoría)│
                                   │  • broadcast_sessions (estado) │
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
| Nombre de base de datos | `broadcast_db` | MySQL, local y producción |
| Usuario de base de datos | `broadcast_app` | MySQL, mínimos privilegios |
| Imagen Docker | `broadcast-server` | Docker Hub / ACR |
| Contenedor Docker | `broadcast-server` | docker-compose, local |
| Azure App Service | `broadcast-server` | Portal Azure |
| Azure MySQL Server | `broadcast-db` | Portal Azure |
| Azure Container Registry | `broadcastacr` | Portal Azure (sin guiones) |
| Azure Static Web App | `broadcast-overlays` | Portal Azure |
| Azure Resource Group | `rg-broadcast-prod-eastus` | Portal Azure (CAF compliant) |
| Tag de imagen producción | `broadcast-server:{git-sha}` | Pipeline CI/CD |
| Tag de imagen latest | `broadcast-server:latest` | docker-compose local |

### 3.3 DATABASE_URL por entorno

```bash
# Desarrollo local (Docker Compose)
DATABASE_URL=mysql://broadcast_app:***@localhost:3306/broadcast_db

# Producción Azure
DATABASE_URL=mysql://broadcast_app:***@broadcast-db.mysql.database.azure.com:3306/broadcast_db
```

---

## 4. COMPONENTES — DEFINICIÓN Y RESPONSABILIDADES

### 4.0 Resource Group — Contenedor de todos los recursos Azure

| Propiedad | Valor |
|----------|-------|
| Nombre | `rg-broadcast-prod-eastus` |
| Región | East US (Virginia) |
| Convención | Azure CAF: `rg-{workload}-{environment}-{region}` |
| Propósito | Agrupar y gestionar todos los recursos del sistema como una unidad |

**Todos los recursos Azure residen en este grupo:**

```
rg-broadcast-prod-eastus/
├── broadcast-server          ← App Service Plan B1 + Web App (Node.js)
├── broadcast-db              ← MySQL Flexible Server B1ms
├── broadcastacr              ← Azure Container Registry (Basic)
└── broadcast-overlays        ← Static Web App (Free)
```

**Beneficios de agrupar:**
- Un solo comando para eliminar toda la infraestructura: `az group delete --name rg-broadcast-prod-eastus`
- Control de acceso (IAM) aplicado al grupo aplica a todos los recursos
- Monitoreo y costos agrupados en Azure Portal
- Todos los recursos en la misma región East US — sin latencia inter-región

---

### 4.1 Static Web Apps (Azure) — Free Tier

| Propiedad | Valor |
|----------|-------|
| Nombre Azure | `broadcast-overlays` |
| Costo | $0/mes |
| Propósito | Servir páginas de overlay para OBS (Browser Source) |
| Rutas | `/overlay/:id` |
| Build | `pnpm turbo build --filter overlay-server` → `dist/` |
| CDN | Global automático (Microsoft CDN) |
| CI/CD | GitHub Actions integrado automáticamente |
| Actualización | En cada push a `main` en paths de overlays |

**Justificación:** Los overlays son páginas estáticas que necesitan carga ultrarrápida para OBS. CDN global es imposible en App Service sin Azure Front Door (costo adicional). Static Web Apps lo provee gratis.

### 4.2 App Service B1 Linux — Node.js Server

| Propiedad | Valor |
|----------|-------|
| Nombre Azure | `broadcast-server` |
| Costo | $12.41/mes |
| SKU | B1ms — 1 vCPU, 1.75 GB RAM |
| Runtime | Docker container (imagen `broadcast-server:{sha}`) |
| Puerto interno | 8080 |
| Rutas servidas | `/api/*`, `wss://`, `/control`, `/scorer` |
| Persistencia | `/home` persistente entre reinicios |
| Escalado | Manual (no autoescalado en B1) |

**Responsabilidades:**
- WebSocket hub: broadcast de estado a todos los clientes conectados
- REST API: recibir comandos del operador y scorer
- Game State: fuente única de verdad deportiva en memoria + write-through a MySQL
- Restore on startup: leer último estado de `broadcast_sessions` al arrancar

### 4.3 MySQL Flexible Server B1MS

| Propiedad | Valor |
|----------|-------|
| Nombre Azure | `broadcast-db` |
| Costo | $12.41/mes compute + $3.20/mes storage 32GB |
| Versión | MySQL 8.0 |
| SKU | B1ms — 1 vCPU, 2 GB RAM |
| Base de datos | `broadcast_db` |
| Usuario app | `broadcast_app` |
| Conexiones máx. | 85 conexiones concurrentes |
| Backup | 7 días automático incluido |
| Acceso | Solo desde App Service (Private Access / VNet) |

### 4.4 Azure Container Registry

| Propiedad | Valor |
|----------|-------|
| Nombre Azure | `broadcastacr` |
| Costo | $5.00/mes (Basic tier) |
| Propósito | Almacenar imagen Docker `broadcast-server` |
| Retención | Últimas 5 imágenes por tag |

---

## 5. STACK TECNOLÓGICO

### 5.1 Estructura del monorepo

```
broadcast/                            ← raíz del monorepo
├── apps/
│   └── overlay-server/               ← app principal
│       ├── server/                   ← Node.js Express + WebSocket
│       │   ├── index.ts              ← entry point, CORS, static files
│       │   ├── stateStore.ts         ← game state + broadcast hub
│       │   ├── commandHandler.ts     ← procesamiento de comandos
│       │   ├── gameConfigRouter.ts   ← API /api/games
│       │   └── db/                   ← cliente MySQL (mysql2)
│       ├── src/                      ← React SPA (Vite)
│       │   ├── pages/
│       │   │   ├── OverlayPage.tsx   ← Browser Source OBS
│       │   │   ├── ControlPanel.tsx  ← panel operador /control
│       │   │   └── ScorerPanel.tsx   ← panel scorer /scorer [PENDIENTE]
│       │   └── App.tsx               ← router principal
│       ├── Dockerfile                ← multi-stage build
│       └── vite.config.ts
├── packages/
│   ├── core/                         ← contratos IC-003, tipos, envelopes
│   ├── design-system/                ← tokens visuales, componentes base
│   ├── game-engine/                  ← motor deportivo (fuente única)
│   ├── event-engine/                 ← eventos → acciones visuales
│   ├── scene-engine/                 ← gestión de escenas
│   ├── overlay-manager/              ← orquestador de renders
│   ├── asset-manager/                ← motor de assets
│   ├── sponsor-engine/               ← reglas comerciales
│   ├── layout-manager/               ← zonas, Preview/Program
│   ├── event-bus/                    ← bus de eventos interno
│   └── overlays/                     ← 12 overlays individuales
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
│   ├── mysql/migrations/             ← schema MySQL [PENDIENTE]
│   └── supabase/                     ← schema legacy (referencia)
├── docker-compose.yml                ← entorno local completo
├── .env.example                      ← plantilla de variables
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

### 6.2 Entidades

```sql
-- Estado de transmisión
broadcast_sessions  (id, game_id, state_json, started_at, updated_at)

-- Identidad
teams               (id, name, abbreviation, primary_color, logo_asset_id)
players             (id, team_id, name, number, position, bats, throws)
games               (id, home_team_id, away_team_id, scheduled_at, status)
game_lineups        (game_id, team_id, player_id, batting_order, position)

-- Estadísticas [módulo pendiente]
at_bats             (id, game_id, player_id, inning, result, rbi, runs, timestamp)
game_stats          (game_id, player_id, ab, h, hr, rbi, avg)

-- Comercial
sponsors            (id, name, logo_asset_id, active)
campaigns           (id, sponsor_id, placement, start_date, end_date)
overlay_configs     (overlay_type, config_json, updated_at)

-- Auditoría (GE-017)
operator_actions    (id, operator, command, prev_state, new_state, reason, timestamp)
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
      MYSQL_DATABASE: broadcast_db
      MYSQL_USER: broadcast_app
      MYSQL_PASSWORD: dev_password
    volumes:
      - db_dev_data:/var/lib/mysql
      - ./infra/mysql/migrations:/docker-entrypoint-initdb.d

  server:
    image: broadcast-server:latest
    build: apps/overlay-server
    ports: ["8080:8080"]
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://broadcast_app:dev_password@db:3306/broadcast_db
    depends_on: [db]

volumes:
  db_dev_data:
```

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
DATABASE_URL=mysql://broadcast_app:***@broadcast-db.mysql.database.azure.com:3306/broadcast_db
ALLOWED_ORIGIN=https://broadcast-overlays.azurestaticapps.net
```

### 8.2 Desarrollo local (`.env`)

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=mysql://broadcast_app:dev_password@localhost:3306/broadcast_db
# ALLOWED_ORIGIN no requerido en dev (CORS abierto)
```

### 8.3 Vite build (Static Web App)

```bash
# Solo en CI/CD para el build de Static Web App
VITE_API_URL=https://broadcast-server.azurewebsites.net/api
VITE_WS_URL=wss://broadcast-server.azurewebsites.net
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
   ├── Build Docker → push a broadcastacr
   ├── Deploy imagen → broadcast-server (App Service)
   └── Build SPA → deploy → broadcast-overlays (Static Web App)
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
    - docker build -t broadcastacr.azurecr.io/broadcast-server:{sha}
    - docker push broadcastacr.azurecr.io/broadcast-server:{sha}
    - az webapp config container set \
        --name broadcast-server \
        --resource-group broadcast-prod-rg \
        --docker-custom-image-name broadcastacr.azurecr.io/broadcast-server:{sha}

  deploy-static-web-app:
    - pnpm turbo build --filter overlay-server
    - Deploy dist/ → broadcast-overlays (SWA token)
```

### 10.3 GitHub Secrets requeridos

| Secret | Descripción |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service Principal JSON para `az` CLI |
| `ACR_USERNAME` | Usuario de `broadcastacr` |
| `ACR_PASSWORD` | Password de `broadcastacr` |
| `AZURE_WEBAPP_NAME` | `broadcast-server` |
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

## 12. MÓDULO DE ESTADÍSTICAS

### 12.1 Flujos de ingesta

```
Flujo A — Scorer manual (entre innings):
  Scorer → /scorer → POST /api/at-bats → MySQL → WS broadcast → Overlays

Flujo B — Tiempo real (durante at-bat):
  Scorer → /scorer → POST /api/at-bats?realtime=true
    → MySQL (persistencia)
    → stateStore.broadcastStats() (inmediato a todos los clientes WS)
    → Batter Overlay actualiza AVG / HR / RBI en pantalla

Flujo C — Corrección post at-bat:
  Scorer → PATCH /api/at-bats/:id
    → MySQL update
    → Recalcular game_stats (GROUP BY player_id)
    → WS broadcast con stats actualizadas
```

### 12.2 Impacto en arquitectura

- `at_bats`: ~1 insert cada 4 minutos por at-bat — write volume bajo
- Aggregations (`AVG = H/AB`) calculadas on-the-fly con SQL `GROUP BY` — sin materializar en v1
- MySQL B1ms (2 GB RAM) soporta este volumen sin problema
- Si stats crecen > 1M registros (temporadas acumuladas): evaluar índice compuesto `(game_id, player_id)`

---

## 13. COSTOS

### 13.1 Producción

| Recurso | Nombre Azure | SKU | Costo/mes |
|---------|-------------|-----|----------|
| **Resource Group** | `rg-broadcast-prod-eastus` | — | $0.00 |
| App Service Plan | `broadcast-server` | B1 Linux | $12.41 |
| MySQL Flexible | `broadcast-db` | B1ms | $12.41 |
| MySQL Storage | — | 32 GB | $3.20 |
| Static Web App | `broadcast-overlays` | Free | $0.00 |
| Container Registry | `broadcastacr` | Basic | $5.00 |
| **Total** | | | **~$33/mes** |

### 13.2 Desarrollo

| Recurso | Costo |
|---------|-------|
| MySQL local (Docker) | $0 |
| Node.js + Vite locales | $0 |
| GitHub Actions CI (2,000 min/mes free) | $0 |
| **Total** | **$0** |

---

## 14. TAREAS PENDIENTES — ORDEN DE IMPLEMENTACIÓN

| # | Tarea | Estado | Prioridad |
|---|-------|--------|----------|
| 1 | Schema MySQL (`infra/mysql/migrations/`) | ⏳ Pendiente | 🔴 Bloqueante |
| 2 | Reemplazar Supabase → mysql2 en server | ⏳ Pendiente | 🔴 Bloqueante |
| 3 | Write-through game state → `broadcast_sessions` | ⏳ Pendiente | 🔴 Alta |
| 4 | Restore-on-startup desde MySQL | ⏳ Pendiente | 🔴 Alta |
| 5 | Actualizar `docker-compose.yml` con MySQL local | ⏳ Pendiente | 🟡 Media |
| 6 | Actualizar `.env.example` con `DATABASE_URL` | ⏳ Pendiente | 🟡 Media |
| 7 | GitHub Actions CI workflow | ⏳ Pendiente | 🟡 Media |
| 8 | GitHub Actions deploy workflow | ⏳ Pendiente | 🟡 Media |
| 9 | Scorer panel (`/scorer`) + API at-bats | ⏳ Pendiente | 🟡 Media |
| 10 | Módulo estadísticas — at_bats + aggregations | ⏳ Pendiente | 🟡 Media |
| 11 | Overlays stats en tiempo real (Batter overlay) | ⏳ Pendiente | 🟡 Media |
| 12 | Aprovisionamiento Azure (az CLI scripts) | ⏳ Pendiente | 🟡 Media |

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
