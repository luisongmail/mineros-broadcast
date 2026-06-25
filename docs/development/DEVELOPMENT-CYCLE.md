# Ciclo de Desarrollo — Broadcast System
## Standards, Workflow, y Evolución del Producto

**Versión:** 1.0  
**Fecha:** 2026-06-24  
**Estado:** VIGENTE — todos los agentes y colaboradores deben respetar este documento  
**Ámbito:** Todo el repositorio `broadcast`

---

## 1. PRINCIPIOS DE TRABAJO

1. **La documentación manda.** Antes de implementar cualquier módulo, leer el ADR correspondiente en `docs/architecture/` y los requerimientos en `docs/requirements/`.
2. **Sin código sin definición.** Si una especificación no existe, no se implementa — se crea la especificación primero y se aprueba.
3. **Tests son obligatorios.** Ningún PR puede mergearse sin tests que cubran la funcionalidad nueva o modificada.
4. **Los cambios de schema son migraciones.** Toda modificación de base de datos es un archivo en `infra/mysql/migrations/`, nunca modificación directa.
5. **Los overlays no calculan ni almacenan.** Los overlays consumen datos, no los calculan. El GameEngine es la única fuente de verdad deportiva.
6. **Todos los assets pasan por el Asset Manager.** Nunca rutas directas a archivos en overlays o componentes.

---

## 2. ESTRUCTURA DE BRANCHES

```
main         ── Código de producción. Solo recibe merges desde dev via PR aprobado.
dev          ── Integración. Todo el trabajo de feature/fix aterriza aquí.
insiders     ── Early-access, sincronizado periódicamente desde dev.
squad/{n}-{slug}  ── Ramas de trabajo de agentes e issues.
hotfix/{slug}     ── Solo para fixes críticos en producción.
```

### Reglas estrictas

- **Nunca** push directo a `main` ni `dev`.
- **Nunca** ramas de feature que partan desde `main`.
- Toda rama de trabajo parte desde `dev` actualizado.
- Los hotfixes parten desde `main`, se mergean en `main` Y `dev`.

### Naming de ramas

```bash
# Feature o fix estándar (agentes o developers):
squad/{issue-number}-{kebab-slug}
Ejemplos:
  squad/42-mysql-migration
  squad/55-scorer-panel
  squad/67-canvas-single-overlay

# Hotfix crítico en producción:
hotfix/{descripcion-breve}
Ejemplos:
  hotfix/ws-reconnect-loop
  hotfix/scorebug-score-display
```

---

## 3. CICLO DE VIDA DE UN CAMBIO

```
1. ISSUE
   └── Crear issue en GitHub con título, descripción, criterios de aceptación
       Asignar label: feature | bug | chore | docs
       Asignar al agente responsable vía label squad:{nombre}

2. RAMA
   git checkout dev && git pull origin dev
   git checkout -b squad/{numero}-{slug}

3. DESARROLLO LOCAL
   pnpm install                  # si hay deps nuevas
   docker compose up db -d       # MySQL local
   pnpm turbo dev                 # servidor + Vite
   
   Ciclo de desarrollo:
   ├── Escribir test primero (TDD cuando aplique)
   ├── Implementar funcionalidad
   ├── pnpm turbo typecheck       # sin errores TS
   ├── pnpm turbo lint            # sin warnings
   └── pnpm turbo test            # todos los tests pasan

4. PULL REQUEST
   gh pr create --base dev --draft \
     --title "{descripción}" \
     --body "Closes #{numero}\n\n## Cambios\n...\n\n## Tests\n..."
   
   Checklist del PR:
   ├── [ ] Tests escritos y pasando
   ├── [ ] typecheck sin errores
   ├── [ ] lint sin warnings
   ├── [ ] Documentación actualizada si aplica
   ├── [ ] Migración de DB incluida si hay cambios de schema
   └── [ ] .env.example actualizado si hay variables nuevas

5. CI (automático)
   GitHub Actions ejecuta: typecheck → lint → test
   Si falla cualquiera → no puede mergearse

6. CODE REVIEW
   Al menos 1 aprobación requerida para merge a dev
   Al menos 2 aprobaciones requeridas para merge a main (release)

7. MERGE A DEV
   Usar "Squash and merge" — un commit limpio por PR
   Borrar la rama después del merge:
   git checkout dev && git pull origin dev
   git branch -d squad/{numero}-{slug}
   git push origin --delete squad/{numero}-{slug}

8. RELEASE (dev → main)
   Solo cuando dev está estable y se quiere publicar a producción:
   ├── Crear PR: dev → main
   ├── Ejecutar: pnpm changeset (para versión semántica)
   ├── 2 aprobaciones requeridas
   └── Merge → GitHub Actions despliega automáticamente a Azure

9. DEPLOY AUTOMÁTICO (en push a main)
   GitHub Actions:
   ├── Build Docker → push a broadcastacr
   ├── Deploy imagen → App Service broadcast-server
   └── Build SPA → deploy → Static Web App broadcast-overlays
```

