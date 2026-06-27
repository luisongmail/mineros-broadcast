# PlayFlow — Configuración del Entorno de Desarrollo

**Extraído de:** ADR-001 v3.0 secciones 27, 28, 33, 34  
**Última actualización:** 2026-06-27

---

## 1. HERRAMIENTAS REQUERIDAS

| Herramienta | Versión | Propósito | Costo |
|------------|---------|-----------|-------|
| Node.js | 20 LTS | Runtime | $0 |
| pnpm | 9.x | Package manager | $0 |
| Docker Desktop | Latest | MySQL local + builds | $0 |
| Git | Any | Control de versiones | $0 |
| VS Code | Latest | IDE recomendado | $0 |
| OBS Studio | 30+ | Testing de Browser Sources | $0 |

---

## 2. SETUP LOCAL

### 2.1 Instalación

```bash
git clone https://github.com/luisongmail/playflow
cd playflow
pnpm install
```

### 2.2 Variables de entorno locales

Copiar `.env.example` y ajustar:

```bash
cp apps/studio/.env.example apps/studio/.env
```

Valores de desarrollo:

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=mysql://playflow_app:dev_password@localhost:3306/playflow_db
AUTH_ENABLED=false
```

### 2.3 Variables Vite (cliente)

```bash
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

### 2.4 Levantar con Docker Compose

```yaml
# docker-compose.yml (extracto)
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

```bash
docker compose up -d
```

### 2.5 Desarrollo sin Docker (modo recomendado)

```bash
# Terminal 1 — MySQL local (o Docker solo para la DB)
docker compose up db -d

# Terminal 2 — servidor + cliente en modo desarrollo
pnpm turbo dev
```

### 2.6 Puertos fijos

| Servicio | Puerto | Notas |
|---------|--------|-------|
| Express API + WS | `:3001` | Dev local |
| Vite SPA | `:5173` | `strictPort: true` |
| MySQL | `:3306` | Docker Compose y local |
| Docker full | `:8080` | Producción simulada |

---

## 3. VARIABLES DE ENTORNO

### 3.1 Producción (Azure App Service — Application Settings)

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

### 3.2 Vite build (producción)

```bash
VITE_API_URL=https://playflow-server.azurewebsites.net/api
VITE_WS_URL=wss://playflow-server.azurewebsites.net
```

---

## 4. COMANDOS DE VALIDACIÓN

```bash
pnpm install                                          # instalar dependencias
pnpm turbo typecheck                                  # type check todos los packages
pnpm turbo lint                                       # lint
pnpm turbo test                                       # tests unitarios (Vitest)
pnpm turbo build                                      # build completo
pnpm turbo typecheck --filter=@playflow/studio        # typecheck solo studio
pnpm turbo build --filter=@playflow/studio            # build solo studio
```

---

## 5. PIPELINE CI/CD

### 5.1 CI (por implementar — tarea #27)

```text
pnpm install
pnpm turbo typecheck
pnpm turbo lint
pnpm turbo test
```

Validaciones recomendadas a agregar:

```text
validar JSON schema de FlowDefinition
validar contratos IC-003
validar migrations MySQL (lint de ADD COLUMN IF NOT EXISTS)
validar tests de autorización mínima
validar lint de packages/*
validar build de overlays nuevos
```

### 5.2 Deploy a producción (por implementar — tarea #28)

```text
docker build -t playflowacr.azurecr.io/playflow-server:{sha}
docker push playflowacr.azurecr.io/playflow-server:{sha}
az webapp config container set --name playflow-server ...
pnpm turbo build --filter studio
az staticwebapp upload --source dist/ ...
```

> Hasta que el pipeline esté automatizado, el deploy a producción se ejecuta **manualmente** siguiendo estos pasos.

### 5.3 Branching

Ver `docs/development/DEVELOPMENT-CYCLE.md` para el flujo completo de branches, PRs y convenciones de commit.

Resumen:

```text
main       → Código estable aprobado (merges desde dev únicamente)
dev        → Integración continua — toda feature aterriza aquí
insiders   → Early access, sincronizado desde dev
squad/*    → Ramas feature/fix (naming: squad/{issue}-{slug})
```

Reglas:
- Nunca push directo a `main` ni `dev`
- Todo trabajo parte de `dev`
- PR siempre targeta `dev`

---

*Para decisiones de arquitectura ver `docs/architecture/ADR-001-architecture.md`.*  
*Para ciclo de desarrollo y estándares de código ver `docs/development/DEVELOPMENT-CYCLE.md`.*
