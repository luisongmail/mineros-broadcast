# ADR-001 — Arquitectura de Producción
## PlayFlow — Plataforma de Producción Deportiva en Vivo, Automatización Broadcast y Publicación Multicanal

**Versión:** 3.0  
**Fecha:** 2026-06-27  
**Estado:** PROPUESTO PARA APROBACIÓN  
**Autores:** Squad (Sandy, Babe, Jeter, Robinson, Mariano) + Luis (product owner)  
**Versión anterior:** ADR-001 v2.0 — Arquitectura de Producción  
**Documento relacionado:** Especificación del módulo de seguridad PlayFlow — documento independiente.

---

## 0. CAMBIOS v3.0

Esta versión actualiza ADR-001 v2.0 como nueva versión mayor de arquitectura, incorporando los módulos y conceptos definidos para la evolución de PlayFlow.

### Cambios principales

1. Se mantiene el nombre de producto **PlayFlow**.
2. Se mantiene el nombre técnico interno correcto: `playflow-server`.
3. Se mantienen los identificadores definitivos:
   - base de datos: `playflow_db`;
   - usuario de base de datos: `playflow_app`;
   - App Service: `playflow-server`;
   - MySQL Server: `playflow-db`;
   - ACR: `playflowacr`;
   - Static Web App: `playflow-overlays`;
   - Resource Group: `rg-playflow-prod-eastus`;
   - tabla de estado: `playflow_sessions`.
4. Se conserva la infraestructura actual de bajo costo:
   - Azure App Service B1 Linux;
   - Azure Static Web Apps Free;
   - MySQL Flexible Server B1ms;
   - Azure Container Registry Basic.
5. Se incorpora formalmente el **Game Event Orchestrator**.
6. Se incorpora formalmente el **Broadcast Automation Engine**.
7. Se separa el **Game Engine / Game State Engine** como fuente única de verdad deportiva.
8. Se incorpora el concepto de **FlowDefinition** para automatizaciones.
9. Se incorpora el **Flow Builder** como interfaz visual para editar automatizaciones.
10. Se incorpora el **Execution Log** para trazabilidad de flujos.
11. Se incorpora el **Game Intelligence Engine** como motor separado para inferencias, probabilidades y sugerencias.
12. Se define el evento `broadcast.started` para inicio de transmisión.
13. Se define el uso combinado de WebSocket y Web Push:
    - WebSocket para clientes activos;
    - Web Push para PWA/usuarios en segundo plano.
14. Se actualiza la separación de responsabilidades entre:
    - scoring;
    - estado del juego;
    - broadcast;
    - overlays;
    - seguridad;
    - inteligencia deportiva.
15. Se elimina de este ADR la especificación detallada de seguridad.
16. Se deja la seguridad como boundary arquitectónico y se referencia el documento especializado.

---

## 1. DEFINICIÓN DE PLAYFLOW

**Nombre del producto:** PlayFlow  
**Nombre técnico interno:** `playflow-server`  
**Categoría del producto:** Plataforma de producción deportiva en vivo, automatización broadcast y publicación multicanal basada en eventos.  
**Dominio inicial:** Béisbol y sóftbol.  
**Dominio extensible:** Otros deportes con lógica de eventos, marcador, estadísticas, transmisión y visualización en vivo.

### 1.1 Definición corta

PlayFlow es una plataforma que transforma lo que ocurre en un partido en vivo en eventos estructurados, estado deportivo confiable, estadísticas, automatizaciones de transmisión, overlays, pizarra, notificaciones, auditoría, inteligencia deportiva y publicación multicanal.

### 1.2 Definición extendida

PlayFlow no debe definirse solamente como un sistema de overlays ni como un scorebug.  
Tampoco debe definirse como una integración con YouTube.

Los overlays, el scorebug, la pizarra, las notificaciones y la publicación hacia YouTube son salidas o canales de distribución del sistema.  
El núcleo de PlayFlow es el procesamiento de eventos deportivos y su conversión en producción en vivo.

PlayFlow permite:

```text
capturar el juego
estructurar eventos deportivos
mantener el estado oficial del partido
registrar estadísticas
automatizar acciones de transmisión
controlar scorebug, overlays y pizarra
gestionar layouts, assets y sponsors
generar timelines de broadcast
integrarse con herramientas de producción como OBS/Meld Studio
publicar y enriquecer transmisiones en plataformas como YouTube
registrar trazabilidad operativa
producir insights e inferencias deportivas
notificar eventos importantes
```

La arquitectura parte de una idea central:

```text
El partido se entiende como una secuencia de eventos.
Cada evento puede producir efectos deportivos, estadísticos, operativos, visuales, analíticos y de publicación.
```

### 1.3 Qué es PlayFlow

PlayFlow se define en tres capas jerárquicas:

**Núcleo — lo que diferencia el producto:**

```text
Event-Based Live Sports Production System
Motor de scoring en vivo con cumplimiento MLBAM/WBSC
Registro oficial con vocabulario MLBAM y métricas WBSC/SI
Orquestador de efectos deportivos, estadísticos y operativos
Sistema de estado deportivo (fuente única de verdad)
Sistema de auditoría y correcciones
```

**Capa de producción visual — salidas del núcleo:**

```text
Controlador de scorebug
Administrador de overlays y pizarra
Motor de automatización broadcast
Motor de sponsors y assets
```

**Capa de distribución — canales externos:**

```text
Hub de publicación multicanal
Notificaciones importantes a suscriptores
Inteligencia deportiva para broadcast
```

Toda salida visual y toda distribución son consecuencias del núcleo. El núcleo es el procesamiento correcto del partido.

### 1.4 Qué no es PlayFlow

PlayFlow no es solamente:

```text
un overlay server
un scorebug
una pizarra
un panel de anotación
un sistema de streaming
una integración con YouTube
un CMS de contenido deportivo
una base de datos de estadísticas
un editor visual aislado
```

Cada uno de esos elementos puede existir dentro de PlayFlow, pero ninguno define por sí solo el producto.

### 1.5 Frase rectora del producto

```text
PlayFlow captura y estructura lo que ocurre en el partido, mantiene el registro oficial con
cumplimiento MLBAM/WBSC, y lo convierte en producción en vivo, estadísticas y contenido publicable.
```

### 1.6 Cadena funcional principal

```text
Game Capture (registro MLBAM/WBSC-compliant)
→ Game Event (envelope versionado IC-003)
→ Game Event Orchestrator (efectos deportivos, estadísticos, operativos)
→ Game State (fuente única de verdad oficial)
→ Stats Engine (AVG, ERA, OBP, WHIP y derivados)
→ Broadcast Timeline
→ Scorebug / Overlay / Board
→ Media Publishing
→ Execution Log
→ Game Intelligence
```

### 1.7 Capacidades principales

| Capacidad | Descripción |
|---|---|
| Captura del juego | Permite registrar pitches, turnos, corridas, sustituciones, decisiones y eventos del partido. |
| Estado deportivo | Mantiene inning, marcador, outs, bases, conteo, lineups, lanzadores y corredores responsables. |
| Estadísticas | Calcula estadísticas de bateo, pitcheo, defensa, corrido de bases y eventos avanzados. |
| Automatización broadcast | Convierte eventos deportivos en acciones visuales temporizadas. |
| Scorebug | Presenta el estado vivo del partido en forma persistente. |
| Overlays | Muestra información contextual, jugadores, sustituciones, sponsors, eventos e insights. |
| Pizarra | Presenta line score, totales, lanzadores, próximos bateadores, auspiciadores y contexto del juego. |
| Flow Builder | Permite definir flujos de automatización sin editar JSON directamente. |
| Execution Log | Registra cómo se procesó cada evento y qué acciones generó. |
| Inteligencia deportiva | Genera probabilidades, alertas, tendencias y sugerencias basadas en datos. |
| Notificaciones | Comunica eventos relevantes como inicio de transmisión o resultado v3.0. |
| Publicación multicanal | Conecta el partido y la producción con plataformas externas como YouTube, sin convertirlas en fuente de verdad. |
| Seguridad | Autoriza acciones, roles y scopes mediante un módulo separado de especificación propia. |

### 1.8 Relación entre módulos

```text
Live Game Scoring captura eventos.
Game Event Orchestrator interpreta eventos.
Game State Engine mantiene la verdad del partido.
Stats Engine calcula consecuencias estadísticas.
Broadcast Automation Engine genera acciones de transmisión.
Overlay Manager renderiza salidas visuales.
Media Publishing Hub conecta la producción con plataformas externas.
Game Intelligence Engine estima probabilidades e insights.
Security Module autoriza y audita acciones críticas.
```

### 1.9 Producto vs componente técnico

