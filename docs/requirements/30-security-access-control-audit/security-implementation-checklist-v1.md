# Checklist de implementación — Seguridad PlayFlow v1.0

## Fase 1 — Autenticación
- [ ] Crear tablas `users`, `otp_challenges`, `sessions`, `refresh_tokens`.
- [ ] Implementar `POST /api/auth/otp/request`.
- [ ] Implementar `POST /api/auth/otp/verify`.
- [ ] Hashear OTP.
- [ ] Rate limit por email e IP.
- [ ] Crear sesión.
- [ ] Crear access token.
- [ ] Crear refresh token rotativo.
- [ ] Crear `LoginPage`.
- [ ] Crear `OtpVerifyPage`.

## Fase 2 — Contexto y capabilities
- [ ] Crear `SecurityContextProvider`.
- [ ] Implementar `GET /api/security/context`.
- [ ] Implementar `GET /api/security/resources/:type/:id/capabilities`.
- [ ] Crear `ProtectedRoute`.
- [ ] Crear `ProtectedAction`.

## Fase 3 — Roles
- [ ] Crear tabla `role_assignments`.
- [ ] Implementar `AuthorizationService`.
- [ ] Implementar `CapabilityService`.
- [ ] Implementar `/api/admin/role-assignments`.
- [ ] Crear `AdminUsersPage`.
- [ ] Crear `AdminRolesPage`.
- [ ] Crear simulador de permisos.

## Fase 4 — Scoring protegido
- [ ] Crear tabla `scoring_assignments`.
- [ ] Implementar policy `user_is_assigned_scorer`.
- [ ] Proteger endpoints `/api/scorer/*`.
- [ ] Integrar autorización con `GameEventEnvelope`.
- [ ] Bloquear modificación estadística no autorizada.

## Fase 5 — Auditoría
- [ ] Crear `audit_events`.
- [ ] Implementar hash encadenado.
- [ ] Auditar acciones permitidas críticas.
- [ ] Auditar acciones denegadas críticas.
- [ ] Implementar `GET /api/audit`.
- [ ] Implementar `POST /api/audit/verify-integrity`.

## Fase 6 — Flow Builder
- [ ] Proteger `flow.publish`.
- [ ] Proteger `flow.rollback`.
- [ ] Agregar step-up.
- [ ] Motivo obligatorio.
- [ ] Audit event.

## Fase 7 — Broadcast y WebSocket
- [ ] Autenticar conexión WS.
- [ ] Validar permisos por canal.
- [ ] Proteger `broadcast.start`.
- [ ] Proteger `broadcast.stop`.
- [ ] Proteger `broadcast.publishNotification`.

## Fase 8 — Media Publishing / YouTube
- [ ] Proteger `media.channel.connect`.
- [ ] Proteger `media.broadcast.create`.
- [ ] Proteger `media.broadcast.link`.
- [ ] Proteger `media.metadata.update`.
- [ ] Proteger `media.streamKey.read`.
- [ ] Asegurar que tokens OAuth no se loguean.
- [ ] Asegurar que stream keys no se loguean.
- [ ] Auditar acciones de publicación.
