# PlayFlow — User Management for Admins

**Versión:** 1.0  
**Fecha:** 2026-06-29  
**Estado:** ✅ DOCUMENTADO  
**Propietario:** Admin Panel

---

## 📋 Flujo Completo: Agregar Usuario + Asignar Rol

### Paso 1: Invitar Usuario

**Endpoint:** `POST /api/admin/users/invite`

```bash
curl -X POST http://localhost:5173/api/admin/users/invite \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@playflow.cl"}'
```

**Response (éxito):**
```json
{
  "ok": true,
  "userId": "usr_1719592662000_a7x2k",
  "email": "newuser@playflow.cl",
  "message": "Usuario invitado. Podrá crear contraseña en el primer login."
}
```

**Qué pasa:**
- ✅ Se crea un registro en tabla `users` con email y estado `active`
- ✅ `display_name` se llena con la parte antes del `@` del email
- ✅ Usuario puede hacer login y crear contraseña en primer acceso
- ✅ Automáticamente **NO** recibe rol (verifica siguiente paso)

---

### Paso 2: Asignar Rol al Usuario

**Endpoint:** `POST /api/admin/users/:userId/roles/assign`

```bash
# Obtén userId de la respuesta anterior, o de GET /api/admin/users

curl -X POST http://localhost:5173/api/admin/users/usr_1719592662000_a7x2k/roles/assign \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"role":"SysAdmin"}'
```

**Roles disponibles:**
- `SysAdmin` — Acceso completo a Admin Panel
- `Admin` — Acceso a funciones administrativas (futuro)
- `Operator` — Acceso limitado a operaciones (futuro)

**Response (éxito):**
```json
{
  "ok": true,
  "userId": "usr_1719592662000_a7x2k",
  "role": "SysAdmin",
  "message": "Rol 'SysAdmin' asignado a usuario."
}
```

**Qué pasa:**
- ✅ Se crea/actualiza entrada en tabla `role_assignments`
- ✅ En el próximo login del usuario, JWT incluirá `role: "SysAdmin"`
- ✅ Usuario tendrá acceso a endpoints protegidos con `requireRole('SysAdmin')`

---

### Paso 3: Verificar Rol del Usuario

**Endpoint:** `GET /api/admin/users/:userId/roles`

```bash
curl -X GET http://localhost:5173/api/admin/users/usr_1719592662000_a7x2k/roles \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Response (con rol):**
```json
{
  "userId": "usr_1719592662000_a7x2k",
  "role": "SysAdmin",
  "status": "active"
}
```

**Response (sin rol):**
```json
{
  "userId": "usr_1719592662000_a7x2k",
  "role": null,
  "message": "Usuario sin rol asignado."
}
```

---

## 🎯 Desde el Admin Panel (UI)

### Invitar Usuario (NO EXISTE AÚN - NEXT MILESTONE)

En PlayFlow v0.2.0, habrá un tab **"Usuarios"** con:
```
┌─────────────────────────────┐
│ Usuarios Admin Panel         │
├─────────────────────────────┤
│                             │
│ [Invitar Usuario]           │
│                             │
│ ┌─────────────────────────┐ │
│ │ Email: ___________      │ │
│ │ [Enviar Invitación]     │ │
│ └─────────────────────────┘ │
│                             │
│ Usuarios Activos:           │
│ ┌─────────────────────────┐ │
│ │ Email      | Rol        │ │
│ │────────────│────────────│ │
│ │ luison@... | SysAdmin ✓ │ │
│ │ newuser@.. | (Sin rol)  │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

**Para ahora:** Usa curl o Postman

---

## 📊 Estados y Ciclo de Vida

### Usuario: Invitado → Activo

```
┌──────────────────┐
│   Invitado       │  (email registrado, sin contraseña)
└────────┬─────────┘
         │
         ├─→ Usuario hace click en link de invitación
         │
┌────────▼─────────┐
│   Crea Password  │  (SET PASSWORD form)
└────────┬─────────┘
         │
         ├─→ Password válida
         │
┌────────▼─────────┐
│   Activo (No rol)│  (puede login, pero sin acceso admin)
└────────┬─────────┘
         │
         ├─→ SysAdmin asigna rol
         │
┌────────▼─────────┐
│   Activo + Rol   │  (tiene acceso según rol)
└──────────────────┘
```

### Roles: Jerarquía

