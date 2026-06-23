---
name: "main-protection"
description: "main solo se puede actualizar mediante PR aprobado por luison — regla de protección de rama"
domain: "version-control"
confidence: "high"
source: "team-decision"
---

## Regla central

```text
NUNCA hacer push directo a main.
NUNCA hacer merge a main sin PR aprobado por luison.
Todo trabajo nuevo parte desde dev o desde una rama squad/N-slug creada a partir de dev.
```

## Configuración de branch protection en GitHub

La rama `main` debe tener las siguientes reglas en GitHub → Settings → Branches:

```
✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Required approvers: luison (propietario del repositorio)
  ✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
  - ci / build
  - ci / test
  - ci / lint

✅ Require branches to be up to date before merging

✅ Do not allow bypassing the above settings
```

## Modelo de ramas

| Rama | Propósito | Publica en |
|------|-----------|-----------|
| `main` | Código en producción, etiquetado semánticamente | Deploy producción |
| `dev` | Rama de integración — todo el trabajo aterriza aquí | Deploy preview |
| `squad/{N}-{slug}` | Rama de issue/feature | PR → dev |

## Flujo de trabajo para cualquier issue

```bash
# 1. Partir desde dev
git checkout dev && git pull origin dev
git checkout -b squad/{issue-number}-{slug}

# 2. Trabajar, hacer commits con referencia al issue
git commit -m "feat: descripción (#N)"

# 3. Abrir PR como draft apuntando a dev
gh pr create --base dev --title "feat: descripción" --body "Closes #N" --draft

# 4. Hacer ready cuando está listo
git push -u origin squad/{issue-number}-{slug}
gh pr ready

# 5. El PR se fusiona a dev después de CI verde
# 6. dev → main se hace mediante PR separado aprobado por luison
```

## Flujo de release a main

```bash
# Solo luison puede iniciar un release a main
git checkout dev && git pull origin dev
gh pr create --base main --title "release: vX.Y.Z" --body "Release notes aquí" --draft
# Esperar CI verde + aprobación explícita de luison
gh pr ready
# luison aprueba y hace merge
```

## Semantic Versioning con Changesets

Cada PR que aporta cambios debe incluir un changeset:

```bash
pnpm changeset
# Seleccionar paquetes afectados
# Seleccionar tipo de cambio: patch | minor | major
# Describir el cambio en español
```

En merge a `main`, GitHub Actions corre:
```bash
pnpm changeset version  # actualiza package.json
pnpm changeset publish  # tag git + publicación si corresponde
```

## Anti-patrones

- ❌ Push directo a main (`git push origin main`)
- ❌ Merge a main sin aprobación de luison
- ❌ PR apuntando a main desde rama feature (siempre va a dev primero)
- ❌ Saltarse el CI antes de merge
- ❌ Hacer release sin changeset
- ❌ Modificar historial de main (`git push --force origin main`)