---

## 4. ESTÁNDARES DE CÓDIGO

### 4.1 TypeScript

- TypeScript estricto en todos los packages (`strict: true`).
- **Sin `any`** — usar tipos propios o `unknown` con type guards.
- Interfaces para contratos públicos entre packages.
- Types para shapes de datos internos.
- Todo export público debe tener tipos explícitos (sin type inference en firmas de funciones públicas).

### 4.2 React

- Componentes funcionales con hooks.
- Props con interfaces TypeScript explícitas.
- **Sin estado local que duplique el estado del servidor** — los overlays son read-only consumers del WebSocket.
- CSS mediante Tailwind classes o tokens del `design-system`. Sin estilos inline salvo posicionamiento dinámico.

### 4.3 Node.js / Express

- Async/await en todos los handlers.
- Error handling explícito — nunca `catch` silencioso.
- Separar lógica de negocio de los routers.
- Variables de entorno validadas al arrancar (fail-fast si falta algo crítico).

### 4.4 Estructura de archivos

```
packages/{name}/
  src/
    index.ts          ← exports públicos del package
    {Name}.ts         ← implementación principal
    {Name}.test.ts    ← tests unitarios junto al código
    types.ts          ← tipos del package
  package.json
  tsconfig.json
  vite.config.ts      ← si es un package con build

apps/overlay-server/
  server/             ← código Node.js (no expuesto al browser)
    index.ts
    db.ts
    stateStore.ts
    commandHandler.ts
    gameConfigRouter.ts
  src/                ← código React (SPA)
    pages/
    components/
    App.tsx
```

### 4.5 Commits

```
Formato: {tipo}: {descripción corta en español}

Tipos:
  feat:     nueva funcionalidad
  fix:      corrección de bug
  chore:    tareas de mantenimiento (deps, config)
  docs:     solo documentación
  test:     solo tests
  refactor: refactorización sin cambio de funcionalidad
  style:    formato, whitespace (sin cambio de lógica)

Ejemplos:
  feat: agregar panel scorer con ingreso de at-bats
  fix: corregir reconexión WebSocket en overlay canvas
  chore: actualizar mysql2 a 3.10.0
  docs: documentar reglas de Baseball5 en ADR-002
```

