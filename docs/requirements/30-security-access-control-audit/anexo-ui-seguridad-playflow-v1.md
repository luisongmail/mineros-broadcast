# Anexo UI — Seguridad PlayFlow v1.0

Este anexo complementa la especificación de seguridad PlayFlow v1.0 con diseños de interfaz para implementar la experiencia de seguridad en `apps/studio`.

## Interfaces incluidas

1. `security-ui-login-otp-playflow-v1.png`
   - Login passwordless con email y OTP.
   - Mensaje neutro para evitar enumeración de usuarios.
   - Aviso de MFA adicional para SysAdmin.

2. `security-ui-selector-contexto-playflow-v1.png`
   - Selección de scope de trabajo.
   - Muestra rol efectivo por recurso.
   - Refuerza que los permisos cambian por contexto.

3. `security-ui-admin-usuarios-roles-playflow-v1.png`
   - Gestión de usuarios y roles.
   - Asignación de rol por recurso.
   - Acción auditada y simulador de permisos.

4. `security-ui-stepup-confirmacion-playflow-v1.png`
   - Confirmación de acción crítica.
   - Motivo obligatorio.
   - Código de step-up.
   - Mensaje de auditoría explícito.

## Regla UX

La interfaz no reemplaza la seguridad del backend.

```text
Backend calcula permisos.
Frontend representa capacidades.
Backend vuelve a validar al ejecutar.
AuditTrail registra el resultado.
```