| Nivel | Nombre | Descripción |
|---|---|---|
| Producto | PlayFlow | Plataforma completa de producción deportiva. |
| Servidor | `playflow-server` | Backend principal Node.js + Express + WebSocket. |
| App principal | `apps/studio` | SPA y servidor integrado de operación. |
| Overlay app | `playflow-overlays` | Static Web App para browser sources/PWA. |
| Motor deportivo | `game-engine` | Fuente única de verdad del estado del juego. |
| Orquestador | `game-event-orchestrator` | Procesa eventos y dispara efectos. |
| Automatización | `broadcast-automation-engine` | Genera timelines visuales. |
| Publicación | `media-publishing-hub` | Gestiona publicación, metadatos, marcadores y plataformas externas. |
| Adaptador YouTube | `youtube-publishing-adapter` | Integra PlayFlow con YouTube Live y contenidos derivados. |
| Inteligencia | `game-intelligence-engine` | Calcula inferencias, probabilidades y sugerencias. |
| Seguridad | `security` | Autenticación, autorización, roles, permisos, capabilities y auditoría. |

### 1.10 Propósito arquitectónico

El objetivo de PlayFlow es evitar que la transmisión dependa de acciones manuales aisladas y convertir la operación en un flujo controlado:

```text
un evento confirmado
produce efectos consistentes
actualiza el estado correcto
genera visualizaciones coherentes
puede producir contenido publicable
mantiene trazabilidad
y permite análisis posterior
```

### 1.11 Rol de YouTube en la arquitectura

YouTube no es el centro de PlayFlow.  
YouTube es un canal de publicación y distribución.

La fuente de verdad sigue siendo:

```text
Game Event Store
Game State Engine
Stats Engine
Broadcast Timeline
Execution Log
```

La integración con YouTube agrega valor porque permite:

```text
crear o asociar transmisiones
mantener metadatos del partido
registrar URL pública de visualización
relacionar streamId con gameId
publicar eventos relevantes como timestamps
preparar clips/highlights derivados de eventos
crear playlists por torneo/equipo/categoría
consultar métricas básicas posteriores
usar el inicio de transmisión como evento del sistema
```

### 1.12 Fuera de este ADR

La definición detallada de seguridad, autenticación, autorización, roles, permisos, administración delegada, OTP, step-up authentication, auditoría de seguridad y no repudio práctico queda en el documento independiente:

```text
Especificación del módulo de seguridad PlayFlow
```

La definición técnica detallada de integración con YouTube puede evolucionar como documento propio:

```text
Especificación del módulo Media Publishing Hub / YouTube Publishing Adapter
```

Este ADR solo define los puntos de integración de seguridad y publicación con la arquitectura productiva.

---

## 2. AUDIENCIA E INTERFACES

| Rol | Interfaz | Ruta | Acceso esperado |
|-----|----------|------|-----------------|
| Operador de broadcast | Control Panel | `/control` | Red local / VPN / acceso autenticado |
| Scorer / anotador | Live Game Scoring | `/live-game-scoring` | Red local o externo autenticado |
| OBS / Meld Studio | Browser Source | `/overlay/:id` | Red local / fuente de navegador |
| Administrador funcional | Admin Console | `/admin` | Acceso autenticado |
| Administrador de flujos | Flow Builder | `/admin/flow-builder` | Acceso autenticado y autorizado |
| Gestión usuarios/roles | User & Access Management | `/admin/users` | Acceso autenticado y autorizado |
| Espectador PWA | PWA / Live View | `/live/:gameId` | Público o autenticado según configuración |
| Sistema externo | REST/WebSocket API | `/api/*`, `wss://` | API tokens / sesión autorizada |
| Publicación / YouTube | Media Publishing Hub | `/admin/media`, `/api/media/*` | Acceso autenticado y autorizado |
| Administrador plataforma | GitHub Actions + Azure Portal | — | Cloud |

---

