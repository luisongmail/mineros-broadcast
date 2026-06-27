# Versionamiento de políticas de seguridad — PlayFlow

## Artefacto canónico

La política activa debe existir como archivo versionado:

```text
security-policy-v1.0.0.json
```

## Identificador

El identificador usado en respuestas y auditoría debe coincidir con el archivo:

```text
security-policy-v1.0.0
```

## Uso en AuthorizationService

Toda decisión debe incluir:

```json
{
  "policyVersion": "security-policy-v1.0.0"
}
```

## Uso en AuditEvent

Todo evento auditado debe registrar la política usada:

```json
{
  "authorization": {
    "decision": "allow",
    "reason": "user_is_assigned_scorer",
    "policyVersion": "security-policy-v1.0.0"
  }
}
```

## Uso en Game Event Orchestrator

Todo `GameEventEnvelope` crítico debe recibir autorización ya resuelta:

```json
{
  "authorization": {
    "decision": "allow",
    "policy": "game.scoreEventCreate",
    "reason": "user_is_assigned_scorer",
    "policyVersion": "security-policy-v1.0.0"
  }
}
```

## SemVer

```text
MAJOR: cambio que puede modificar decisiones existentes
MINOR: cambio aditivo compatible
PATCH: cambio no funcional
```

## Recomendación de repo

```text
packages/security/policies/
├── security-policy.schema.json
├── security-policy-v1.0.0.json
└── README.md
```
