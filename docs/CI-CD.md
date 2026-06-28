# CI/CD de PlayFlow

Este documento describe la base de pipelines en GitHub Actions para el monorepo `playflow`.

## Objetivo

Cubrir una base mínima de automatización alineada con el orden de implementación del sistema descrito en `docs/requirements/26-master-package-index.md`:

- **Fases 1-5:** validaciones técnicas continuas (`typecheck`, `lint`, `build`, `test`)
- **Fase 6:** validación end-to-end y preparación de release

## Workflows

### 1. `ci.yml`

**Trigger**

- `push` a `dev`
- `pull_request` hacia `dev`

**Qué ejecuta**

1. Checkout
2. Node.js 20
3. pnpm 9
4. `pnpm install --frozen-lockfile`
5. `pnpm turbo typecheck --concurrency=4`
6. `pnpm turbo lint --concurrency=4`
7. `pnpm turbo build --concurrency=4`
8. `pnpm turbo test --concurrency=4`

**Objetivo**

Bloquear regresiones básicas antes de mergear a `dev`.

---

### 2. `e2e.yml`

**Trigger**

- `workflow_run` después de que `CI` termine con éxito en `dev`
- `workflow_dispatch` para ejecución manual

**Qué ejecuta**

1. Levanta un contenedor MySQL 8 para pruebas
2. Define `DATABASE_URL` local si el secreto no existe
3. Ejecuta `pnpm db:migrate`
4. Prepara Supabase CLI
5. Deja listo el paso para `supabase start`
6. Instala navegadores de Playwright
7. Ejecuta `pnpm test:e2e`
8. Sube `playwright-report/` y `test-results/` si hay fallos

**Estado actual**

- MySQL queda operativo para pruebas locales/CI
- Supabase local está **preparado como plantilla**
- El arranque real de Supabase depende de crear `infra/supabase/config.toml`

---

### 3. `release.yml`

**Trigger**

- `push` a `dev` cuando cambian archivos en `.changeset/`
- `workflow_dispatch` para publish manual

**Qué ejecuta**

#### En `push`

- Instala dependencias
- Ejecuta `changesets/action`
- Crea o actualiza el Release PR

#### En `workflow_dispatch`

- Instala dependencias
- Ejecuta build previo
- Ejecuta `pnpm release` (`changeset publish`)
- Deja plantillas para:
  - deploy frontend en Vercel
  - migraciones backend en Supabase

## Secrets / variables requeridas

Configurar estos secrets en GitHub Actions:

| Secret | Uso |
|---|---|
| `SUPABASE_URL` | Tests/integraciones que consuman Supabase |
| `SUPABASE_KEY` | Tests/integraciones que consuman Supabase |
| `DATABASE_URL` | Base MySQL para tests |
| `SUPABASE_ACCESS_TOKEN` | `supabase db push` en release |
| `VERCEL_TOKEN` | Deploy a Vercel |
| `VERCEL_ORG_ID` | Scope del proyecto Vercel |
| `VERCEL_PROJECT_ID` | Proyecto destino en Vercel |
| `NPM_TOKEN` | Requerido solo si algún paquete pasa a publish real |

## Convenciones de ejecución

- **Node.js:** `20`
- **pnpm:** `9`
- **Concurrencia de Turbo/Node en CI:** `4`

## Pendientes para completar la integración

1. Crear `infra/supabase/config.toml` para habilitar `supabase start` en CI.
2. Confirmar qué app se despliega en Vercel (`apps/overlay-server`, otra app o salida estática específica).
3. Definir si `changeset publish` publicará paquetes, artefactos internos o solo versionado/release notes.
4. Revisar si Playwright debe apuntar a datos seed de Supabase además de MySQL.
5. Agregar environments (`staging`/`production`) cuando se definan ramas de promoción.
