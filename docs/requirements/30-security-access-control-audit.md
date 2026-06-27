# Especificación del Módulo de Seguridad
## PlayFlow — Security, Access Control & Audit

**Versión:** 2.0  
**Fecha:** 2026-06-27  
**Estado:** APROBADO PARA IMPLEMENTACIÓN  
**Documento relacionado:** ADR-001 v3.0 — Arquitectura de Producción  
**Producto:** PlayFlow  
**Servidor:** `playflow-server`  
**Base de datos:** `playflow_db`  
**Usuario de base de datos:** `playflow_app`  
**Aplicación:** `apps/studio`  
**Paquete recomendado:** `packages/security`

### Historial de versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-06-27 | Versión inicial — PROPUESTA |
| 2.0 | 2026-06-27 | Decisiones bloqueantes resueltas: formato de tokens, proveedor de email, contratos HTTP, bootstrap SysAdmin, contratos TypeScript |

---

## 1. Propósito

El módulo de seguridad de PlayFlow debe permitir operar una plataforma deportiva en vivo con baja fricción para usuarios reales, pero con control estricto sobre acciones críticas.

PlayFlow ya no debe ser tratado solo como un sistema de overlays. Según ADR-001 v3.0, PlayFlow es una plataforma de:

```text
producción deportiva en vivo
automatización broadcast
publicación multicanal
scoring en vivo
inteligencia deportiva
auditoría operacional
```

Por lo tanto, seguridad debe proteger:

```text
login
sesiones
roles
permisos
scopes
usuarios
anotadores
scoring
game events
scorebug
broadcast automation
flow definitions
flow publishing
execution logs
media publishing
YouTube integration
push notifications
WebSocket channels
```

Regla central:

```text
Autenticación simple.
Autorización fuerte.
Auditoría obligatoria.
Backend como autoridad de seguridad.
```

---

## 2. Alcance de la especificación

Esta especificación cubre:

```text
interfaz de login
OTP / magic link
sesiones
refresh tokens
step-up authentication
gestión de usuarios
roles por objeto
capabilities para la UI
administración delegada
protección especial de estadísticas
protección de Flow Builder
protección de Broadcast Automation
protección de Media Publishing / YouTube
WebSocket autorizado
Web Push seguro
auditoría
no repudio práctico
migración SQL base
contratos TypeScript
checklist de implementación
```

---

## 3. Principios de seguridad

| Principio | Definición |
|---|---|
| `deny_by_default` | Toda acción se deniega si no existe una política que la permita. |
| `least_privilege` | Cada usuario recibe solo los permisos mínimos necesarios. |
| `backend_authoritative` | La API decide permisos; la UI solo representa capacidades. |
| `capability_based_ui` | La UI trabaja con `can(action)`, no con roles hardcodeados. |
| `object_scoped_roles` | Los roles se asignan sobre objetos concretos: liga, torneo, equipo, partido, canal, etc. |
| `security_before_orchestration` | El Game Event Orchestrator no procesa eventos críticos sin autorización resuelta. |
| `event_before_mutation` | Toda acción crítica debe quedar representada como evento o comando auditable. |
| `stats_protection` | Las estadísticas solo pueden ser administradas por el anotador asignado o SysAdmin. |
| `media_protection` | Publicación externa, YouTube, stream keys y metadata requieren permisos específicos. |
| `no_secrets_in_logs` | Nunca registrar OTP, tokens, refresh tokens, stream keys, OAuth tokens ni cookies. |
| `audit_critical_actions` | Toda acción sensible genera auditoría. |

---

## 4. Arquitectura de seguridad en el monorepo

### 4.1 Backend

Ubicación recomendada:

```text
apps/studio/server/
├── authRouter.ts
├── securityRouter.ts
├── usersRouter.ts
├── rolesRouter.ts
├── sessionsRouter.ts
├── auditRouter.ts
└── middleware/
    ├── authenticate.ts
    ├── authorize.ts
    ├── requireCapability.ts
    └── auditAction.ts
```

### 4.2 Frontend

Ubicación recomendada:

```text
apps/studio/src/security/
├── SecurityContextProvider.tsx
├── useSecurityContext.ts
├── useCapabilities.ts
├── ProtectedRoute.tsx
├── ProtectedAction.tsx
├── StepUpDialog.tsx
└── PermissionBadge.tsx
```

### 4.3 Paquete compartido

```text
packages/security/
├── src/
│   ├── identity/
│   ├── authentication/
│   ├── authorization/
│   ├── capabilities/
│   ├── sessions/
│   ├── step-up/
│   ├── audit/
│   ├── policies/
│   └── index.ts
```

---

## 5. Componentes lógicos

```text
SecurityModule
├── IdentityService
├── PasswordlessAuthService
├── SessionService
├── AuthorizationService
├── CapabilityService
├── RoleAssignmentService
├── DelegationService
├── ScoringAssignmentService
├── StepUpAuthService
├── UserManagementService
├── AuditTrailService
└── SecurityEventMonitor
```

---

## 6. Autenticación

### 6.1 Modelo de autenticación

PlayFlow usa autenticación passwordless para reducir fricción operativa.

```text
email OTP (todos los usuarios)
magic link opcional (alternativa al OTP)
TOTP (RFC 6238) para SysAdmin. Passkey (WebAuthn) como opción adicional en v3.0.
step-up OTP para acciones críticas
```

### 6.2 Arquitectura de tokens — DECISIÓN APROBADA

```
┌─────────────────────────────────────────────────────────────┐
│  Access token:  JWT HS256  · 15 min · en memoria React      │
│  Refresh token: Opaco SHA-256 · 30 días · httpOnly cookie   │
│  Step-up token: Opaco · 5 min · en memoria React            │
└─────────────────────────────────────────────────────────────┘
```

**Rationale:**

- JWT para el access token: sin DB lookup por request. Las condiciones de la política (`hasRole`, `isAssignedScorer`, `inheritsRole`) siempre requieren DB — agregar un lookup adicional para un token opaco no aporta valor.
- Refresh token opaco en cookie httpOnly: revocación inmediata. XSS no puede robarlo. Rotation reuse detection activa.
- Step-up token opaco: un solo uso, acción-específico, almacenado en `step_up_challenges`.

**Payload JWT (access token):**

```json
{
  "sub": "usr_abc123",
  "sid": "sess_xyz456",
  "email": "operador@club.cl",
  "authLevel": "otp",
  "iat": 1751000000,
  "exp": 1751000900
}
```

Reglas del payload:
- Sin roles ni permisos — esos los decide `AuthorizationService` consultando la DB
- `authLevel` disponible localmente para que el middleware sepa si pedir step-up
- `sid` permite correlacionar con la sesión para revocación eventual

**Almacenamiento en el browser:**

```text
Access token (JWT):     Memoria React (Context) — invisible para XSS
Refresh token (opaco):  httpOnly cookie, SameSite=Strict, Secure, Path=/api/auth/token/refresh
Step-up token (opaco):  Memoria React (Context) — se descarta tras usar
```

**Flujo de carga de página (page refresh):**