## 3. DIAGRAMA DE ARQUITECTURA DE PRODUCCIÓN

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                            INTERNET / AZURE CDN                              │
└──────────────────────────┬─────────────────────────────┬─────────────────────┘
                           │                             │
                ┌──────────▼──────────┐       ┌──────────▼────────────────────┐
                │  Static Web App     │       │   App Service B1 Linux        │
                │  playflow-overlays  │       │   playflow-server             │
                │  Free Tier          │       │   Node.js + Express + WS      │
                │                     │       │                               │
                │  /overlay/:id       │       │   REST API /api/*             │
                │  /live/:gameId      │       │   WebSocket wss://            │
                │  Browser Source     │       │   /control                    │
                │  PWA assets         │       │   /live-game-scoring          │
                │  CDN global         │       │   /admin                      │
                └──────────┬──────────┘       │   /admin/flow-builder         │
                           │                  │                               │
                           │                  │   ┌────────────────────────┐  │
                           │                  │   │ Game Event Orchestrator │  │
                           │                  │   ├────────────────────────┤  │
                           │                  │   │ Game Engine             │  │
                           │                  │   │ Stats Engine            │  │
                           │                  │   │ Broadcast Automation    │  │
                           │                  │   │ Flow Builder API        │  │
                           │                  │   │ Game Intelligence       │  │
                           │                  │   │ Security Boundary       │  │
                           │                  │   └───────────┬────────────┘  │
                           │                  └───────────────┬───────────────┘
                           │                                  │
                           │                    ┌─────────────▼───────────────┐
                           │                    │ MySQL Flexible Server B1MS  │
                           │                    │ playflow-db                 │
                           │                    │ DB: playflow_db             │
                           │                    │ User: playflow_app          │
                           │                    │                             │
                           │                    │ • teams / players / games   │
                           │                    │ • game_lineups / at_bats    │
                           │                    │ • pitches / game_events     │
                           │                    │ • playflow_sessions         │
                           │                    │ • flow_definitions          │
                           │                    │ • flow_execution_logs       │
                           │                    │ • broadcast_timelines       │
                           │                    │ • sponsors / campaigns      │
                           │                    │ • operator_actions          │
                           │                    └─────────────────────────────┘
                           │
                 ┌─────────▼─────────┐
                 │ OBS / Meld Studio │
                 │ Browser Sources   │
                 │ Scorebug/overlays │
                 └───────────────────┘
```

Costo base de producción estimado:

```text
App Service B1 Linux:             ~$12.41/mes
MySQL Flexible B1ms:              ~$12.41/mes
MySQL Storage 32GB:               ~$3.20/mes
Static Web App Free:              $0
Container Registry Basic:         ~$5.00/mes
Total estimado base:              ~$33/mes
```

Los costos de notificaciones push, autenticación administrada externa o servicios adicionales de seguridad no forman parte del costo base de este ADR y se evalúan en el documento de seguridad.

---

## 4. PRINCIPIO DE ARQUITECTURA

Los principios completos se definen en la **Sección 37 — Principios de Arquitectura Inmutables**.

Resumen operativo:

```text
El juego se procesa por eventos.
Los eventos generan efectos (estado, estadísticas, broadcast, auditoría).
Los overlays renderizan datos; no calculan ni almacenan el estado oficial.
La seguridad autoriza antes de ejecutar.
Toda acción crítica queda registrada.
El registro cumple estándares MLBAM/WBSC.
```

---

## 5. NAMING CONVENTIONS

### 5.1 Convención general

Los identificadores de infraestructura son funcionales y desacoplados del cliente.  
El nombre del club no aparece en credenciales, nombres de recursos Azure, imágenes Docker ni conexiones de base de datos.

### 5.2 Tabla de identificadores

| Identificador | Valor | Contexto |
|--------------|-------|---------|
| Producto | `PlayFlow` | Nombre comercial |
| Nombre técnico interno | `playflow-server` | Servidor principal |
| Nombre de base de datos | `playflow_db` | MySQL, local y producción |
| Usuario de base de datos | `playflow_app` | MySQL, mínimos privilegios |
| Imagen Docker | `playflow-server` | Docker Hub / ACR |
| Contenedor Docker | `playflow-server` | docker-compose, local |
| Azure App Service | `playflow-server` | Portal Azure |
| Azure MySQL Server | `playflow-db` | Portal Azure |
| Azure Container Registry | `playflowacr` | Portal Azure |
| Azure Static Web App | `playflow-overlays` | Portal Azure |
| Azure Resource Group | `rg-playflow-prod-eastus` | Portal Azure |
| Tag de imagen producción | `playflow-server:{git-sha}` | Pipeline CI/CD |
| Tag latest | `playflow-server:latest` | docker-compose local |

### 5.3 DATABASE_URL por entorno

```bash
# Desarrollo local
DATABASE_URL=mysql://playflow_app:***@localhost:3306/playflow_db

# Producción Azure
DATABASE_URL=mysql://playflow_app:***@playflow-db.mysql.database.azure.com:3306/playflow_db
```

---

## 6. COMPONENTES DE INFRAESTRUCTURA

### 6.1 Resource Group

| Propiedad | Valor |
|----------|-------|
| Nombre | `rg-playflow-prod-eastus` |
| Región | East US |
| Convención | Azure CAF: `rg-{workload}-{environment}-{region}` |
| Propósito | Agrupar recursos de producción |

Recursos incluidos:

```text
rg-playflow-prod-eastus/
├── playflow-server
├── playflow-db
├── playflowacr
└── playflow-overlays
```

---

### 6.2 Static Web Apps — `playflow-overlays`

| Propiedad | Valor |
|----------|-------|
| Costo | $0/mes |
| Propósito | Servir overlays, PWA, live view y browser sources |
| Rutas | `/overlay/:id`, `/live/:gameId` |
| CDN | Global automático |
| Build | `pnpm turbo build --filter studio` → `dist/` |

Responsabilidades:

```text
Browser Sources para OBS/Meld
Overlays estáticos
PWA pública o semipública
Pantallas live/viewer
Service worker para PWA
Web Push subscription client
```

---

### 6.3 App Service B1 Linux — `playflow-server`

| Propiedad | Valor |
|----------|-------|
| Costo | ~$12.41/mes |
| SKU | B1ms — 1 vCPU, 1.75 GB RAM |
| Runtime | Docker container |
| Imagen | `playflow-server:{sha}` |
| Stack | Node.js + Express + ws |
| Puerto interno | 8080 |
| Rutas | `/api/*`, `wss://`, `/control`, `/scorer`, `/live-game-scoring`, `/admin` |
| Persistencia | `/home` persistente entre reinicios |
| Escalado | Manual en B1 |

Responsabilidades:

```text
REST API
WebSocket hub
Game Event Orchestrator
Game Engine / Game State Engine
Stats Engine
Broadcast Automation Engine
Flow Builder API
Game Intelligence Engine
Media Publishing Hub
YouTube Publishing Adapter
Security boundary
Execution Log writer
Restore on startup
Write-through a MySQL
```

---

### 6.4 MySQL Flexible Server B1MS — `playflow-db`

| Propiedad | Valor |
|----------|-------|
| Costo | ~$12.41/mes compute + ~$3.20/mes storage |
| Versión | MySQL 8.0 |
| SKU | B1ms — 1 vCPU, 2 GB RAM |
| Base de datos | `playflow_db` |
| Usuario app | `playflow_app` |
| Conexiones máx. | 85 conexiones concurrentes |
| Backup | 7 días automático incluido |
| Acceso | Solo desde App Service |

Responsabilidades:

```text
Persistencia de datos deportivos
Estado de transmisión en playflow_sessions
Eventos del juego
Eventos de automatización
Definiciones de flujos
Logs de ejecución
Auditoría operativa
Configuración de overlays
Sponsors/campañas
Assets metadata
```

---

### 6.5 Azure Container Registry — `playflowacr`

| Propiedad | Valor |
|----------|-------|
| Costo | ~$5.00/mes |
| SKU | Basic |
| Propósito | Almacenar imagen Docker `playflow-server` |
| Retención | Últimas 5 imágenes por tag |

---

## 7. STACK TECNOLÓGICO

### 7.1 Monorepo — Estado actual (implementado)

Los paquetes y archivos marcados con `[v3]` son planificados para v3.0 y **no existen todavía**.

```text
playflow/
├── apps/
│   └── studio/                           ← app principal (@playflow/studio)
│       ├── server/
│       │   ├── index.ts                  ← entry point Express + WS
│       │   ├── db.ts                     ← mysql2 pool
│       │   ├── stateStore.ts             ← game state en memoria + WS hub + EventEngine
│       │   ├── commandHandler.ts         ← comandos del juego
│       │   ├── wsServer.ts               ← WebSocket server
│       │   ├── apiV1Router.ts            ← router raíz /api/v1
│       │   ├── routerUtils.ts            ← helpers comunes de router
│       │   ├── scorerRouter.ts           ← pitches, at-bats, sustituciones
│       │   ├── pitchesRouter.ts          ← game-events con context_before/after
│       │   ├── baserunningRouter.ts      ← corrimiento de bases, responsible_pitcher
│       │   ├── gameConfigRouter.ts       ← configuración de partido
│       │   ├── leaguesTournamentsRouter.ts ← ligas y torneos
│       │   ├── teamsRouter.ts            ← equipos
│       │   ├── clubsRouter.ts            ← clubes
│       │   ├── categoriesRouter.ts       ← categorías por deporte
│       │   ├── playersRouter.ts (via teamsRouter)
│       │   ├── sponsorsRouter.ts         ← sponsors y campañas
│       │   ├── layoutRouter.ts           ← layouts de overlay
│       │   ├── venuesRouter.ts           ← venues/estadios
│       │   ├── devicesRouter.ts          ← dispositivos registrados
│       │   ├── exportRouter.ts           ← exportación de datos
│       │   ├── lifecycleRouter.ts        ← ciclo de vida del partido
│       │   ├── matchMetadataRouter.ts    ← metadata del partido
│       │   ├── securityRouter.ts         [v3] ← pendiente (documento de seguridad)
│       │   ├── usersRouter.ts            [v3]
│       │   ├── rolesRouter.ts            [v3]
│       │   ├── flowBuilderRouter.ts      [v3]
│       │   ├── gameEventsRouter.ts       [v3] ← POST /api/games/:gameId/events
│       │   ├── broadcastAutomationRouter.ts [v3]
│       │   ├── intelligenceRouter.ts     [v3]
│       │   ├── mediaPublishingRouter.ts  [v3]
│       │   ├── youtubePublishingRouter.ts [v3]
│       │   └── executionLogRouter.ts     [v3]
│       ├── src/
│       │   ├── pages/
│       │   │   ├── OverlayPage.tsx        ← Browser Source canvas
│       │   │   ├── App.tsx                ← OperatorControlPanel (ruta /control)
│       │   │   ├── LiveGameScoringPage.tsx ← scoring en vivo (ruta /live-game-scoring)
│       │   │   ├── ScorerPage.tsx
│       │   │   ├── LoginPage.tsx          [v3]
│       │   │   ├── AdminUsersPage.tsx     [v3]
│       │   │   └── FlowBuilderPage.tsx    [v3]
│       │   ├── security/                  [v3]
│       │   │   ├── SecurityContextProvider.tsx
│       │   │   ├── useCapabilities.ts
│       │   │   └── ProtectedAction.tsx
│       │   └── App.tsx
│       ├── Dockerfile
│       └── vite.config.ts
├── packages/
│   ├── core/                             ← contratos IC-003, tipos, envelopes ✅
│   ├── design-system/                    ← tokens, componentes base ✅
│   ├── game-engine/                      ← estado deportivo, comandos ✅
│   ├── event-engine/                     ← eventos → acciones de overlay/sponsor ✅
│   ├── scene-engine/                     ← catálogo de escenas ✅
│   ├── overlay-manager/                  ← orquestador de renders ✅
│   ├── asset-manager/                    ← motor de assets ✅
│   ├── sponsor-engine/                   ← reglas comerciales ✅
│   ├── layout-manager/                   ← zonas, Preview/Program ✅
│   ├── game-event-orchestrator/          [v3] ← pendiente
│   ├── broadcast-automation-engine/      [v3] ← pendiente
│   ├── game-intelligence-engine/         [v3] ← pendiente
│   ├── media-publishing-hub/             [v3] ← pendiente
│   ├── youtube-publishing-adapter/       [v3] ← pendiente
│   ├── flow-builder/                     [v3] ← pendiente
│   ├── security/                         [v3] ← pendiente
│   ├── execution-log/                    [v3] ← pendiente
│   ├── event-bus/                        [v3] ← pendiente
│   └── overlays/
│       ├── scorebug/                     ✅
│       ├── batter/                       ✅
│       ├── pitcher/                      ✅
│       ├── lineup/                       ✅
│       ├── next-batters/                 ✅
│       ├── substitution/                 ✅
│       ├── game-event/                   ✅
│       ├── inning-transition/            ✅
│       ├── final-score/                  ✅
│       ├── sponsor-break/                ✅
│       ├── announcement/                 ✅
│       ├── social-lower-third/           ✅
│       ├── countdown/                    ✅
│       ├── plate-appearance-replay/      [v3]
│       ├── win-probability/              [v3]
│       └── tactical-insight/             [v3]
├── infra/
│   └── mysql/migrations/
│       ├── 000_playflow_seed.sql         ← 31 tablas base ✅
│       └── 001_gap_fields.sql            ← campos MLBAM compliance ✅
├── docker-compose.yml
├── .env.example
└── turbo.json
```

### 7.2 Decisiones tecnológicas ratificadas

| Decisión | Elección | Descartadas | Razón |
|---------|----------|-------------|-------|
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

```text
Azure Functions: no soporta WebSocket persistente.
SQL Server Express: requiere VM, mayor costo y mayor gestión.
Supabase: riesgo de pausa por inactividad en plan gratuito.
SQLite: no soporta bien acceso concurrente desde scorer externo.
Azure Table Storage: no tiene SQL aggregations necesarias para estadísticas.
```

---

## 8. ARQUITECTURA LÓGICA DEL DOMINIO

```text
Live Game Scoring View
        │
        ▼
Game Event Orchestrator
        │
        ├── Game Rules Engine
        ├── Stats Engine
        ├── Game State Engine
        ├── Process Engine
        ├── Manual Review Engine
        ├── Broadcast Automation Engine
        ├── Media Publishing Hub
        ├── Game Intelligence Engine
        └── Execution Log

Broadcast Automation Engine
        │
        ├── Scorebug Controller
        ├── Overlay Manager
        ├── Layout Manager
        ├── Asset Manager
        ├── Sponsor Engine
        ├── Notification Adapter
        ├── Media Publishing Hub
        └── Broadcast Timeline Queue
```

---

## 8.1 ARQUITECTURA ACTUAL — EventEngine + stateStore

> Esta sección documenta lo que está **implementado hoy** (MVP). Es la base sobre la que se construirá el Game Event Orchestrator formal (sección 9).

### Componentes activos

```text
LiveGameScoringPage (UI)
        │  REST POST
        ▼
scorerRouter / pitchesRouter / baserunningRouter
        │  scribe a MySQL + actualiza stateStore
        ▼
stateStore (en memoria)
        │
        ├── Game State actualizado (inning, outs, bases, conteo, score)
        │
        ├── EventEngine (packages/event-engine)
        │       ├── Interpreta el tipo de evento (batter_changed, pitcher_changed,
        │       │   inning_started, inning_ended, home_run, …)
        │       ├── Genera OverlayRequest → showOverlay / hideOverlay
        │       ├── Genera SceneRequest  → requestScene (sceneId)
        │       └── Genera SponsorRequest → requestSponsor (placement)
        │
        └── WebSocket broadcast a todos los clientes
                ├── {type:'state'}    → scorebug, panel operador
                ├── {type:'show'}     → OverlayPage activa overlay
                ├── {type:'hide'}     → OverlayPage oculta overlay
                ├── {type:'scene'}    → App.tsx auto-carga overlay en Preview
                └── {type:'sponsor'} → canal comercial
```

### Limitaciones actuales vs diseño v3.0

| Aspecto | MVP actual | v3.0 |
|---------|-----------|-------|
| Autorización | Sin verificar (AUTH_ENABLED=false) | SecurityModule pre-evento |
| FlowDefinitions | Reglas hardcodeadas en event-engine/rules.ts | Configurable desde Flow Builder |
| Execution Log | Solo logs de servidor | Tabla flow_execution_logs |
| Correcciones | Eliminación del último at-bat | Evento de corrección con reprocesamiento |
| Stats en tiempo real | Calculadas en SQL on-the-fly | Stats Engine dedicado |
| WebSocket canales | Un solo broadcast por partdo | Canales segmentados por gameId/role |

---

## 9. GAME EVENT ORCHESTRATOR

### 9.1 Propósito

El **Game Event Orchestrator** procesa eventos confirmados del juego y decide sus consecuencias.

No es una interfaz gráfica.  
No es un overlay.  
No es una tabla de estadísticas.  
Es el motor que transforma eventos deportivos en efectos.

### 9.2 Responsabilidades

```text
recibir eventos confirmados
validar estructura mínima
seleccionar FlowDefinition aplicable
ejecutar reglas deportivas
calcular efectos estadísticos
calcular nuevo estado del juego
generar acciones de proceso
generar acciones broadcast
solicitar revisión manual cuando corresponda
registrar Execution Log
garantizar idempotencia
```

### 9.3 Entradas

```text
GameEventEnvelope
CurrentGameState
RuleSet
FlowDefinitions
BroadcastPolicy
SecurityAuthorization
```

### 9.4 Salidas

```text
FlowExecutionResult
StatsEffects
GameStateUpdate
BroadcastTimeline
ProcessActions
ManualReviewRequest
ExecutionLog
```

### 9.5 Regla fundamental

```text
El orquestador no procesa eventos críticos sin autorización resuelta.
```

La autorización es calculada por el módulo de seguridad y llega al evento como parte del contexto de ejecución.  
La definición detallada de seguridad vive en el documento especializado.

---

## 10. GAME EVENT ENVELOPE

Todo evento procesable debe usar un sobre consistente.

```json
{
  "schemaVersion": "1.0",
  "eventId": "evt_004_003",
  "gameId": "game_2026_001",
  "type": "baseball.pitch.confirmed",
  "correlationId": "corr_004",
  "causationId": "evt_004_002",
  "sequence": 128,
  "ruleSetId": "baseball_default_2026",
  "createdBy": "usr_123",
  "createdAt": "2026-06-27T20:42:18.000Z",
  "actor": {
    "userId": "usr_123",
    "sessionId": "sess_456",
    "authLevel": "otp"
  },
  "authorization": {
    "decision": "allow",
    "policy": "game.scoreEventCreate",
    "reason": "user_is_assigned_scorer",
    "policyVersion": "security-policy-v1.0.0"
  },
  "contextBefore": {
    "inning": 4,
    "half": "top",
    "outs": 1,
    "balls": 1,
    "strikes": 2,
    "score": {
      "away": 2,
      "home": 4
    },
    "bases": {
      "first": null,
      "second": {
        "runnerId": "player_018",
        "responsiblePitcherId": "player_045"
      },
      "third": {
        "runnerId": "player_023",
        "responsiblePitcherId": "player_045"
      }
    },
    "batterId": "player_012",
    "pitcherId": "player_045",
    "catcherId": "player_002"
  },
  "data": {},
  "reviewStatus": "confirmed"
}
```

---

## 11. FLOWDEFINITION

### 11.1 Propósito

Una `FlowDefinition` describe qué debe ocurrir cuando se produce un evento.

Estructura conceptual:

```text
Trigger
→ Guards
→ Stats Effects
→ Game State Effects
→ Broadcast Timeline
→ Process Actions
→ Manual Review Policy
→ Rollback Policy
```

### 11.2 Ejemplo

```json
{
  "flowId": "strikeout.called.standard",
  "version": "1.0.0",
  "name": "Tercer strike cantado sin cierre de media entrada",
  "trigger": {
    "eventType": "baseball.pitch.confirmed",
    "match": {
      "data.result.pitchResult": "called_strike",
      "contextBefore.strikes": 2
    }
  },
  "guards": [
    {
      "field": "contextBefore.outs",
      "operator": "<",
      "value": 2
    }
  ],
  "automationLevel": "AUTO_SAFE",
  "effects": {
    "stats": [],
    "gameState": [],
    "process": []
  },
  "broadcast": {
    "timeline": []
  },
  "manualReview": {
    "required": false
  },
  "rollback": {
    "strategy": "compensating_event"
  }
}
```

### 11.3 Niveles de automatización

| Nivel | Definición |
|---|---|
| `AUTO_SAFE` | Se puede ejecutar sin intervención manual. |
| `AUTO_WITH_CONFIRMATION` | El sistema propone y el anotador confirma. |
| `SUGGEST_ONLY` | El sistema sugiere, pero no aplica. |
| `MANUAL_REQUIRED` | El anotador debe decidir. |
| `NOT_AUTOMATABLE` | No puede determinarse con los datos disponibles. |

---

## 12. FLOW BUILDER

### 12.1 Propósito

El **Flow Builder** es la interfaz visual para editar automatizaciones sin tocar JSON directamente.

Ruta:

```text
/admin/flow-builder
```

Nombre técnico:

```text
GameEventFlowBuilder
```

### 12.2 Estructura visual

```text
Biblioteca de flujos
Canvas visual
Inspector de nodo
Validador
JSON generado
Simulador
Historial de versiones
```

### 12.3 Bloques editables

```text
Trigger
Guards
Stats Effects
Game State Effects
Broadcast Timeline
Process Actions
Manual Review
Rollback
Notifications
```

### 12.4 Reglas

```text
El Flow Builder genera FlowDefinition.
El usuario no edita JSON como mecanismo principal.
Todo flujo publicado requiere autorización.
Todo flujo publicado queda auditado.
Los cambios de seguridad del Flow Builder se definen en el documento de seguridad.
```

---

## 13. BROADCAST AUTOMATION ENGINE

### 13.1 Propósito

Convierte resultados deportivos confirmados en acciones de transmisión.

No calcula el marcador.  
No decide reglas deportivas.  
No modifica estadísticas.  
Solo construye un `BroadcastTimeline`.

### 13.2 Responsabilidades

```text
generar timeline visual
actualizar scorebug
mostrar overlays
ocultar overlays
cancelar overlays
coordinar Layout Manager
resolver assets
consultar Sponsor Engine
enviar notificaciones cuando el flujo lo indique
registrar acciones en Execution Log
```

### 13.3 BroadcastTimeline

```json
{
  "timelineId": "timeline_evt_004_003",
  "gameId": "game_2026_001",
  "sourceEventId": "evt_004_003",
  "correlationId": "corr_004",
  "policy": {
    "cancelOnNextPitch": true,
    "respectScorebugPersistent": true
  },
  "actions": [
    {
      "at": "+0ms",
      "type": "scorebug.update",
      "priority": 100
    },
    {
      "at": "+250ms",
      "type": "overlay.show",
      "overlay": "strikeout",
      "variant": "standard",
      "durationMs": 2500,
      "priority": 80,
      "zone": "center"
    }
  ]
}
```

---

## 14. SCOREBUG CONTROLLER

### 14.1 Propósito

Renderizar el estado oficial del juego de forma persistente.

### 14.2 Reglas

```text
El scorebug consume GameStateUpdate.
El scorebug no calcula el estado.
El scorebug es persistente.
El scorebug tiene prioridad visual máxima.
El scorebug no se oculta por overlays temporales.
```

### 14.3 Fuente de datos

```text
Game State Engine
→ Scorebug State
→ Scorebug Controller
→ Overlay scorebug
```

---

## 15. OVERLAY MANAGER

### 15.1 Propósito

Ejecuta acciones visuales ya decididas.

Acciones:

```text
overlay.show
overlay.hide
overlay.replace
overlay.update
overlay.cancel
overlay.setPersistent
```

### 15.2 Reglas

```text
Los overlays no calculan estadísticas.
Los overlays no calculan marcador.
Los overlays no leen directo de base de datos.
Los overlays reciben payloads ya preparados.
Los overlays se aíslan por componente.
```

---

## 16. LAYOUT MANAGER

### 16.1 Propósito

Resolver conflictos visuales y zonas de pantalla.

### 16.2 Reglas

```text
Canvas 1920×1080
Grid 24×12
Safe Area 60px
Preview antes de Program
Scorebug priority 100
Overlays temporales respetan zonas
No tapar información crítica
```

### 16.3 Flujo visual

```text
hidden → preview → take → live → hide
```

Nunca se debe saltar de `hidden` directo a `live` para overlays de producción que requieran validación visual.

---

## 17. ASSET MANAGER

### 17.1 Propósito

Centralizar recursos visuales.

Recursos:

```text
logos
fotos de jugadores
placeholders
logos de sponsor
fondos
íconos
assets por categoría
```

### 17.2 Regla

```text
Ningún overlay recibe rutas directas.
Todo overlay consume assetId.
```

Ejemplo:

```json
{
  "assetRole": "playerPhoto",
  "assetId": "asset_player_018_photo",
  "fallbackAssetId": "asset_placeholder_player"
}
```

---

## 18. SPONSOR ENGINE

### 18.1 Propósito

Determinar cuándo y cómo mostrar sponsors.

### 18.2 Inputs

```text
eventType
gameId
inning
teamId
placement
campaign rules
exposure limits
```

### 18.3 Salida

```json
{
  "showSponsor": true,
  "sponsorId": "sponsor_merchise",
  "assetId": "asset_sponsor_merchise_logo",
  "placement": "overlay_footer",
  "durationMs": 2500
}
```

---

## 19. NOTIFICATION ADAPTER

### 19.1 Propósito

Enviar notificaciones derivadas de eventos relevantes.

Casos:

```text
broadcast.started
broadcast.ended
game.delayed
game.ended
highlight.created
```

### 19.2 Canales

```text
WebSocket: clientes activos
Web Push: PWA / usuarios en segundo plano
```

### 19.3 Regla

```text
No usar push para cada jugada.
Usar push solo para eventos importantes.
```

### 19.4 Evento broadcast.started

```json
{
  "eventId": "evt_broadcast_started_001",
  "gameId": "game_2026_001",
  "type": "broadcast.started",
  "correlationId": "corr_broadcast_001",
  "createdAt": "2026-06-27T20:00:00Z",
  "createdBy": "operator_001",
  "data": {
    "streamId": "stream_001",
    "title": "Mineros vs Astros",
    "status": "live",
    "startedAt": "2026-06-27T20:00:00Z",
    "watchUrl": "https://...",
    "platform": "youtube",
    "visibility": "public"
  }
}
```

### 19.5 Flujo broadcast.started

```text
broadcast.started
→ guardar evento
→ actualizar game.broadcastStatus = live
→ WebSocket a clientes activos
→ Web Push a suscriptores
→ overlay.broadcast_intro
→ overlay.scoreboard
→ scorebug.show
→ Execution Log
```

---

## 20. MEDIA PUBLISHING HUB

### 20.1 Propósito

El **Media Publishing Hub** conecta la producción del partido con plataformas externas de publicación y distribución.

Su objetivo no es reemplazar OBS, Meld Studio ni el flujo de producción.  
Su objetivo es vincular el partido, sus eventos, su metadata, sus timestamps y sus contenidos derivados con plataformas como YouTube.

### 20.2 Regla fundamental

```text
PlayFlow mantiene la fuente de verdad del partido.
YouTube publica y distribuye la transmisión o el contenido derivado.
```

YouTube no calcula marcador.  
YouTube no almacena el estado oficial.  
YouTube no decide estadísticas.  
YouTube no reemplaza al Game Event Orchestrator.  
YouTube es un canal externo gestionado desde PlayFlow.

### 20.3 Responsabilidades

```text
asociar gameId con streamId externo
crear o vincular transmisiones externas
guardar watchUrl
guardar RTMP ingest URL si aplica
guardar stream key de forma segura según política de seguridad
gestionar título, descripción, categoría y visibilidad
asociar miniatura/thumbnail
publicar evento broadcast.started
registrar timestamps importantes del partido
preparar highlights o clips derivados de eventos
organizar contenido por liga, torneo, equipo o categoría
consultar métricas básicas posteriores
mantener trazabilidad de publicación
```

### 20.4 Relación con OBS / Meld Studio

OBS o Meld Studio siguen siendo los responsables de producir la señal v3.0.

```text
PlayFlow genera overlays, scorebug, pizarra y contexto.
OBS/Meld compone la señal v3.0.
YouTube recibe la señal v3.0 como plataforma de publicación.
PlayFlow mantiene la relación entre partido, eventos y publicación.
```

### 20.5 YouTube Publishing Adapter

El `YouTube Publishing Adapter` es el primer adaptador concreto del Media Publishing Hub.

Responsabilidades esperadas:

```text
gestionar canal autorizado
crear live broadcast
crear o asociar live stream
obtener o registrar watchUrl
asociar gameId ↔ youtubeBroadcastId
actualizar metadata del video
publicar thumbnail
marcar inicio y fin de transmisión
crear timestamps por evento importante
preparar descripciones automáticas del partido
agrupar videos en playlists por torneo/equipo/categoría
obtener analytics básicos post partido
```

### 20.6 Eventos principales

```text
media.channel.connected
media.broadcast.created
media.broadcast.linked
media.broadcast.started
media.broadcast.ended
media.marker.created
media.highlight.suggested
media.highlight.published
media.analytics.synced
```

### 20.7 Evento media.broadcast.linked

```json
{
  "eventId": "evt_media_linked_001",
  "gameId": "game_2026_001",
  "type": "media.broadcast.linked",
  "correlationId": "corr_media_001",
  "createdAt": "2026-06-27T19:30:00Z",
  "createdBy": "operator_001",
  "data": {
    "provider": "youtube",
    "externalBroadcastId": "yt_broadcast_123",
    "externalStreamId": "yt_stream_456",
    "watchUrl": "https://youtube.com/watch?v=...",
    "visibility": "public",
    "title": "Mineros vs Astros",
    "scheduledStartTime": "2026-06-27T20:00:00Z"
  }
}
```

### 20.8 Relación con broadcast.started

`broadcast.started` es un evento interno de PlayFlow.

Puede ser provocado por:

```text
acción manual del operador
confirmación desde el panel de broadcast
detección o confirmación del estado de YouTube
inicio efectivo de la señal en la plataforma externa
```

Flujo sugerido:

```text
media.broadcast.linked
→ operador inicia transmisión
→ broadcast.started
→ WebSocket a clientes activos
→ Web Push a suscriptores
→ overlay.broadcast_intro
→ scorebug.show
→ media marker inicial
→ Execution Log
```

### 20.9 Marcadores y highlights

El Media Publishing Hub puede convertir eventos deportivos en marcadores de video.

Ejemplos:

```text
home run
strikeout importante
doble play
cambio de lanzador
inicio de inning
v3.0 de partido
jugada revisada
momento destacado sugerido por Game Intelligence Engine
```

Ejemplo:

```json
{
  "markerId": "marker_001",
  "gameId": "game_2026_001",
  "sourceEventId": "evt_004_003",
  "provider": "youtube",
  "videoId": "yt_video_123",
  "timecode": "00:42:18",
  "label": "Strikeout looking",
  "tags": ["strikeout", "pitcher", "inning-4"]
}
```

### 20.10 Seguridad del módulo

La seguridad detallada vive en la especificación de seguridad.

Este ADR solo define que:

```text
conectar canal externo requiere autorización
crear transmisión requiere autorización
publicar o cambiar metadata requiere autorización
leer o usar stream key requiere control especial
stream keys y tokens OAuth no se registran en logs
toda acción de publicación queda auditada
```

### 20.11 Estado de implementación

Este módulo se considera:

```text
referenciado arquitectónicamente
no implementado en MVP actual
planificado como extensión natural de Broadcast Automation
```

---

## 21. GAME INTELLIGENCE ENGINE

### 21.1 Propósito

Generar inferencias, probabilidades, alertas y visualizaciones a partir de eventos.

No forma parte del estado oficial del juego.

### 21.2 Responsabilidades

```text
probabilidad de bateo
probabilidad de embasarse
probabilidad de ponche
probabilidad de walk
probabilidad de ganar
sugerencias de cambio de lanzador
alertas tácticas
tendencias de bateador
tendencias de lanzador
visualización animada de turnos
insights para broadcast
```

### 21.3 Regla fundamental

```text
Stats Engine registra lo que ocurrió.
Game State Engine define cómo queda el juego.
Game Intelligence Engine estima lo que podría ocurrir.
Broadcast Automation Engine decide si se muestra.
```

### 21.4 Salida de insight

```json
{
  "type": "insight.created",
  "gameId": "game_2026_001",
  "sourceEventId": "evt_004_003",
  "insight": {
    "type": "pitcher_fatigue_warning",
    "level": "warning",
    "message": "Evaluar cambio de lanzador: control bajando y contacto fuerte reciente.",
    "confidence": "medium",
    "sampleSize": 18,
    "modelVersion": "pitcher-fatigue-v1"
  }
}
```

### 21.5 Niveles de confianza

```text
high
medium
low
experimental
```

### 21.6 Regla de broadcast

No se deben mostrar inferencias de baja confianza como si fueran hechos.  
Todo insight probabilístico debe indicar que es estimado.

---

## 22. PLATE APPEARANCE REPLAY OVERLAY

### 22.1 Propósito

Representar esquemática y animadamente un turno.

Nombre recomendado:

```text
Plate Appearance Replay Overlay
```

### 22.2 Datos requeridos

```text
plateAppearanceId
batterId
pitcherId
pitch sequence
location grid
pitch type
pitch result
count after each pitch
final_result
```

### 22.3 Uso

```text
entre turnos
después de strikeout
después de walk
después de hit importante
como replay esquemático para broadcast
```

---

## 23. EXECUTION LOG

### 23.1 Propósito

Registrar la ejecución de cada flujo automatizado.

Debe responder:

```text
qué evento entró
qué flujo se seleccionó
qué condiciones se evaluaron
qué efectos estadísticos se aplicaron
qué estado cambió
qué overlays se programaron
qué notificaciones se enviaron
qué assets se resolvieron
qué sponsor se seleccionó
qué falló
qué usuario lo ejecutó
qué autorización lo permitió
```

### 23.2 FlowExecutionLog

```json
{
  "flowRunId": "flowrun_004_003",
  "gameId": "game_2026_001",
  "sourceEventId": "evt_004_003",
  "correlationId": "corr_004",
  "flowId": "strikeout.called.standard",
  "flowVersion": "1.0.0",
  "automationLevel": "AUTO_SAFE",
  "status": "completed",
  "startedAt": "2026-06-27T20:42:18.100Z",
  "completedAt": "2026-06-27T20:42:18.480Z",
  "durationMs": 380,
  "steps": [],
  "warnings": [],
  "errors": []
}
```

### 23.3 Estados

```text
accepted
selected
running
waiting_manual_review
completed
completed_with_warnings
failed_recoverable
failed_blocking
rolled_back
superseded
```

---

## 24. CORRECCIONES, REPLAY E IDEMPOTENCIA

### 24.1 Correcciones

No se debe editar silenciosamente un evento confirmado.

Debe generarse un evento de corrección:

```json
{
  "type": "baseball.event.corrected",
  "originalEventId": "evt_004_003",
  "correctionEventId": "evt_004_003_correction_001",
  "reason": "Scorer changed hit to error",
  "createdBy": "scorer_001",
  "createdAt": "2026-06-27T20:45:10Z"
}
```

### 24.2 Reprocesamiento

Al corregir:

```text
marcar evento original como superseded
recalcular desde el evento afectado
recalcular estadísticas
reemitir scorebug si corresponde
actualizar pizarra si corresponde
registrar auditoría y execution log
```

### 24.3 Idempotencia

Clave sugerida:

```text
gameId + sourceEventId + flowId + flowVersion
```

Garantías:

```text
no duplicar pitch count
no duplicar estadísticas
no duplicar outs
no duplicar overlays persistentes
no aplicar dos veces el mismo avance de corredor
```

---

## 25. MODELO DE SEGURIDAD — BOUNDARY ARQUITECTÓNICO

La seguridad se define en documento independiente.

Este ADR solo establece que:

```text
1. Todo endpoint crítico debe validar autorización.
2. La UI consume capabilities desde backend.
3. El backend es la fuente de verdad de permisos.
4. El orquestador no procesa eventos estadísticos sin autorización.
5. La estadística solo la administra el anotador asignado o SysAdmin.
6. Las acciones críticas quedan auditadas.
7. El Flow Builder requiere permisos especiales.
8. WebSocket valida sesión y permisos por canal.
9. Web Push no debe transportar datos sensibles.
```

### 25.1 Componentes referenciados

```text
SecurityModule
IdentityService
PasswordlessAuthService
SessionService
AuthorizationService
CapabilityService
RoleAssignmentService
ScoringAssignmentService
StepUpAuthService
AuditTrailService
SecurityContextProvider
```

### 25.2 Rutas de seguridad

Las rutas de seguridad se documentan en la especificación especializada.  
Este ADR solo reconoce su presencia dentro de `apps/studio/server` y `apps/studio/src/security`.

---

## 26. BASE DE DATOS — SCHEMA

### 26.1 Convenciones MySQL

Se mantienen las convenciones del ADR v2.0:

```text
PKs: CHAR(36) con DEFAULT (UUID())
JSON flexible: columnas JSON
Timestamps: DATETIME(3)
Sin foreign keys enforced para performance de inserción intensiva
Índices explícitos en game_id, player_id, timestamp y sequence
```

### 26.2 Entidades base

Se mantienen las 31 tablas de producción documentadas en ADR v2.0:

```text
playflow_sessions
associations
sports
leagues
tournaments
clubs
teams
players
venues
categories
team_categories
tournament_teams
tournament_groups
tournament_group_teams
standings
rosters
coaching_staff
games
game_lineups
pitches
at_bats
baserunning_events
game_events
sponsors
campaigns
campaign_sponsors
sponsor_impressions
operator_actions
overlay_configs
layouts
game_layouts
```

### 26.3 Nuevas tablas funcionales recomendadas v3.0

Para soportar v3.0 se agregan:

```sql
flow_definitions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  flow_id VARCHAR(160) NOT NULL,
  version VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  automation_level VARCHAR(64) NOT NULL,
  definition_json JSON NOT NULL,
  created_by CHAR(36),
  created_at DATETIME(3),
  published_by CHAR(36),
  published_at DATETIME(3),
  UNIQUE KEY uq_flow_version (flow_id, version)
);

flow_execution_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id CHAR(36) NOT NULL,
  source_event_id CHAR(36),
  correlation_id VARCHAR(120),
  flow_id VARCHAR(160),
  flow_version VARCHAR(32),
  automation_level VARCHAR(64),
  status VARCHAR(64),
  started_at DATETIME(3),
  completed_at DATETIME(3),
  duration_ms INT,
  steps_json JSON,
  warnings_json JSON,
  errors_json JSON,
  INDEX idx_flow_logs_game (game_id),
  INDEX idx_flow_logs_event (source_event_id)
);

broadcast_timelines (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id CHAR(36) NOT NULL,
  source_event_id CHAR(36),
  correlation_id VARCHAR(120),
  timeline_json JSON NOT NULL,
  status VARCHAR(64),
  created_at DATETIME(3),
  executed_at DATETIME(3),
  INDEX idx_broadcast_timeline_game (game_id)
);

insights (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id CHAR(36) NOT NULL,
  source_event_id CHAR(36),
  insight_type VARCHAR(120),
  level VARCHAR(64),
  confidence VARCHAR(64),
  sample_size INT,
  model_version VARCHAR(80),
  payload JSON NOT NULL,
  created_at DATETIME(3),
  INDEX idx_insights_game (game_id)
);

push_subscriptions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  endpoint_hash VARCHAR(128) NOT NULL,
  subscription_json JSON NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME(3),
  last_used_at DATETIME(3)
);

external_channels (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  provider VARCHAR(64) NOT NULL,
  display_name VARCHAR(255),
  external_channel_id VARCHAR(160),
  status VARCHAR(32) NOT NULL,
  connected_by CHAR(36),
  connected_at DATETIME(3),
  metadata_json JSON
);

media_publications (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id CHAR(36) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  external_broadcast_id VARCHAR(160),
  external_stream_id VARCHAR(160),
  external_video_id VARCHAR(160),
  watch_url TEXT,
  title VARCHAR(255),
  visibility VARCHAR(32),
  status VARCHAR(64),
  scheduled_start_at DATETIME(3),
  started_at DATETIME(3),
  ended_at DATETIME(3),
  metadata_json JSON,
  INDEX idx_media_publications_game (game_id)
);

media_markers (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id CHAR(36) NOT NULL,
  publication_id CHAR(36),
  source_event_id CHAR(36),
  provider VARCHAR(64),
  timecode VARCHAR(32),
  label VARCHAR(255),
  tags_json JSON,
  created_at DATETIME(3),
  INDEX idx_media_markers_game (game_id),
  INDEX idx_media_markers_event (source_event_id)
);
```

Las tablas completas del módulo de seguridad, incluyendo usuarios, roles, sesiones, capacidades y auditoría fuerte, se definen en el documento específico de seguridad.

---

## 27. PLATAFORMA DE DESARROLLO — COSTO CERO

### 27.1 Herramientas requeridas

| Herramienta | Versión | Propósito | Costo |
|------------|---------|-----------|-------|
| Node.js | 20 LTS | Runtime | $0 |
| pnpm | 9.x | Package manager | $0 |
| Docker Desktop | Latest | MySQL local + builds | $0 |
| Git | Any | Control de versiones | $0 |
| VS Code | Latest | IDE recomendado | $0 |
| OBS Studio | 30+ | Testing de Browser Sources | $0 |

### 27.2 Stack local con Docker Compose

```yaml
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
    build: apps/studio
    ports: ["8080:8080"]
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://playflow_app:dev_password@db:3306/playflow_db
    depends_on: [db]

volumes:
  db_dev_data:
```

### 27.3 Puertos fijos

| Servicio | Puerto | Notas |
|---------|--------|-------|
| Express API + WS | `:3001` | Dev local |
| Vite SPA | `:5173` | `strictPort: true` |
| MySQL | `:3306` | Docker Compose y local |
| Docker full | `:8080` | Producción simulada |

---

## 28. VARIABLES DE ENTORNO

### 28.1 Producción

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=mysql://playflow_app:***@playflow-db.mysql.database.azure.com:3306/playflow_db
ALLOWED_ORIGIN=https://playflow-overlays.azurestaticapps.net

# Seguridad — valores detallados en documento de seguridad
AUTH_ENABLED=true
JWT_ISSUER=playflow
JWT_AUDIENCE=playflow-app
OTP_TTL_MINUTES=10

# Web Push
VAPID_PUBLIC_KEY=***
VAPID_PRIVATE_KEY=***
VAPID_SUBJECT=mailto:admin@playflow.local

# Media Publishing / YouTube
YOUTUBE_INTEGRATION_ENABLED=false
YOUTUBE_CLIENT_ID=***
YOUTUBE_CLIENT_SECRET=***
YOUTUBE_REDIRECT_URI=https://playflow-server.azurewebsites.net/api/media/youtube/oauth/callback
```

### 28.2 Desarrollo

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=mysql://playflow_app:dev_password@localhost:3306/playflow_db
AUTH_ENABLED=false
```

### 28.3 Vite build

```bash
VITE_API_URL=https://playflow-server.azurewebsites.net/api
VITE_WS_URL=wss://playflow-server.azurewebsites.net
```

---

## 29. MÓDULO DE SCORING EN VIVO

### 29.1 Vista principal

Ruta:

```text
/live-game-scoring
```

Nombre técnico:

```text
LiveGameScoringView
```

### 29.2 Enfoque

La vista controla la anotación estadística general del partido, pero operativamente se centra en la aparición al plato actual.

```text
Live Game Scoring View
└── Game Context
└── Current Plate Appearance
    └── Pitch Capture
    └── Batted Ball Capture
    └── Runner Advancement
    └── Scoring Decision
└── Game Statistics
└── Event Timeline
└── Broadcast Outputs
```

### 29.3 Flujos actuales de ingesta

Se mantienen los flujos de ADR v2.0:

```text
Flujo A: Pitch por pitch
Flujo B: Registro del at-bat
Flujo C: Corrimiento de bases
Flujo D: Sustitución
Flujo E: Corrección post at-bat
```

### 29.4 Evolución v3.0 del flujo de captura

```text
Pitch confirmado
→ GameEventEnvelope
→ Authorization context
→ Game Event Orchestrator
→ FlowDefinition
→ Stats Engine
→ Game State Engine
→ Broadcast Automation
→ Execution Log
```

### 29.5 Eventos seguros (AUTO_SAFE)

En béisbol, ciertos resultados son determinísticos: el scorer los registra y el sistema los procesa sin necesidad de decisión adicional. El reglamento MLBAM/WBSC los define de forma no ambigua.

```text
ball
called_strike
swinging_strike
foul
strikeout (watching o swinging)
home run claro (sin necesidad de revisión de árbitro)
```

### 29.6 Eventos con revisión manual (MANUAL_REQUIRED)

Otros resultados requieren decisión del scorer oficial antes de confirmar. Son situaciones que el reglamento deja al juicio del oficial de anotación:

```text
hit vs error          ← ¿fue jugada ordinaria del defensa o mala actuación?
fielder's choice      ← el bateador llega por elección defensiva, no por hit
wild pitch vs passed ball ← responsabilidad del pitcher vs el catcher
sacrifice bunt        ← scorer decide si fue intentional y ejecutada
sacrifice fly         ← scorer decide si fue el intento y resultado
interferencia / obstrucción ← decisión de árbitro que afecta al registro
balk                  ← acción ilegal del pitcher, registro especial
apelación             ← puede invalidar avances ya registrados
carreras limpias vs sucias ← scored si el inning hubiera continuado normalmente
```

La distinción entre ambas categorías es la base del diseño del `automationLevel` en las FlowDefinitions (ver Sección 11.3).

---

## 30. API ENDPOINTS ACTUALIZADOS

### 30.1 Scoring

```text
POST   /api/scorer/pitches/:gameId           ✅ implementado
GET    /api/scorer/pitches/:gameId           ✅ implementado
POST   /api/scorer/at-bats/:gameId           ✅ implementado
PATCH  /api/scorer/at-bats/:id              ⏳ pendiente (tarea #24)
DELETE /api/scorer/at-bats/:id              ✅ implementado (último at-bat)
POST   /api/scorer/substitutions/:gameId    ✅ implementado (5 tipos MLBAM)
GET    /api/scorer/context/:gameId          ✅ implementado
GET    /api/games/:gameId/baserunning       ✅ implementado
POST   /api/games/:gameId/baserunning       ✅ implementado
GET    /api/games/:gameId/game-events       ✅ implementado
POST   /api/games/:gameId/game-events       ✅ implementado
POST   /api/games/:gameId/game-events/:eventId/corrections  ⏳ pendiente (tarea #25)
```

### 30.2 Orchestrator

```text
POST /api/games/:gameId/events
POST /api/games/:gameId/events/:eventId/reprocess
GET  /api/games/:gameId/events/:eventId/execution-log
GET  /api/games/:gameId/flow-runs
GET  /api/games/:gameId/flow-runs/:flowRunId
```

### 30.3 Flow Builder

```text
GET    /api/flows
POST   /api/flows
GET    /api/flows/:flowId
PATCH  /api/flows/:flowId/versions/:version
POST   /api/flows/:flowId/versions/:version/publish
POST   /api/flows/:flowId/versions/:version/simulate
POST   /api/flows/:flowId/versions/:version/rollback
```

### 30.4 Broadcast

```text
POST /api/broadcast/:gameId/start
POST /api/broadcast/:gameId/stop
POST /api/broadcast/:gameId/timelines
GET  /api/broadcast/:gameId/timelines
POST /api/broadcast/:gameId/overlays/show
POST /api/broadcast/:gameId/overlays/hide
POST /api/broadcast/:gameId/notifications
```

### 30.5 Media Publishing

```text
GET  /api/media/games/:gameId/publications
POST /api/media/games/:gameId/publications/link
POST /api/media/games/:gameId/publications/create
POST /api/media/games/:gameId/publications/:publicationId/start
POST /api/media/games/:gameId/publications/:publicationId/end
POST /api/media/games/:gameId/markers
GET  /api/media/games/:gameId/markers
POST /api/media/games/:gameId/highlights/suggest
POST /api/media/games/:gameId/highlights/:highlightId/publish
GET  /api/media/channels
POST /api/media/channels/connect
DELETE /api/media/channels/:channelId
```

### 30.6 Intelligence

```text
GET  /api/games/:gameId/insights
POST /api/games/:gameId/insights/recalculate
GET  /api/games/:gameId/win-probability
GET  /api/games/:gameId/players/:playerId/batter-probability
GET  /api/games/:gameId/pitcher-fatigue
GET  /api/games/:gameId/plate-appearances/:paId/replay
```

### 30.7 Seguridad

Los endpoints de seguridad están documentados en la especificación de seguridad.  
Este ADR solo reconoce su integración con la aplicación.

---

## 31. WEBSOCKET Y MENSAJERÍA REALTIME

### 31.1 Uso

WebSocket se usa para:

```text
scorebug updates
overlay commands
broadcast timeline actions
game state updates
control panel sync
live scoring sync
operator actions
```

### 31.2 Canales sugeridos

```text
game:{gameId}:scorebug
game:{gameId}:broadcast
game:{gameId}:scoring
game:{gameId}:insights
user:{userId}:notifications
```

### 31.3 Regla de reconexión

Los clientes deben enviar el último `sequence` recibido.

```json
{
  "clientId": "overlay_program_01",
  "gameId": "game_2026_001",
  "lastSequenceNumber": 184
}
```

El servidor responde con eventos pendientes o snapshot actual.

### 31.4 Regla de seguridad

La seguridad de WebSocket se define en el documento de seguridad.  
Arquitectónicamente, todo canal debe validar sesión y permiso sobre `gameId`.

---

## 32. PWA Y WEB PUSH

### 32.1 Propósito

La PWA permite a usuarios suscritos recibir notificaciones importantes aunque la app no esté abierta.

### 32.2 Casos permitidos

```text
inicio de transmisión
fin de transmisión
partido suspendido
partido reprogramado
resultado v3.0
highlight importante
```

### 32.3 Casos no permitidos

```text
cada pitch
cada strike
cada cambio menor de scorebug
cada overlay
```

### 32.4 Flujo

```text
usuario acepta notificaciones
PWA registra PushSubscription
servidor guarda suscripción
broadcast.started dispara notificación
se registra Execution Log
si el usuario abre la PWA, consulta estado actual
```

---

## 33. FLUJO DE DESARROLLO

Se mantiene el flujo de ADR v2.0.

### 33.1 Branching strategy

```text
main         → Código estable aprobado (merges desde dev únicamente)
dev          → Integración continua — toda feature land aquí
insiders     → Early access, sincronizado desde dev
squad/*      → Ramas feature/fix (naming: squad/{issue}-{slug})
```

> El deploy a producción se ejecuta manualmente hasta que el pipeline CI/CD esté implementado (ver tarea #27/#28 en sección 36.2).

### 33.2 Reglas

```text
Nunca push directo a main ni dev
Todo trabajo parte de dev
PR siempre targeta dev
main solo recibe merges de dev
```

---

## 34. PIPELINE CI/CD

### 34.1 CI

```text
pnpm install
pnpm turbo typecheck
pnpm turbo lint
pnpm turbo test
```

### 34.2 Deploy

```text
docker build -t playflowacr.azurecr.io/playflow-server:{sha}
docker push playflowacr.azurecr.io/playflow-server:{sha}
deploy App Service playflow-server
pnpm turbo build --filter studio
deploy dist/ → playflow-overlays
```

### 34.3 Nuevas validaciones recomendadas

Agregar a CI:

```text
validar JSON schema de FlowDefinition
validar contratos IC-003
validar migrations MySQL
validar tests de autorización mínima
validar lint de packages/*
validar build de overlays nuevos
```

---

## 35. COSTOS

### 35.1 Producción base

| Recurso | Nombre Azure | SKU | Costo/mes |
|---------|-------------|-----|----------|
| Resource Group | `rg-playflow-prod-eastus` | — | $0.00 |
| App Service Plan | `playflow-server` | B1 Linux | ~$12.41 |
| MySQL Flexible | `playflow-db` | B1ms | ~$12.41 |
| MySQL Storage | — | 32 GB | ~$3.20 |
| Static Web App | `playflow-overlays` | Free | $0.00 |
| Container Registry | `playflowacr` | Basic | ~$5.00 |
| **Total base** | | | **~$33/mes** |

### 35.2 Componentes adicionales opcionales

| Componente | Costo esperado inicial |
|---|---:|
| Web Push propio | $0 |
| PWA Service Worker | $0 |
| OTP por email propio | Bajo, depende proveedor de email |
| Push vía proveedor administrado | Depende proveedor |
| Seguridad administrada externa | Depende proveedor |
| Motor de inteligencia avanzado | Puede aumentar costo si usa modelos externos |
| YouTube Data API / YouTube Live API | Normalmente sin costo directo, sujeto a cuotas del proveedor |
| Almacenamiento de thumbnails/highlights | Depende del volumen y proveedor |

La arquitectura v3.0 mantiene la estrategia de bajo costo: implementar primero con componentes propios y añadir servicios externos solo si el volumen o el riesgo lo exige.

---

## 36. ESTADO DE IMPLEMENTACIÓN

### 36.1 Completado según ADR v2.0

```text
Schema MySQL base
mysql2 integration
write-through game state
restore-on-startup desde playflow_sessions
Docker Compose
.env.example
Scorer en vivo
Sustituciones backend
MLBAM compliance parcial
context_before/after
RunnerOnBaseWithPitcher
Overlays base
Panel operador
```

### 36.2 Nuevas tareas v3.0

| # | Tarea | Prioridad |
|---|-------|----------|
| 1 | Implementar `packages/game-event-orchestrator` | Alta |
| 2 | Crear tablas `flow_definitions` y `flow_execution_logs` | Alta |
| 3 | Implementar `packages/broadcast-automation-engine` | Alta |
| 4 | Implementar `BroadcastTimeline` y ejecución por WS | Alta |
| 5 | Crear Flow Builder UI | Media |
| 6 | Implementar endpoint `/api/games/:gameId/events` | Alta |
| 7 | Integrar Authorization Context en `GameEventEnvelope` | Alta |
| 8 | Implementar Execution Log viewer | Media |
| 9 | Implementar evento `broadcast.started` | Alta |
| 10 | Implementar Web Push subscription básica | Media |
| 11 | Implementar Plate Appearance Replay Overlay | Media |
| 12 | Implementar Game Intelligence Engine v1 descriptivo | Media |
| 13 | Implementar Win Probability v1 heurístico | Baja/Media |
| 14 | Implementar Pitcher Fatigue Insight v1 | Media |
| 15 | Conectar SecurityContextProvider a UI | Alta |
| 16 | Integrar User & Access Management según documento de seguridad | Alta |
| 17 | Implementar `packages/media-publishing-hub` | Media |
| 18 | Implementar `packages/youtube-publishing-adapter` | Media |
| 19 | Crear tablas `external_channels`, `media_publications`, `media_markers` | Media |
| 20 | Implementar link gameId ↔ YouTube broadcast/video | Media |
| 21 | Implementar marcadores de video por evento | Media |
| 22 | Implementar metadata automática para transmisión | Media |
| 23 | UI de sustituciones en LiveGameScoringPage | Alta |
| 24 | PATCH /api/scorer/at-bats/:id | Alta |
| 25 | Modo edición del último at-bat | Alta |
| 26 | Agregaciones de stats en tiempo real | Media |
| 27 | GitHub Actions CI workflow | Media |
| 28 | GitHub Actions deploy workflow | Media |
| 29 | Aprovisionamiento Azure con az CLI scripts | Media |

---

## 37. PRINCIPIOS DE ARQUITECTURA INMUTABLES

1. **Fuente única de verdad deportiva:** Game Engine / Game State Engine.
2. **Fuente única de verdad visual:** Asset Manager.
3. **Contratos explícitos:** Todo mensaje entre componentes usa envelope versionado.
4. **Flujo visual:** `hidden → preview → take → live`.
5. **Canvas:** 1920×1080, Grid 24×12, Safe Area 60px.
6. **Overlays independientes:** consumen datos, no calculan ni almacenan estado oficial.
7. **Correcciones auditadas:** toda corrección manual genera evento y log.
8. **Credenciales desacopladas del cliente:** nombres funcionales, no del club.
9. **Evento antes que mutación:** toda acción crítica nace como evento.
10. **Seguridad antes de ejecución:** evento crítico sin autorización no se procesa.
11. **Inteligencia separada del estado oficial:** las inferencias no modifican el partido.
12. **Broadcast por timeline:** no se disparan overlays sueltos desde reglas deportivas.
13. **Idempotencia obligatoria:** no se duplican efectos por reintentos.
14. **Replay posible:** el estado debe poder reconstruirse desde eventos y snapshots.
15. **PlayFlow no se define por sus salidas visuales:** overlays, scorebug y pizarra son outputs; el núcleo del producto es el procesamiento de eventos del juego.
16. **Plataformas externas no son fuente de verdad:** YouTube u otros canales publican la señal o contenidos derivados, pero no definen el estado oficial del partido.
17. **Cumplimiento de estándares de registro:** el vocabulario de eventos sigue el estándar MLBAM; las reglas del juego y condiciones de sustitución siguen el reglamento WBSC; las coordenadas de pitch y velocidades usan el sistema métrico (metros, km/h). Esta combinación garantiza interoperabilidad con sistemas estadísticos internacionales y es una condición irrenunciable del sistema.

---

## 38. DECISIONES ABIERTAS

| Decisión | Estado |
|---|---|
| Proveedor email para OTP | Pendiente |
| Uso de Azure Notification Hubs vs Web Push propio | Pendiente |
| Auth externa vs auth propia | Definido en documento de seguridad |
| Nivel inicial del Game Intelligence Engine | Pendiente |
| Política de publicación de FlowDefinitions por torneo | Pendiente |
| Retención de Execution Logs | Pendiente |
| Retención de Audit Logs de seguridad | Documento de seguridad |
| Alcance inicial de YouTube Publishing Adapter | Pendiente |
| Manejo de cuotas y permisos OAuth de YouTube | Pendiente |
| Política de creación de clips/highlights | Pendiente |

---

## 39. CONCLUSIÓN

PlayFlow v3.0 se define como una plataforma de producción deportiva en vivo, automatización broadcast y publicación multicanal basada en eventos. Overlays, scorebug, pizarra, notificaciones y YouTube son salidas o canales de un sistema mayor de captura, estado, estadística, automatización, auditoría, inteligencia y distribución.

La arquitectura queda organizada así:

```text
Live Game Scoring captura.
Game Event Orchestrator decide.
Game Engine mantiene estado oficial.
Stats Engine calcula estadísticas.
Broadcast Automation Engine genera timeline.
Overlay Manager renderiza.
Layout Manager protege composición visual.
Asset Manager entrega recursos.
Sponsor Engine monetiza espacios.
Notification Adapter comunica eventos importantes.
Media Publishing Hub conecta la producción con YouTube y otros canales.
Execution Log traza ejecución.
Game Intelligence Engine estima y sugiere.
Security Module autoriza y audita.
```

La seguridad se separa en su propio documento para evitar mezclar decisiones de arquitectura productiva con políticas detalladas de acceso, roles, OTP, auditoría y no repudio.

---

*Documento actualizado como ADR-001 v3.0. Para modificaciones abrir PR con base en `dev`.*
