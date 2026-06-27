# Security Policy v1.0.0
## PlayFlow — Política base de autorización

**Policy ID:** `security-policy-v1.0.0`  
**Versión:** 1.0.0  
**Estado:** Draft  
**Producto:** PlayFlow  
**Archivo canónico:** `security-policy-v1.0.0.json`

---

## 1. Qué es `security-policy-v1.0.0`

`security-policy-v1.0.0` es el identificador versionado de la política de autorización usada por PlayFlow para decidir si un usuario puede ejecutar una acción sobre un recurso.

La política define:

```text
acciones protegidas
recursos protegidos
roles válidos
condiciones de autorización
denegaciones explícitas
requisitos de step-up
requisitos de motivo obligatorio
nivel de auditoría
campos prohibidos en logs
```

Cuando `AuthorizationService` toma una decisión, debe devolver el identificador de la política usada:

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

## 2. Por qué debe estar versionada

La política afecta decisiones críticas:

```text
quién puede anotar
quién puede corregir estadísticas
quién puede cerrar un partido
quién puede publicar flujos
quién puede conectar YouTube
quién puede leer stream keys
quién puede asignar roles
```

Por eso cada decisión de autorización y cada evento de auditoría debe guardar la versión usada.

Esto permite responder después:

```text
Con qué política se permitió o denegó esta acción.
Qué reglas estaban vigentes en ese momento.
Si una decisión histórica fue tomada con una política anterior.
```

---

## 3. Ubicación recomendada en el repo

```text
packages/security/
├── policies/
│   ├── security-policy.schema.json
│   ├── security-policy-v1.0.0.json
│   └── README.md
```

O si se prefiere separar configuración:

```text
config/security/
├── security-policy.schema.json
├── security-policy-v1.0.0.json
└── README.md
```

---

## 4. Cómo se versiona

Formato:

```text
security-policy-vMAJOR.MINOR.PATCH
```

Ejemplo:

```text
security-policy-v1.0.0
security-policy-v1.1.0
security-policy-v1.1.1
security-policy-v2.0.0
```

### MAJOR

Cambios incompatibles o que pueden modificar decisiones existentes.

Ejemplos:

```text
quitar permisos existentes
endurecer reglas existentes
cambiar la semántica de roles
modificar una regla de scoring
modificar reglas de SysAdmin
cambiar condiciones de acceso a stream key
```

### MINOR

Cambios aditivos compatibles.

Ejemplos:

```text
agregar una acción nueva
agregar un recurso nuevo
agregar una regla nueva sin cambiar decisiones existentes
agregar capability group
```

### PATCH

Cambios no funcionales.

Ejemplos:

```text
corregir descripción
corregir typo
agregar metadata
ordenar reglas sin cambiar comportamiento
```

---

## 5. Reglas de uso en runtime

`AuthorizationService` debe:

```text
cargar una versión activa de la política
evaluar deny_by_default
evaluar denyIf antes que allowIf
evaluar allowIf
determinar requiresStepUp
determinar requiresReason
devolver policyVersion
registrar audit event cuando corresponda
```

Orden recomendado:

```text
1. validar usuario y sesión
2. validar recurso
3. cargar política activa
4. buscar reglas que coincidan con action/resource
5. si no hay regla: deny
6. evaluar denyIf
7. evaluar allowIf
8. evaluar step-up/reason
9. retornar decisión con policyVersion
```

---

## 6. Relación con auditoría

Cada `AuditEvent` debe guardar:

```json
{
  "authorization": {
    "decision": "allow",
    "reason": "user_is_assigned_scorer",
    "policyVersion": "security-policy-v1.0.0"
  }
}
```

Para acciones denegadas también:

```json
{
  "authorization": {
    "decision": "deny",
    "reason": "user_is_not_assigned_scorer",
    "policyVersion": "security-policy-v1.0.0"
  }
}
```

---

## 7. Relación con Execution Log

El `Execution Log` del Game Event Orchestrator debe registrar la autorización recibida, pero no debe recalcular permisos.

```text
AuthorizationService decide.
Game Event Orchestrator ejecuta solo si la decisión es allow.
Execution Log registra la policyVersion usada.
```

---

## 8. Relación con UI

La UI no debe leer directamente el archivo `security-policy-v1.0.0.json`.

La UI consume:

```text
/api/security/context
/api/security/resources/{resourceType}/{resourceId}/capabilities
```

El backend traduce la política a capabilities efectivas.

---

## 9. Regla final

```text
La política de seguridad es código de configuración crítica.
Debe versionarse, revisarse, probarse y auditarse como parte del producto.
```