```text
1. Browser carga PlayFlow
2. Cookie pf_refresh se envía automáticamente a POST /api/auth/token/refresh
3. Servidor valida refresh token en DB, emite nuevo JWT en el body
4. React guarda el JWT en Context
5. Todas las requests API usan Authorization: Bearer {jwt}
```

### 6.3 Proveedor de email para OTP — DECISIÓN APROBADA

| Entorno | Proveedor | Configuración |
|---------|-----------|---------------|
| Desarrollo local | Ethereal Email | Automático (nodemailer genera cuenta temporal — sin variables de entorno) |
| Staging / Producción | Resend (SMTP relay) | Variables de entorno SMTP_* |

**Librería:** `nodemailer` en ambos entornos. El cambio de entorno es solo de variables de entorno, sin cambio de código.

**Template del email OTP:**
- Asunto: `Tu código de acceso PlayFlow` (sin el código en el asunto)
- Cuerpo: código de 6 dígitos grande y legible, tiempo de expiración, instrucción de no compartir
- Sin imágenes externas. Sin links clickeables.
- Texto plano como fallback del HTML.

### 6.4 Flujo de login

```text
1. Usuario ingresa email.
2. API crea desafío OTP en otp_challenges.
3. EmailService envía código temporal (Ethereal en dev, Resend en prod).
4. Usuario ingresa código de 6 dígitos.
5. API valida OTP, expiración y rate limit.
6. API crea sesión en sessions.
7. API emite JWT (body) + refresh token (Set-Cookie httpOnly).
8. UI solicita /api/security/context.
9. UI muestra scopes disponibles para selección de contexto.
```

### 6.5 Pantallas

```text
/login
/auth/verify
/auth/select-scope
```

### 6.6 Reglas OTP

| Regla | Valor |
|---|---|
| Largo OTP | 6 dígitos |
| Expiración | 10 minutos (configurable, mínimo 5) |
| Intentos por OTP | máximo 5 |
| Reenvío | mínimo cada 60 segundos |
| Solicitudes por email | máximo 5 cada 15 minutos |
| Solicitudes por IP | configurable (`OTP_RATE_LIMIT_PER_IP`) |
| Almacenamiento | hash SHA-256, nunca texto plano |
| Reuso | prohibido — se marca `consumed` al usarse |

### 6.7 SysAdmin

SysAdmin no puede operar solo con email OTP.

Requisito (ver §33):

```text
OTP + TOTP (RFC 6238) — librería otpauth
QR code en el primer setup desde la UI admin
Passkey (WebAuthn) disponible en v3.0 como opción adicional
```

---

## 7. Sesiones y tokens

### 7.1 Access token — JWT HS256

```text
algoritmo:  HS256
duración:   15 minutos
formato:    JWT
secreto:    JWT_SECRET (64 bytes aleatorios en hex)
issuer:     playflow (JWT_ISSUER)
audience:   playflow-app (JWT_AUDIENCE)
almacenamiento: memoria React (nunca localStorage, nunca cookie)
```

Payload mínimo (sin roles ni permisos):

```json
{
  "sub": "usr_abc123",
  "sid": "sess_xyz456",
  "email": "operador@club.cl",
  "authLevel": "otp",
  "iat": 1751000000,
  "exp": 1751000900
}
```

Regla: si el `JWT_SECRET` se compromete, rotarlo invalida todos los tokens activos de todos los usuarios simultáneamente (opción nuclear documentada).

### 7.2 Refresh token — opaco

```text
formato:    32 bytes aleatorios (crypto.randomBytes(32))
almacenado: SHA-256 del token en refresh_tokens.token_hash
duración:   30 días (JWT_REFRESH_TOKEN_DAYS)
rotación:   obligatoria en cada uso
reuse:      si se detecta reuso → revocar TODAS las sesiones del usuario + security_event crítico
transporte: httpOnly cookie
```

Cookie del refresh token:

```
Set-Cookie: pf_refresh=<token_opaco>; HttpOnly; Secure; SameSite=Strict;
            Path=/api/auth/token/refresh; Max-Age=2592000
```

`Path=/api/auth/token/refresh` restringe el envío automático de la cookie a ese único endpoint.

### 7.3 Step-up token — opaco

```text
formato:    32 bytes aleatorios
almacenado: en step_up_challenges (con action, resourceType, resourceId, expiresAt)
duración:   5 minutos
uso:        un solo uso — se marca consumed al verificar
transporte: body de /api/auth/step-up/verify (respuesta) →
            header X-Step-Up-Token en la acción crítica
```

Ejemplo de uso en la acción crítica:

```http
POST /api/scorer/games/game_789/finalize
Authorization: Bearer <access_token>
X-Step-Up-Token: su_xyz789

{ "reason": "Cierre oficial del partido validado por el anotador." }
```

---

## 8. Modelo de identidad

### 8.1 User

```json
{
  "userId": "usr_123",
  "email": "usuario@dominio.cl",
  "displayName": "Luis Herrera",
  "status": "active",
  "createdAt": "2026-06-27T12:00:00Z",
  "lastLoginAt": "2026-06-27T12:30:00Z",
  "authMethods": ["email_otp"],
  "mfaEnabled": false
}
```

### 8.2 Estados

```text
invited
active
suspended
disabled
deleted
```

### 8.3 Datos mínimos

El registro inicial debe pedir solo:

```text
email
displayName
```

No se debe solicitar RUT, teléfono, dirección u otros datos personales si no son necesarios para operar el sistema.

---

## 9. Recursos protegidos

El sistema debe proteger estos recursos:

```text
Platform
League
Tournament
Team
Stadium
Game
Broadcast
Scorebug
Overlay
FlowDefinition
Sponsor
Asset
Player
Roster
Stats
AuditLog
User
RoleAssignment
ScoringAssignment
ExecutionLog
Insight
PushSubscription
ExternalChannel
MediaPublication
MediaMarker
YouTubeChannel
YouTubeBroadcast
YouTubeVideo
```

---

## 10. Roles

### 10.1 Rol global

```text
SysAdmin
```

SysAdmin puede administrar toda la plataforma, pero acciones críticas requieren step-up.

### 10.2 Roles por objeto

Roles base:

```text
Owner
Admin
Operator
User
Viewer
```

Roles especializados:

```text
AssignedScorer
Reviewer
FlowAdmin
FlowViewer
MediaAdmin
MediaOperator
SecurityAuditor
```

### 10.3 Roles recomendados por objeto

| Objeto | Roles |
|---|---|
| Liga | Owner, Admin, User |
| Torneo | Owner, Admin, Operator, User |
| Equipo | Owner, Admin, Operator, User |
| Estadio | Owner, Admin, Operator, User |
| Partido | Admin, Operator, AssignedScorer, User |
| Broadcast | Admin, Operator, User |
| Estadística | AssignedScorer, Reviewer, SysAdmin |
| Flow Builder | SysAdmin, FlowAdmin, FlowViewer |
| Media Publishing | SysAdmin, MediaAdmin, MediaOperator, Viewer |
| YouTube Channel | SysAdmin, MediaAdmin, MediaOperator |
| Auditoría | SysAdmin, SecurityAuditor |

Regla:

```text
Operator solo existe donde hay operación real.
Si Operator no tiene permisos distintos a User, el rol no se crea para ese objeto.
```

---

## 11. Administración delegada

La administración delegada se implementa mediante `role_assignments`.

Ejemplo:

```json
{
  "assignmentId": "ra_001",
  "subjectId": "usr_123",
  "role": "admin",
  "resourceType": "tournament",
  "resourceId": "tor_456",
  "grantedBy": "usr_999",
  "grantedAt": "2026-06-27T12:00:00Z",
  "expiresAt": null,
  "status": "active"
}
```

Reglas:

```text
SysAdmin puede asignar cualquier rol.
Owner puede asignar Admin, Operator y User dentro de su recurso.
Admin puede asignar Operator y User si la política lo permite.
Operator no puede asignar roles.
User no puede asignar roles.
Nadie puede asignar un rol superior al suyo.
Nadie puede asignar SysAdmin salvo SysAdmin.
Toda asignación de rol queda auditada.
```

---

## 12. Matriz de permisos

### 12.1 Liga

| Acción | SysAdmin | Owner Liga | Admin Liga | User Liga |
|---|---:|---:|---:|---:|
| Ver liga | Sí | Sí | Sí | Sí |
| Ver torneos | Sí | Sí | Sí | Sí |
| Editar liga | Sí | Sí | Sí | No |
| Crear torneo | Sí | Sí | Sí | No |
| Configurar liga | Sí | Sí | Sí | No |
| Asignar Admin Liga | Sí | Sí | No | No |
| Suspender liga | Sí | Sí | No | No |
| Eliminar liga | Sí | Sí | No | No |
| Ver auditoría liga | Sí | Sí | Sí | No |

### 12.2 Torneo

| Acción | SysAdmin | Owner Torneo | Admin Torneo | Operator Torneo | User Torneo |
|---|---:|---:|---:|---:|---:|
| Ver torneo | Sí | Sí | Sí | Sí | Sí |
| Editar torneo | Sí | Sí | Sí | No | No |
| Crear juegos | Sí | Sí | Sí | Sí | No |
| Editar calendario | Sí | Sí | Sí | Sí | No |
| Asignar equipos | Sí | Sí | Sí | No | No |
| Publicar fixture | Sí | Sí | Sí | No | No |
| Asignar Admin Torneo | Sí | Sí | No | No | No |
| Asignar anotador | Sí | Sí | Sí | No | No |

### 12.3 Partido

| Acción | SysAdmin | Admin Torneo | Operator Juego | Anotador Asignado | User |
|---|---:|---:|---:|---:|---:|
| Ver partido | Sí | Sí | Sí | Sí | Sí |
| Editar datos generales | Sí | Sí | Sí | No | No |
| Iniciar transmisión | Sí | Sí | Sí | No | No |
| Detener transmisión | Sí | Sí | Sí | No | No |
| Operar scorebug | Sí | Sí | Sí | Sí, si asignado | No |
| Anotar estadísticas | Sí | No | No | Sí | No |
| Corregir estadísticas abiertas | Sí | No | No | Sí | No |
| Cerrar estadísticas | Sí | No | No | Sí | No |
| Reabrir partido cerrado | Sí | No | No | No | No |
| Asignar anotador | Sí | Sí | No | No | No |

### 12.4 Flow Builder

| Acción | SysAdmin | FlowAdmin | FlowViewer |
|---|---:|---:|---:|
| Ver flujos | Sí | Sí | Sí |
| Crear draft | Sí | Sí | No |
| Editar draft | Sí | Sí | No |
| Simular flujo | Sí | Sí | Sí |
| Publicar flujo | Sí | Sí con step-up | No |
| Rollback | Sí | Sí con step-up | No |
| Eliminar flujo | Sí | No | No |

### 12.5 Media Publishing / YouTube

| Acción | SysAdmin | MediaAdmin | MediaOperator | Viewer |
|---|---:|---:|---:|---:|
| Ver publicaciones | Sí | Sí | Sí | Sí |
| Conectar canal YouTube | Sí | Sí con step-up | No | No |
| Desconectar canal | Sí | Sí con step-up | No | No |
| Crear transmisión externa | Sí | Sí | Sí | No |
| Asociar gameId a YouTube broadcast | Sí | Sí | Sí | No |
| Editar metadata | Sí | Sí | Sí | No |
| Cambiar visibilidad | Sí | Sí con step-up | No | No |
| Registrar watchUrl | Sí | Sí | Sí | No |
| Leer stream key | Sí con step-up | Sí con step-up | No | No |
| Publicar inicio de transmisión | Sí | Sí | Sí | No |
| Publicar fin de transmisión | Sí | Sí | Sí | No |
| Crear marcador de video | Sí | Sí | Sí | No |
| Publicar highlight | Sí | Sí | Sí | No |
| Leer analytics básicos | Sí | Sí | Sí | Sí |
| Revocar tokens OAuth | Sí | Sí con step-up | No | No |

---

## 13. Protección especial de estadísticas

Regla obligatoria:

```text
La estadística del partido solo puede ser administrada por el anotador asignado al partido o por SysAdmin.
```

Admin de Torneo puede asignar anotador, pero no puede modificar estadísticas si no fue asignado.

### 13.1 ScoringAssignment

```json
{
  "assignmentId": "sa_001",
  "gameId": "game_789",
  "userId": "usr_123",
  "role": "official_scorer",
  "assignedBy": "usr_999",
  "assignedAt": "2026-06-27T12:00:00Z",
  "status": "active"
}
```

### 13.2 Política

```text
canManageGameStats(user, game):
  allow si user es SysAdmin
  allow si user es official_scorer activo del game
  deny en todo otro caso
```

---

## 14. Protección de Media Publishing / YouTube

### 14.1 Principio

```text
PlayFlow mantiene la fuente de verdad del partido.
YouTube publica y distribuye la transmisión o contenido derivado.
```

### 14.2 Reglas

```text
YouTube no calcula marcador.
YouTube no almacena estado oficial.
YouTube no decide estadísticas.
YouTube no reemplaza al Game Event Orchestrator.
YouTube no contiene permisos internos de PlayFlow.
```

### 14.3 Acciones sensibles

Requieren step-up:

```text
media.channel.connect
media.channel.disconnect
media.oauth.revoke
media.streamKey.read
media.broadcast.visibilityChange
media.broadcast.delete
media.highlight.publish
```

### 14.4 Secretos

Nunca registrar:

```text
YouTube OAuth access token
YouTube OAuth refresh token
stream key
RTMP ingest secret
cookies
Authorization header
```

### 14.5 Auditoría

Acciones auditables:

```text
media.channel.connected
media.channel.disconnected
media.broadcast.created
media.broadcast.linked
media.broadcast.started
media.broadcast.ended
media.metadata.updated
media.marker.created
media.highlight.published
media.analytics.synced
media.oauth.revoked
```

---

## 15. AuthorizationService

### 15.1 Contrato

```typescript
export interface AuthorizationService {
  authorize(request: AuthorizationRequest): Promise<AuthorizationDecision>;
}
```

### 15.2 Request