```
SysAdmin
   │
   ├─→ Full access to Admin Panel
   ├─→ Can invite users
   ├─→ Can assign roles
   ├─→ Can update system policies
   └─→ Can view audit logs

Admin (future)
   │
   ├─→ Can manage users (not roles)
   ├─→ Can view audit logs
   └─→ Limited policy updates

Operator (future)
   │
   ├─→ Can view dashboard
   ├─→ Can manage specific resources
   └─→ No access to user management

(No role)
   │
   └─→ Can login but no admin access
```

---

## 🔧 Base de Datos (Behind the Scenes)

### Tabla: `users`
```sql
SELECT * FROM users WHERE email = 'newuser@playflow.cl';

+---------+-------------------+---------+--------+----------+
| user_id | email             | display | status | mfa_en   |
+---------+-------------------+---------+--------+----------+
| usr_... | newuser@playflow  | newuser | active | 0        |
+---------+-------------------+---------+--------+----------+
```

### Tabla: `role_assignments`
```sql
SELECT * FROM role_assignments WHERE user_id = 'usr_...';

+--------+--------+-------+--------+
| user_id| role   | status| created|
+--------+--------+-------+--------+
| usr_...| SysAdm | active| 2026.. |
+--------+--------+-------+--------+
```

### JWT Token (después de login)
```json
{
  "sub": "usr_...",
  "email": "newuser@playflow.cl",
  "role": "SysAdmin",           ← ¡Incluido por getUserRole()!
  "authLevel": "standard",
  "iat": 1719592662
}
```

---

## ⚠️ Errores Comunes

### Error: "Usuario ya existe"
```
POST /api/admin/users/invite
{"error":{"code":"USER_EXISTS","message":"Usuario ya existe."}}
```
**Causa:** Email ya registrado en BD.  
**Solución:** Verifica email spelling, o asigna rol a usuario existente.

### Error: "Se requiere uno de estos roles: SysAdmin"
```
POST /api/admin/users/invite
{"error":{"code":"PERMISSION_DENIED","message":"Se requiere uno de estos roles: SysAdmin"}}
```
**Causa:** Tu JWT no incluye `role: "SysAdmin"`.  
**Solución:** Asegúrate que tu usuario tiene rol SysAdmin asignado (ver migration 006).

### Error: "Email válido requerido"
```
POST /api/admin/users/invite
{"error":{"code":"INVALID_EMAIL","message":"Email válido requerido."}}
```
**Causa:** Email format inválido.  
**Solución:** Usa formato `usuario@dominio.com`.

### Error: "Role debe ser: SysAdmin, Admin, u Operator"
```
POST /api/admin/users/:userId/roles/assign
{"error":{"code":"INVALID_ROLE","message":"Role debe ser: SysAdmin, Admin, u Operator."}}
```
**Causa:** Intentaste asignar rol inválido (typo?).  
**Solución:** Usa exactamente: `"SysAdmin"`, `"Admin"`, o `"Operator"`.

---

## 🧪 Test End-to-End (Curl)

```bash
#!/bin/bash

# 1. Login and get JWT
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"luison@playflow.cl","password":"Test123!@#"}' \
  | jq -r '.token')

echo "JWT: $TOKEN"

# 2. Invite new user
RESPONSE=$(curl -s -X POST http://localhost:5173/api/admin/users/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@playflow.cl"}')

USERID=$(echo "$RESPONSE" | jq -r '.userId')
echo "New User ID: $USERID"

# 3. Assign role
curl -s -X POST http://localhost:5173/api/admin/users/$USERID/roles/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"Admin"}' | jq .

# 4. Verify role
curl -s -X GET http://localhost:5173/api/admin/users/$USERID/roles \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## 📝 Próximos Pasos (Roadmap)

- [ ] **v0.2.0:** UI Tab "Usuarios" en Admin Panel (invite form + role selector)
- [ ] **v0.2.0:** Delete user endpoint (`DELETE /api/admin/users/:userId`)
- [ ] **v0.2.1:** Batch import (CSV upload de usuarios)
- [ ] **v0.2.1:** Role templates (predefined permissions per role)
- [ ] **v0.3.0:** Fine-grained ACL (per-resource role assignments)

---

## 📞 Soporte

- **Documentación:** `docs/admin/USER-MANAGEMENT.md` (este archivo)
- **API Reference:** `apps/studio/server/admin/adminRouter.ts`
- **Hook Reference:** `apps/studio/src/hooks/useAdmin.ts`
- **Migraciones:** `infra/mysql/migrations/006_seed_sysadmin_role.sql`