Trailer obligatorio en commits de agentes:
```
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

---

## 5. ESTÁNDARES DE TESTING

### 5.1 Tipos de tests

| Tipo | Herramienta | Dónde | Qué cubre |
|------|------------|-------|----------|
| Unitarios | Vitest | `*.test.ts` junto al código | Lógica de negocio, engines, utils |
| Componentes | Vitest + Testing Library | `*.test.tsx` | Render, props, estado visual |
| Integración servidor | Vitest | `server/*.test.ts` | API handlers, WebSocket |
| E2E | Playwright | `e2e/` | Flujos completos operador→overlay |

### 5.2 Cobertura mínima requerida

- **GameEngine, EventEngine, SponsorEngine**: ≥ 90% de cobertura de líneas.
- **Routers / handlers**: ≥ 80%.
- **Componentes de overlay**: ≥ 70%.
- **Utilidades y helpers**: 100%.

### 5.3 Reglas de testing

- Los tests no deben depender de orden de ejecución.
- No usar `setTimeout` en tests — usar mocks de tiempo (Vitest fake timers).
- Los tests de servidor son stateful secuenciales cuando usan el singleton `stateStore` (ver nota en `commandHandler.test.ts`).
- Los tests de overlays usan datos mock, nunca conexión real al servidor.

---

## 6. BASE DE DATOS — PROCESO DE MIGRACIÓN

### 6.1 Crear una migración

```bash
# Nueva migración (siempre secuencial):
infra/mysql/migrations/
  001_initial_schema.sql        ← ✅ existente
  002_demo_seed.sql             ← ✅ existente
  003_sports_leagues.sql        ← próxima migración
  004_...

# Convención de nombres:
{numero_secuencial}_{descripcion_snake_case}.sql
```

### 6.2 Reglas de migraciones

- **Solo additive** — nunca borrar columnas o tablas en una migración (pueden existir referencias en producción). Borrar requiere una migración en 2 fases:
  1. Migración que deja de usar la columna (deprecar)
  2. Migración que la elimina (cuando se confirma que no hay referencias)
- Toda migración debe poder ejecutarse múltiples veces sin errores (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... IF NOT EXISTS`).
- Incluir datos de seed para tablas de referencia (`sports` por ejemplo).
- Probar la migración localmente con `docker compose up db` antes de commitear.

### 6.3 Aplicar migraciones

```bash
# Local (Docker):
docker compose up db -d
# Las migraciones en /docker-entrypoint-initdb.d/ se aplican automáticamente
# al crear el volumen por primera vez.

# Para re-aplicar desde cero:
docker compose down -v && docker compose up db -d

# Producción Azure (manual hasta que se automatice):
mysql -h broadcast-db.mysql.database.azure.com \
      -u broadcast_app -p broadcast_db \
      < infra/mysql/migrations/003_sports_leagues.sql
```

---

## 7. PROCESS DE RELEASE

### 7.1 Versionado semántico

El proyecto usa [changesets](https://github.com/changesets/changesets):

```bash
# Al terminar una feature o fix:
pnpm changeset
# Seleccionar packages afectados
# Elegir: patch | minor | major
# Escribir descripción del cambio

# El changeset se commitea junto con el PR
```

### 7.2 Versiones del sistema

| Versión | Contenido |
|---------|-----------|
| v0.1.0 | Design System + Asset Manager + Scorebug (✅ completado) |
| v0.2.0 | GameEngine + LayoutManager + OverlayManager + Contracts (✅) |
| v0.3.0 | Overlays individuales completos (✅) |
| v0.4.0 | Docker + MySQL + deploy workflow (✅) |
| **v0.5.0** | **Canvas único + modelo multideporte + scorer panel** |
| v0.6.0 | Módulo estadísticas en tiempo real |
| v0.7.0 | Plataforma Azure habilitada + CI/CD productivo |
| v1.0.0 | QA acceptance, e2e tests, documentación operativa |

---

## 8. GESTIÓN DE ENTORNOS

### 8.1 Entornos definidos

| Entorno | URL | DB | Deploy |
|---------|-----|----|--------|
| **Local dev** | `localhost:3001` (server) + `:5173` (Vite) | MySQL Docker local | Manual (`pnpm turbo dev`) |
| **Docker local** | `localhost:8080` | MySQL Docker local | `docker compose up` |
| **Producción** | `broadcast-server.azurewebsites.net` | Azure MySQL Flexible | Automático en push a `main` |

No hay entorno de staging formal en v0.x. Las pruebas se hacen en local Docker antes de merge a main.

### 8.2 Variables de entorno

```bash
# Requeridas en producción:
DATABASE_URL          ← conexión MySQL Azure
ALLOWED_ORIGIN        ← URL del Static Web App
NODE_ENV=production
PORT=8080

# Opcionales / desarrollo:
DATABASE_URL=mysql://broadcast_app:dev_password@localhost:3306/broadcast_db
NODE_ENV=development
PORT=3001
```

Ver `.env.example` para la lista completa y comentarios.

---

## 9. PLATAFORMAS DE DESARROLLO Y PRODUCCIÓN

### 9.1 Plataforma local (costo $0)

```bash
# Requisitos mínimos:
Node.js 20 LTS
pnpm 9.x
Docker Desktop (para MySQL local)
Git

# Setup inicial:
git clone {repo}
pnpm install
docker compose up db -d
pnpm turbo dev

# URLs locales:
http://localhost:5173/broadcast    ← overlay canvas (dev)
http://localhost:5173/control      ← panel operador (dev)
http://localhost:3001/api/info     ← health check API
```

### 9.2 Plataforma de producción (Azure)

```
Resource Group: rg-broadcast-prod-eastus (East US)
├── broadcast-server    App Service B1 Linux  — $12.41/mes
├── broadcast-db        MySQL Flexible B1ms   — $15.61/mes
├── broadcastacr        Container Registry    — $5.00/mes
└── broadcast-overlays  Static Web App Free   — $0.00/mes

Total: ~$33/mes
```

### 9.3 Habilitación de plataforma de producción (pasos pendientes)

```bash
# 1. Crear Resource Group
az group create --name rg-broadcast-prod-eastus --location eastus

# 2. Crear MySQL Flexible Server
az mysql flexible-server create \
  --resource-group rg-broadcast-prod-eastus \
  --name broadcast-db \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --admin-user broadcast_admin \
  --admin-password {password_segura} \
  --database-name broadcast_db \
  --location eastus

# 3. Crear usuario de aplicación
mysql -h broadcast-db.mysql.database.azure.com -u broadcast_admin -p
  CREATE USER 'broadcast_app'@'%' IDENTIFIED BY '{password}';
  GRANT SELECT, INSERT, UPDATE, DELETE ON broadcast_db.* TO 'broadcast_app'@'%';

# 4. Aplicar migraciones iniciales
mysql -h broadcast-db.mysql.database.azure.com -u broadcast_app -p broadcast_db \
  < infra/mysql/migrations/001_initial_schema.sql

# 5. Crear Container Registry
az acr create \
  --resource-group rg-broadcast-prod-eastus \
  --name broadcastacr \
  --sku Basic

# 6. Crear App Service Plan + Web App
az appservice plan create \
  --resource-group rg-broadcast-prod-eastus \
  --name broadcast-server-plan \
  --sku B1 --is-linux

az webapp create \
  --resource-group rg-broadcast-prod-eastus \
  --plan broadcast-server-plan \
  --name broadcast-server \
  --deployment-container-image-name broadcastacr.azurecr.io/broadcast-server:latest

# 7. Configurar variables de entorno en App Service
az webapp config appsettings set \
  --resource-group rg-broadcast-prod-eastus \
  --name broadcast-server \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    DATABASE_URL="mysql://broadcast_app:{pass}@broadcast-db.mysql.database.azure.com:3306/broadcast_db" \
    ALLOWED_ORIGIN="https://broadcast-overlays.azurestaticapps.net"

# 8. Crear Static Web App
az staticwebapp create \
  --resource-group rg-broadcast-prod-eastus \
  --name broadcast-overlays \
  --location eastus \
  --source {repo_url} \
  --branch main \
  --token {github_token}

# 9. Configurar GitHub Secrets para CI/CD
# AZURE_CREDENTIALS, ACR_USERNAME, ACR_PASSWORD,
# AZURE_WEBAPP_NAME, DATABASE_URL, ALLOWED_ORIGIN,
# AZURE_STATIC_WEB_APPS_API_TOKEN
```

---

## 10. MONITOREO Y OBSERVABILIDAD

### 10.1 Health checks definidos

| Endpoint | Descripción | Usado por |
|----------|-------------|----------|
| `GET /api/info` | Metadata del servidor, overlays disponibles | Docker healthcheck, Azure |
| `GET /api/state` | Estado actual del juego | Panel de control, debug |

### 10.2 Logging estándar

```typescript
// Formato de logs del servidor:
console.info('[ComponentName] Descripción', { dato1, dato2 });
console.warn('[ComponentName] Advertencia no crítica', error);
console.error('[ComponentName] Error crítico', error);

// Prefijos por módulo:
[StateStore]       — gestión de estado del juego
[GameConfigRouter] — API de configuración
[WSServer]         — WebSocket
[DB]               — operaciones de base de datos
```

### 10.3 Azure Monitor (pendiente v0.7.0)

- Application Insights para métricas de la app
- Alertas: tiempo de respuesta > 2s, errores 5xx > 5/min
- Dashboard de disponibilidad del servicio

---

## 11. GESTIÓN DE AGENTES (SQUAD)

### 11.1 Roles del equipo

Los agentes tienen roles fijos, ver `.squad/team.md` para el roster actual.

### 11.2 Asignación de trabajo

```bash
# El coordinador (Squad) asigna issues vía labels:
squad:sandy     ← Backend, DB, server
squad:babe      ← Overlay lifecycle, componentes React
squad:jeter     ← GameEngine, reglas deportivas
squad:robinson  ← Datos, seeds, migrations
squad:mariano   ← Integraciones, APIs externas
```

### 11.3 Decisiones del equipo

Las decisiones del equipo se registran en `.squad/decisions.md` y el inbox en `.squad/decisions/inbox/`. Los agentes no modifican `decisions.md` directamente — lo hace el Scribe.

### 11.4 Documentos que los agentes DEBEN leer antes de trabajar

```
docs/architecture/ADR-001-architecture.md   ← infraestructura y naming
docs/architecture/ADR-002-sports-model.md   ← modelo multideporte
docs/architecture/ADR-003-canvas-overlay.md ← canvas único
docs/development/DEVELOPMENT-CYCLE.md       ← este documento
docs/requirements/{módulo}.md               ← requerimientos del módulo específico
```

---

## 12. ELEMENTOS PENDIENTES DE DEFINICIÓN

Los siguientes elementos están identificados pero **no tienen especificación completa** al 2026-06-24. Deben definirse antes de implementarse:

### Críticos para v0.5.0

| # | Elemento | Descripción |
|---|---------|-------------|
| P1 | **Asset storage backend** | ¿Dónde viven físicamente los logos y fotos? ¿Azure Blob Storage? ¿Directorio en el servidor? Definir el `AssetManager` de producción. |
| P2 | **Scorer panel `/scorer`** | Interface para ingresar estadísticas en tiempo real. Flujo de at-bats, correcciones. |
| P3 | **Migración schema v2** | Actualizar `infra/mysql/migrations/` para incluir `sports`, `leagues`, `tournaments`, `rosters`, `game_lineups_v2`. |
| P4 | **GameEngine multideporte** | Parametrizar el GameEngine existente para recibir `GameRules` y comportarse según la disciplina. |
| P5 | **Canvas único — implementación** | Refactorizar `/overlay/:id` → `/broadcast` con `BroadcastCanvas`. |

### Importantes para v0.6.0

| # | Elemento | Descripción |
|---|---------|-------------|
| P6 | **Stats aggregation** | ¿Dónde se calculan AVG, ERA, OBP? ¿SQL en tiempo real o caché en memoria? |
| P7 | **Offline/resiliencia** | ¿Qué pasa si la DB cae durante el juego? ¿El broadcast continúa con el estado en memoria? |
| P8 | **WebSocket reconexión** | Estrategia de reconexión automática del cliente (overlay canvas) cuando se cae el WS. |
| P9 | **Multi-game support** | ¿Puede el servidor manejar 2 partidos simultáneos? ¿Cómo se identifica el canal del partido? |

### Para v1.0.0

| # | Elemento | Descripción |
|---|---------|-------------|
| P10 | **Autenticación** | El panel de control actualmente no tiene auth. Definir si se necesita JWT, OAuth, o restricción por IP. |
| P11 | **Preview/Program mode** | Operador puede previsualizar un overlay antes de ponerlo al aire. Requiere doble canal WS o flag en el mensaje. |
| P12 | **Historial de juego** | Log completo de todos los eventos para replay o auditoría. ¿Se guarda en DB? |
| P13 | **Localización (i18n)** | ¿Los overlays soportarán texto en inglés para eventos internacionales? |
| P14 | **Hotkeys del operador** | Atajos de teclado para el panel de control durante transmisiones en vivo. |
| P15 | **Manual del operador** | Guía de uso completa para el operador de broadcast. |

---

## 13. INICIO DE NUEVO CICLO DE DESARROLLO

### Orden correcto para iniciar v0.5.0

```
Fase 1 — Definición (sin código):
  1. Definir P1 (asset storage)     → ADR a crear
  2. Definir P2 (scorer panel UI)   → wireframes + spec
  3. Revisar P8 (WS reconexión)     → spec técnica
  Aprobación del product owner antes de continuar.

Fase 2 — Plataforma de desarrollo:
  4. Verificar docker compose up funciona con el schema actual
  5. Aplicar migraciones nuevas (P3)
  6. Seed de disciplinas deportivas

Fase 3 — Implementación (agentes en paralelo):
  Jeter:    GameEngine multideporte (P4)
  Babe:     Canvas único BroadcastCanvas (P5)
  Sandy:    Migración DB schema v2 (P3)
  Robinson: Scorer panel backend API
  Mariano:  Scorer panel frontend UI (P2)

Fase 4 — Integración y QA:
  7. Tests de integración GameEngine + Canvas
  8. Prueba manual con OBS local
  9. PR a dev → CI verde → merge
  10. Release v0.5.0 con changeset
```

---

*Este documento es vinculante para todos los agentes y colaboradores. Última actualización: 2026-06-24.*