```json
{
  "subject": {
    "userId": "usr_123",
    "sessionId": "sess_456",
    "authLevel": "otp"
  },
  "action": "game.scoreEventCreate",
  "resource": {
    "type": "game",
    "id": "game_789"
  },
  "context": {
    "gameStatus": "live",
    "assignedScorerId": "usr_123",
    "tournamentId": "tor_999"
  }
}
```

### 15.3 Response

```json
{
  "allowed": true,
  "decision": "allow",
  "reason": "user_is_assigned_scorer",
  "policyVersion": "security-policy-v1.0.0",
  "requiresStepUp": false,
  "requiresReason": false
}
```

---

## 16. CapabilityService

La UI no debe trabajar con roles directamente.

La UI debe preguntar:

```text
¿Puede este usuario ejecutar esta acción sobre este recurso?
```

Endpoint:

```http
GET /api/security/resources/{resourceType}/{resourceId}/capabilities
```

Ejemplo:

```json
{
  "resource": {
    "type": "game",
    "id": "game_789"
  },
  "user": {
    "userId": "usr_123",
    "authLevel": "otp"
  },
  "effectiveRoles": [
    "official_scorer"
  ],
  "capabilities": {
    "game.view": true,
    "game.scoreEventCreate": true,
    "game.scoreEventCorrect": true,
    "game.finalizeStats": true,
    "game.reopen": false,
    "broadcast.start": false,
    "scorebug.operate": true
  },
  "requirements": {
    "game.finalizeStats": {
      "requiresStepUp": true,
      "requiresReason": true
    }
  },
  "explanations": {
    "game.reopen": "Solo SysAdmin puede reabrir un partido cerrado."
  }
}
```

---

## 17. Security Context

Endpoint:

```http
GET /api/security/context
```

Respuesta:

```json
{
  "user": {
    "userId": "usr_123",
    "displayName": "Luis Herrera",
    "email": "luis@club.cl",
    "globalRoles": [],
    "authLevel": "otp",
    "sessionId": "sess_456"
  },
  "availableScopes": [
    {
      "resourceType": "league",
      "resourceId": "league_001",
      "name": "Liga Oriente",
      "role": "admin"
    }
  ],
  "securityFlags": {
    "requiresStepUpForSensitiveActions": true,
    "canViewAudit": false,
    "isSysAdmin": false
  }
}
```

---

## 18. Integración con la aplicación

### 18.1 SecurityContextProvider

```typescript
export interface SecurityContextProvider {
  currentUser: UserSecurityProfile;
  currentScope: ResourceScope | null;
  can(action: string): boolean;
  explain(action: string): string | null;
  requiresStepUp(action: string): boolean;
  refreshCapabilities(resourceType: string, resourceId: string): Promise<void>;
}
```

### 18.2 ProtectedAction

```tsx
<ProtectedAction
  action="game.finalizeStats"
  resourceType="game"
  resourceId={gameId}
  requireReason
>
  Cerrar estadísticas
</ProtectedAction>
```

### 18.3 Barra de contexto

Toda pantalla administrativa debe mostrar:

```text
Contexto activo
Recurso actual
Rol efectivo
Modo de seguridad
Estado de auditoría
```

---

## 19. Integración con Game Event Orchestrator

Todo evento crítico debe incluir `actor` y `authorization`.

```json
{
  "eventId": "evt_001",
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
  "data": {}
}
```

Regla:

```text
El orquestador no procesa eventos estadísticos sin autorización resuelta.
```

---

## 20. Integración con Broadcast Automation Engine

Acciones protegidas:

```text
broadcast.start
broadcast.stop
broadcast.showOverlay
broadcast.hideOverlay
broadcast.publishNotification
scorebug.operate
```

Regla:

```text
El Broadcast Automation Engine ejecuta timelines ya autorizados.
Si la acción proviene de evento autorizado, conserva correlationId.
Si la acción es manual desde Control Panel, debe autorizarse explícitamente.
```

---

## 21. Integración con Flow Builder

Acciones protegidas:

```text
flow.view
flow.create
flow.editDraft
flow.simulate
flow.publish
flow.rollback
flow.archive
```

Publicar y hacer rollback requieren:

```text
autorización
step-up
motivo obligatorio
audit event
```

---

## 22. Integración con Media Publishing Hub

Acciones protegidas:

```text
media.channel.connect
media.channel.disconnect
media.broadcast.create
media.broadcast.link
media.broadcast.start
media.broadcast.end
media.metadata.update
media.marker.create
media.highlight.publish
media.analytics.read
```

Ejemplo:

```json
{
  "type": "media.broadcast.linked",
  "gameId": "game_789",
  "actor": {
    "userId": "usr_123",
    "sessionId": "sess_456"
  },
  "authorization": {
    "decision": "allow",
    "policy": "media.broadcast.link",
    "reason": "user_is_media_operator"
  },
  "data": {
    "provider": "youtube",
    "externalBroadcastId": "yt_123",
    "watchUrl": "https://youtube.com/watch?v=..."
  }
}
```

---

## 23. Integración con WebSocket

Reglas:

```text
token requerido al conectar
validar permiso sobre gameId/channel
expulsar conexión si sesión fue revocada
no confiar en mensajes del cliente
cada comando WS se autoriza
acciones críticas generan audit event
```

Canales:

```text
game:{gameId}:scorebug
game:{gameId}:broadcast
game:{gameId}:scoring
game:{gameId}:insights
user:{userId}:notifications
```

---

## 24. Integración con PWA / Web Push

Reglas:

```text
PushSubscription asociada a userId
desuscripción disponible
payload sin datos sensibles
broadcast.publishNotification auditado
```

Payload permitido:

```json
{
  "type": "broadcast.started",
  "gameId": "game_789",
  "title": "Transmisión en vivo",
  "body": "Mineros vs Astros ya comenzó.",
  "watchUrl": "https://..."
}
```

---

## 25. API de seguridad — Contratos HTTP completos

### 25.1 Formato de error uniforme

Todos los endpoints de seguridad devuelven errores en este formato:

```json
{
  "error": {
    "code": "CODIGO_ERROR",
    "message": "Mensaje legible para el usuario.",
    "retryAfter": 60
  }
}
```

`retryAfter` solo aparece en errores `RATE_LIMIT_EXCEEDED` (segundos hasta poder reintentar).

#### Códigos de error

| Código | HTTP | Descripción |
|--------|------|-------------|
| `INVALID_EMAIL` | 400 | Formato de email inválido |
| `INVALID_OTP` | 401 | OTP incorrecto, expirado o email no existe |
| `OTP_MAX_ATTEMPTS` | 401 | Superado el máximo de intentos |
| `REFRESH_TOKEN_EXPIRED` | 401 | Cookie expirada o revocada |
| `REFRESH_TOKEN_REUSE` | 401 | Reuso detectado — todas las sesiones revocadas |
| `UNAUTHENTICATED` | 401 | Sin token o token inválido |
| `STEP_UP_NOT_REQUIRED` | 403 | La acción no requiere step-up |
| `INVALID_STEP_UP_CODE` | 401 | Código de step-up incorrecto |
| `CHALLENGE_ALREADY_CONSUMED` | 409 | Desafío ya consumido |
| `MISSING_TOKEN` | 400 | Token requerido ausente |
| `RATE_LIMIT_EXCEEDED` | 429 | Límite de solicitudes excedido |
| `INTERNAL_ERROR` | 500 | Error inesperado del servidor |

---

### 25.2 `POST /api/auth/otp/request`

**Request:**
```json
{ "email": "operador@club.cl" }
```

**200 — siempre (no-enumeración):**
```json
{ "message": "Si el correo está registrado o invitado, recibirás un código de acceso." }
```

**400:**
```json
{ "error": { "code": "INVALID_EMAIL", "message": "Ingresa un correo electrónico válido." } }
```

**429:**
```json
{ "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "Demasiados intentos. Espera antes de solicitar un nuevo código.", "retryAfter": 60 } }
```

---

### 25.3 `POST /api/auth/otp/verify`

**Request:**
```json
{ "email": "operador@club.cl", "otp": "123456" }
```

**200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "sessionId": "sess_xyz456"
}
```
Refresh token en `Set-Cookie`:
```
Set-Cookie: pf_refresh=<token_opaco>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/token/refresh; Max-Age=2592000
```

**401 — OTP inválido / expirado / email no existe (mismo mensaje para todos — no-enumeración):**
```json
{ "error": { "code": "INVALID_OTP", "message": "Código inválido o expirado." } }
```

**401 — máximo de intentos:**
```json
{ "error": { "code": "OTP_MAX_ATTEMPTS", "message": "Máximo de intentos alcanzado. Solicita un nuevo código." } }
```

**429:**
```json
{ "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "Demasiados intentos.", "retryAfter": 300 } }
```

---

### 25.4 `POST /api/auth/magic-link/request`

**Request:**
```json
{ "email": "operador@club.cl", "redirectUrl": "/auth/select-scope" }
```

**200 — siempre (no-enumeración):**
```json
{ "message": "Si el correo está registrado o invitado, recibirás un enlace de acceso." }
```

**400, 429:** mismo formato que `/otp/request`.

---

### 25.5 `GET /api/auth/magic-link/consume?token=<token>`

**302 — token válido:**
```
Location: /auth/select-scope
Set-Cookie: pf_refresh=<token_opaco>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/token/refresh; Max-Age=2592000
```
El cliente llama inmediatamente a `POST /api/auth/token/refresh` al cargar `/auth/select-scope`.

**302 — token inválido o expirado:**
```
Location: /login?error=invalid_link
```

**400:**
```json
{ "error": { "code": "MISSING_TOKEN", "message": "Token requerido." } }
```

---

### 25.6 `POST /api/auth/logout`

Requiere `Authorization: Bearer <access_token>`.

**Request:** body vacío.

**204:**
```
(sin body)
Set-Cookie: pf_refresh=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/token/refresh; Max-Age=0
```

**401:**
```json
{ "error": { "code": "UNAUTHENTICATED", "message": "Sesión no encontrada." } }
```

---

### 25.7 `POST /api/auth/token/refresh`

Cookie `pf_refresh` llega automáticamente. Body vacío.

**200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```
Nuevo refresh token en `Set-Cookie` (rotación obligatoria). El anterior queda inválido.

**401 — expirado o revocado:**
```json
{ "error": { "code": "REFRESH_TOKEN_EXPIRED", "message": "Sesión expirada. Inicia sesión nuevamente." } }
```

**401 — reuso detectado (TODAS las sesiones del usuario revocadas):**
```json
{ "error": { "code": "REFRESH_TOKEN_REUSE", "message": "Sesión invalidada por seguridad. Inicia sesión nuevamente." } }
```
Genera `security_event` con `severity='critical'` y `event_type='refresh_token_reuse'`.

---

### 25.8 `POST /api/auth/step-up/request`

Requiere `Authorization: Bearer <access_token>`.

**Request:**
```json
{
  "action": "game.finalizeStats",
  "resourceType": "game",
  "resourceId": "game_789"
}
```

**200 — OTP enviado al email del usuario:**
```json
{
  "challengeId": "suc_abc123",
  "expiresAt": "2026-06-27T12:10:00Z",
  "method": "otp",
  "action": "game.finalizeStats",
  "resourceType": "game",
  "resourceId": "game_789"
}
```

**401:** `UNAUTHENTICATED`

**403:**
```json
{ "error": { "code": "STEP_UP_NOT_REQUIRED", "message": "Esta acción no requiere confirmación adicional." } }
```

**429:** `RATE_LIMIT_EXCEEDED`

---

### 25.9 `POST /api/auth/step-up/verify`

Requiere `Authorization: Bearer <access_token>`.

**Request:**
```json
{
  "challengeId": "suc_abc123",
  "code": "654321",
  "reason": "Cierre oficial del partido validado por el anotador."
}
```
`reason` es obligatorio cuando `requiresReason: true` en la política. El backend valida que no esté vacío.

**200:**
```json
{
  "stepUpToken": "su_xyz789",
  "expiresAt": "2026-06-27T12:10:00Z",
  "action": "game.finalizeStats",
  "resourceType": "game",
  "resourceId": "game_789"
}
```
El cliente usa el step-up token en `X-Step-Up-Token` header al ejecutar la acción crítica.

**401 — código inválido o expirado:**
```json
{ "error": { "code": "INVALID_STEP_UP_CODE", "message": "Código inválido o expirado." } }
```

**409 — desafío ya consumido:**
```json
{ "error": { "code": "CHALLENGE_ALREADY_CONSUMED", "message": "Este desafío ya fue utilizado." } }
```

---

### 25.10 Security context

```http
GET  /api/security/context
GET  /api/security/resources/{resourceType}/{resourceId}/capabilities
POST /api/security/authorize
```

### 25.11 Users

```http
GET    /api/admin/users
POST   /api/admin/users/invite
GET    /api/admin/users/{userId}
PATCH  /api/admin/users/{userId}
POST   /api/admin/users/{userId}/suspend
POST   /api/admin/users/{userId}/reactivate
GET    /api/admin/users/{userId}/sessions
POST   /api/admin/users/{userId}/sessions/{sessionId}/revoke
GET    /api/admin/users/{userId}/audit
```

### 25.12 Roles

```http
GET    /api/admin/role-assignments
POST   /api/admin/role-assignments
DELETE /api/admin/role-assignments/{assignmentId}
GET    /api/admin/resources/{resourceType}/{resourceId}/roles
POST   /api/admin/access/simulate
```

### 25.13 Scoring assignments

```http
GET    /api/games/{gameId}/scoring-assignments
POST   /api/games/{gameId}/scoring-assignments
DELETE /api/games/{gameId}/scoring-assignments/{assignmentId}
```

### 25.14 Audit

```http
GET  /api/audit
GET  /api/audit/{auditId}
GET  /api/audit/resources/{resourceType}/{resourceId}
GET  /api/audit/users/{userId}
POST /api/audit/verify-integrity
```

---

## 26. Auditoría

### 26.1 Tipos de log

| Tipo | Uso |
|---|---|
| Security Audit | Login, roles, permisos, accesos, denegaciones, step-up, OAuth, sesiones. |
| Operator Actions | Acciones manuales de operador sobre broadcast/overlays. |
| Execution Log | Ejecución técnica de flujos del Game Event Orchestrator. |
| Game Events | Eventos deportivos confirmados o corregidos. |

### 26.2 AuditEvent

```json
{
  "auditId": "aud_001",
  "timestamp": "2026-06-27T12:00:00Z",
  "actor": {
    "userId": "usr_123",
    "email": "admin@liga.cl",
    "sessionId": "sess_456",
    "authMethod": "email_otp",
    "authLevel": "otp"
  },
  "action": "game.scoreEventCorrect",
  "resource": {
    "type": "game",
    "id": "game_789"
  },
  "result": "allowed",
  "authorization": {
    "decision": "allow",
    "reason": "user_is_assigned_scorer",
    "policyVersion": "security-policy-v1.0.0"
  },
  "request": {
    "ip": "190.xxx.xxx.xxx",
    "userAgent": "Mozilla/5.0",
    "correlationId": "corr_123"
  },
  "change": {
    "beforeHash": "sha256:...",
    "afterHash": "sha256:...",
    "summary": "Changed play result from hit to error"
  },
  "integrity": {
    "eventHash": "sha256:...",
    "previousHash": "sha256:..."
  }
}
```

### 26.3 Integridad

```text
append-only
hash encadenado
sin edición desde UI
lectura restringida
toda lectura de auditoría queda auditada
```

---

## 27. No repudio práctico

PlayFlow implementa no repudio práctico mediante:

```text
usuario autenticado
sesión identificada
autorización explícita
timestamp de servidor
IP y user agent
correlationId
motivo obligatorio en acciones críticas
step-up auth
hash del evento
hash encadenado
logs append-only
```

---

## 28. Base de datos

Las tablas se implementan en `playflow_db`.

Tablas principales:

```text
users
user_identities
otp_challenges
sessions
refresh_tokens
role_assignments
scoring_assignments
step_up_challenges
audit_events
security_events
```

Relación con tablas del ADR-001 v3.0:

```text
games
leagues
tournaments
teams
venues
game_events
flow_definitions
flow_execution_logs
broadcast_timelines
external_channels
media_publications
media_markers
push_subscriptions
```

---

## 29. Variables de entorno

### 29.1 JWT, tokens y secrets

```bash
# SecretProvider — ver §34.5
SECRET_PROVIDER=env                              # "env" en dev, "keyvault" en staging/prod
AZURE_KEY_VAULT_URL=https://playflow-kv.vault.azure.net/   # solo en staging/prod

# JWT — access token (en producción, estos valores viven en Key Vault)
JWT_SECRET=<64 bytes aleatorios en hex>          # renombrado desde TOKEN_HASH_SECRET
JWT_ALGORITHM=HS256
JWT_ISSUER=playflow
JWT_AUDIENCE=playflow-app
JWT_ACCESS_TOKEN_MINUTES=15                      # duración del access token en minutos

# Refresh token
JWT_REFRESH_TOKEN_DAYS=30                        # duración del refresh token en días
COOKIE_SECURE=true                               # false solo en desarrollo HTTP
COOKIE_SAME_SITE=Strict
COOKIE_DOMAIN=                                   # vacío = mismo dominio
```

### 29.2 Bootstrap, seguridad interna y retención de auditoría

```bash
# Bootstrap del primer SysAdmin — ver §30
BOOTSTRAP_SYSADMIN_EMAIL=admin@playflow.app      # si está vacío, no se ejecuta el bootstrap

# Integridad de auditoría (en producción, vive en Key Vault)
AUDIT_HASH_SECRET=<secreto para hash encadenado>

# Retención de audit logs — ver §34.2
AUDIT_RETENTION_ACTIVE_DAYS=90                   # días en MySQL (consultables)
AUDIT_RETENTION_ARCHIVE_DAYS=365                 # días totales antes de purga definitiva
AUDIT_ARCHIVE_PATH=./backups/audit               # ruta base para JSONL gzip
```

### 29.3 OTP y MFA

```bash
OTP_TTL_MINUTES=10                               # expiración del OTP (mínimo 5)
OTP_MAX_ATTEMPTS=5                               # intentos máximos por OTP
OTP_RESEND_SECONDS=60                            # tiempo mínimo entre reenvíos
OTP_RATE_LIMIT_PER_IP=10                         # máximo solicitudes por IP por ventana
OTP_RATE_WINDOW_MINUTES=15                       # ventana del rate limit

# TOTP para SysAdmin MFA
MFA_TOTP_ISSUER=PlayFlow                         # nombre en el autenticador
MFA_TOTP_WINDOW=1                                # ventanas de tolerancia (±30 segundos)
```

### 29.4 Email

```bash
EMAIL_PROVIDER=smtp                              # "smtp" en dev y prod

# Desarrollo (Ethereal automático — sin configurar SMTP_*)
# EMAIL_PROVIDER=smtp sin SMTP_HOST → nodemailer usa Ethereal internamente

# Producción (Resend SMTP relay)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASSWORD=re_<api_key>
EMAIL_FROM=no-reply@playflow.app
EMAIL_FROM_NAME=PlayFlow
```

### 29.5 Notificaciones push (pendiente — Fase 7)

```bash
VAPID_PUBLIC_KEY=***
VAPID_PRIVATE_KEY=***
VAPID_SUBJECT=mailto:admin@playflow.local
```

### 29.6 Integraciones opcionales

```bash
YOUTUBE_INTEGRATION_ENABLED=false
YOUTUBE_CLIENT_ID=***
YOUTUBE_CLIENT_SECRET=***
YOUTUBE_REDIRECT_URI=https://playflow-server.azurewebsites.net/api/media/youtube/oauth/callback
```

### 29.7 Compatibilidad

```bash
# TOKEN_HASH_SECRET ya no se usa — reemplazado por JWT_SECRET
# AUTH_ENABLED=true es el valor por defecto y puede eliminarse
```

---

## 30. Bootstrap del primer SysAdmin

El primer SysAdmin no puede crearse desde la UI (porque no hay UI sin autenticación), ni desde un script externo (riesgo de acceso no auditado). Se crea automáticamente en el startup del servidor cuando la variable `BOOTSTRAP_SYSADMIN_EMAIL` está configurada.

### 30.1 Comportamiento

```text
1. Al arrancar el servidor, AuthBootstrapService lee BOOTSTRAP_SYSADMIN_EMAIL.
2. Si la variable está vacía o no existe → no hace nada.
3. Si ya existe un usuario con role=SysAdmin en resource_type=Platform → no hace nada (idempotente).
4. Si no existe SysAdmin:
   a. INSERT en users (email, status='active', created_at)
   b. INSERT en role_assignments (user_id, role='SysAdmin', resource_type='Platform', resource_id='global', granted_by=self)
   c. INSERT en audit_events (event_type='bootstrap.sysadmin_created', severity='critical')
5. El admin hace su primer login con OTP normal al email configurado.
```

### 30.2 SQL de ejemplo

```sql
-- 1. Crear usuario si no existe
INSERT INTO users (user_id, email, status, created_at, updated_at)
VALUES (UUID(), 'admin@playflow.app', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = updated_at;

-- 2. Asignar rol SysAdmin en Platform si no existe
INSERT INTO role_assignments (
  assignment_id, user_id, role, resource_type, resource_id,
  granted_by_user_id, created_at
)
SELECT UUID(), u.user_id, 'SysAdmin', 'Platform', 'global',
       u.user_id, NOW()
FROM users u
WHERE u.email = 'admin@playflow.app'
AND NOT EXISTS (
  SELECT 1 FROM role_assignments ra
  WHERE ra.user_id = u.user_id
  AND ra.role = 'SysAdmin'
  AND ra.resource_type = 'Platform'
);
```

### 30.3 Security event

El bootstrap genera un `security_event` con estos campos:

```json
{
  "event_type": "bootstrap.sysadmin_created",
  "severity": "critical",
  "actor_user_id": null,
  "actor_source": "server_bootstrap",
  "metadata": {
    "email": "admin@playflow.app",
    "env_var": "BOOTSTRAP_SYSADMIN_EMAIL"
  }
}
```

### 30.4 Reglas operativas

- `BOOTSTRAP_SYSADMIN_EMAIL` puede removerse del entorno después del primer login exitoso del admin.
- Si se reinicia el servidor con la variable presente y el SysAdmin ya existe, no pasa nada (idempotente).
- Esta variable **nunca debe aparecer en logs** de la aplicación.

---

## 31. Implementación por fases

### Fase 1 — Base de autenticación

```text
users
otp_challenges
sessions
refresh_tokens
/api/auth/*
LoginPage
OtpVerifyPage
SecurityContextProvider básico
AuthBootstrapService (bootstrap SysAdmin al startup)
```

### Fase 2 — Roles y capabilities

```text
role_assignments
AuthorizationService (evaluador del mini-DSL de security-policy-v1.0.0.json)
CapabilityService
/api/security/context
/api/security/resources/:type/:id/capabilities
ProtectedAction
ProtectedRoute
SysAdmin MFA: TOTP (RFC 6238) con librería `otpauth` — tabla `user_mfa_credentials` (ver §33)
```

### Fase 3 — Gestión de usuarios

```text
AdminUsersPage
UserDetailPage
invitar usuario
suspender/reactivar
revocar sesiones
asignar/revocar roles
simulador de permisos
```

### Fase 4 — Scoring protegido

```text
scoring_assignments
política user_is_assigned_scorer
integración con LiveGameScoring
integración con Game Event Orchestrator
```

### Fase 5 — Auditoría fuerte

```text
audit_events
hash encadenado
viewer de auditoría
verify-integrity
lectura auditada
```

### Fase 6 — Flow Builder protegido `[v3.0]`

```text
policy: flow.publish requiere step-up
policy: flow.activate requiere step-up
```

### Fase 7 — Media channels protegidos `[v3.0]`

```text
media_channel_permissions
policy: media.connectChannel requiere step-up
YouTube OAuth tokens cifrados en reposo
stream key nunca en logs
```

### Fase 8 — Notificaciones push `[v3.0]`

```text
push_subscriptions
VAPID
no datos sensibles en push payloads
```
scoring_assignments
política user_is_assigned_scorer
integración con LiveGameScoring
integración con Game Event Orchestrator
```

### Fase 5 — Auditoría fuerte

```text
audit_events
hash encadenado
viewer de auditoría
verify-integrity
lectura auditada
```

### Fase 6 — Flow Builder protegido

```text
flow.publish
flow.rollback
step-up
motivo obligatorio
audit event
```

### Fase 7 — Broadcast y WebSocket protegido

```text
autorización por canal
comandos WS autorizados
sesión revocable
broadcast.start/stop auditado
```

### Fase 8 — Media Publishing / YouTube protegido

```text
media roles
OAuth channel connect
media_publications
media_markers
stream key protected access
metadata update audit
```

---

## 32. Criterios de aceptación

1. Usuario puede entrar con email OTP.
2. No se guardan contraseñas.
3. OTP se guarda hasheado.
4. Access token dura máximo 15 minutos.
5. Refresh token rota.
6. Sesiones se pueden revocar.
7. La UI consume `/api/security/context`.
8. La UI consume capabilities por recurso.
9. El backend valida permisos en cada acción.
10. El Game Event Orchestrator no procesa eventos estadísticos sin autorización.
11. Admin de Torneo puede asignar anotador.
12. Admin de Torneo no puede modificar estadísticas si no es anotador.
13. Anotador asignado puede anotar.
14. Usuario no asignado no puede anotar.
15. Flow publish requiere autorización y step-up.
16. Media channel connect requiere autorización y step-up.
17. YouTube tokens no aparecen en logs.
18. Stream key no aparece en logs.
19. WebSocket valida permiso por canal.
20. Push no envía datos sensibles.
21. Acción crítica genera audit event.
22. Audit event incluye actor, recurso, acción, resultado y policyVersion.
23. Audit event incluye hash encadenado.
24. Lectura de auditoría queda auditada.
25. Simulador de permisos muestra allow/deny y razón.
26. SysAdmin requiere MFA fuerte.
27. Operator de liga no existe si no tiene permisos reales.
28. Toda corrección estadística genera evento de corrección.
29. Toda acción de publicación externa queda auditada.
30. El sistema puede operar con `AUTH_ENABLED=false` solo en desarrollo local.

---

## 33. Decisiones resueltas (v2.0 — completo)

Todas las decisiones están resueltas. El documento está listo para implementación.

| Decisión | Resolución |
|---|---|
| JWT vs token opaco | **RESUELTA** — JWT HS256 para access (15 min, en memoria), opaco SHA-256 para refresh (30 días, httpOnly cookie), opaco para step-up (5 min) |
| Proveedor de email para OTP | **RESUELTA** — nodemailer + Ethereal (dev automático) + Resend SMTP relay (prod). Free tier 3,000/mes suficiente para una instalación típica |
| Contratos HTTP de auth | **RESUELTA** — 8 endpoints con contratos completos en §25. Principio de no-enumeración en OTP y magic link |
| Bootstrap del primer SysAdmin | **RESUELTA** — variable `BOOTSTRAP_SYSADMIN_EMAIL` al startup, idempotente, genera security_event crítico (ver §30) |
| Contratos TypeScript | **RESUELTA** — ver `security-contracts-v2.ts`: ResourceType (27 tipos), ResourceScope, 8 request types, 6 response types, AuthErrorCode, STEP_UP_HEADER |
| MFA para SysAdmin | **RESUELTA** — TOTP (RFC 6238) con librería `otpauth`. QR en primer setup. Passkey (WebAuthn) se agrega en v3.0 como opción adicional (no bloquea v1.0) |
| Retención de audit logs | **RESUELTA** — activos 90 días en MySQL (`AUDIT_RETENTION_ACTIVE_DAYS=90`), archivados 365 días como JSONL comprimido (`./backups/audit/YYYY-MM/`), purga definitiva a los 365 días |
| Política de acceso a stream key | **RESUELTA** — solo Owner/Admin del canal. UI muestra parcial (`sk-live-xxxx...****`). Ver completo o rotar requiere step-up obligatorio. Nunca en logs ni audit payloads. Rotación genera security_event severity=`high` |
| Scopes YouTube OAuth | **RESUELTA** — 3 scopes mínimos: `youtube.readonly` (info canal) + `youtube.upload` (crear broadcast) + `youtube.force-ssl` (live streaming). Sin `youtube` scope completo |
| Azure Key Vault | **RESUELTA** — obligatorio en staging/prod. Abstracción `SecretProvider` con dos implementaciones (`EnvSecretProvider` para dev, `KeyVaultSecretProvider` para Azure con Managed Identity). Variable `SECRET_PROVIDER=env|keyvault`. `JWT_SECRET` y `AUDIT_HASH_SECRET` nunca en variables de entorno del App Service en producción |
| Auditoría append-only MySQL vs externo | **RESUELTA** — MySQL append-only con partición mensual hasta 500K eventos/mes. La exportación JSONL del archivado cubre backup. Trigger de revisión: superar 500K eventos/mes en una instalación → evaluar Azure Monitor o tabla externa |

---

## 34. Especificaciones de decisiones resueltas v2.0

### 34.1 MFA para SysAdmin — TOTP

**Librería:** `otpauth` (RFC 6238 / RFC 4226)

**Flujo de setup:**

```text
1. SysAdmin abre /admin/settings/security
2. Sistema genera TOTP secret (32 bytes aleatorios, Base32 encoded)
3. Sistema muestra QR code y el secret en texto para backup manual
4. SysAdmin confirma ingresando el primer código de 6 dígitos
5. Secret se cifra con AES-256 derivado de JWT_SECRET y se guarda en user_mfa_credentials
6. status: 'pending_verification' → 'active'
```

**Login con MFA activo:**

```text
POST /api/auth/otp/verify   → 200 con mfaRequired: true (sin JWT aún)
POST /api/auth/mfa/verify   → { totpCode: "123456" } → JWT + refresh cookie
```

**Variables de entorno nuevas:**

```bash
MFA_TOTP_ISSUER=PlayFlow      # aparece en el nombre de la app en el autenticador
MFA_TOTP_WINDOW=1             # ventanas de tolerancia (±30s)
```

**Tabla SQL:** `user_mfa_credentials` (ya en `001_security_module.sql`)

---

### 34.2 Retención de audit logs

**Variables de entorno:**

```bash
AUDIT_RETENTION_ACTIVE_DAYS=90       # días en MySQL (consultables)
AUDIT_RETENTION_ARCHIVE_DAYS=365     # días totales antes de purga definitiva
AUDIT_ARCHIVE_PATH=./backups/audit   # ruta base para JSONL comprimidos
```

**Job nocturno** (2:00 AM hora del servidor):

```text
1. Exportar audit_events con timestamp < NOW() - ACTIVE_DAYS a JSONL gzip
   Ruta: {AUDIT_ARCHIVE_PATH}/YYYY-MM/audit-YYYY-MM-DD.jsonl.gz
2. Verificar integridad del archivo exportado (SHA-256 del JSONL)
3. DELETE audit_events WHERE timestamp < NOW() - ACTIVE_DAYS
4. DELETE audit_events (archivados ya expirados) WHERE timestamp < NOW() - ARCHIVE_DAYS
5. Registrar security_event: event_type='audit.archive_completed', details: { rows_archived, rows_purged, file_path }
```

---

### 34.3 Stream key — política de acceso

**Reglas:**

```text
- Solo usuarios con role Owner o Admin en el recurso Media Channel pueden operar stream keys
- La UI siempre muestra: sk-live-xxxx...****  (primeros 4 chars + enmascarado)
- Ver completo:  requiere step-up OTP, action='media.viewStreamKey'
- Rotar:         requiere step-up OTP, action='media.rotateStreamKey'
- La clave se cifra en reposo (AES-256 derivado de JWT_SECRET)
- NUNCA aparece en logs, audit payloads, ni mensajes de error
- La rotación genera security_event severity='high', event_type='media.stream_key_rotated'
```

**Endpoint de acceso (protegido):**

```http
POST /api/media/channels/{channelId}/stream-key/reveal
X-Step-Up-Token: <token>

→ 200: { "streamKey": "sk-live-xxxxxxxxxxxx" }
→ 200 se registra en audit_events
```

---

### 34.4 YouTube OAuth — scopes mínimos

```text
https://www.googleapis.com/auth/youtube.readonly
  → Leer info del canal (nombre, thumbnail, estado)

https://www.googleapis.com/auth/youtube.upload
  → Crear y gestionar broadcasts en YouTube Live

https://www.googleapis.com/auth/youtube.force-ssl
  → Requerido para operaciones de live streaming (RTMP)
```

**Reglas:**

```text
- NO solicitar el scope youtube completo
- Los tokens OAuth se almacenan cifrados (AES-256) en la DB
- access_token nunca aparece en logs
- refresh_token (YouTube) nunca en logs
- La conexión del canal requiere step-up, action='media.connectChannel'
```

---

### 34.5 Azure Key Vault — abstracción SecretProvider

**Variable de entorno:**

```bash
SECRET_PROVIDER=env        # desarrollo local — carga desde process.env
SECRET_PROVIDER=keyvault   # staging y producción — carga desde Azure Key Vault
AZURE_KEY_VAULT_URL=https://playflow-kv.vault.azure.net/
# No se necesitan credenciales: el App Service usa Managed Identity
```

**Contratos:**

```typescript
interface SecretProvider {
  getSecret(name: string): Promise<string>;
}

// Implementación dev: lee process.env[name]
class EnvSecretProvider implements SecretProvider { ... }

// Implementación prod: lee Azure Key Vault via @azure/keyvault-secrets + DefaultAzureCredential
class KeyVaultSecretProvider implements SecretProvider { ... }
```

**Secretos que viven en Key Vault en producción:**

```text
JWT_SECRET
AUDIT_HASH_SECRET
SMTP_PASSWORD (Resend API key)
```

**Secretos que permanecen en variables de entorno del App Service (no sensibles):**

```text
JWT_ALGORITHM, JWT_ISSUER, JWT_AUDIENCE, SMTP_HOST, EMAIL_FROM, etc.
```

---

### 34.6 Auditoría — criterio de escalado

```text
Motor:     MySQL append-only con partición mensual por timestamp
Límite:    500,000 audit_events/mes por instalación
Trigger:   Job semanal cuenta rows del mes. Si supera 500K → alerta en security_events
Acción:    Evaluar migración a Azure Monitor Logs o tabla externa
Fallback:  Sin migración urgente — el archivado JSONL del §34.2 mitiga el crecimiento activo
```

**Partición sugerida (crear en migración posterior):**

```sql
-- Partición por año-mes para evitar table scan en queries de audit
-- ALTER TABLE audit_events PARTITION BY RANGE (YEAR(timestamp)*100 + MONTH(timestamp)) (...)
-- Documentar cuando el volumen lo justifique
```

---

## 35. Regla final

```text
La seguridad de PlayFlow no se basa en ocultar botones.
La seguridad se basa en autorizar acciones sobre recursos concretos,
registrar lo ocurrido y permitir auditar cada decisión crítica.
```
