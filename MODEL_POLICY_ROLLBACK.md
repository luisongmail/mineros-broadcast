# Política de modelos Squad + rollback rápido

Este documento deja persistente cómo revertir la política de modelos si no funciona en operación real.

## Política aplicada

- `defaultModel`: `gpt-5.4-mini`
- Overrides:
  - `babe`: `gpt-5.3-codex`
  - `sandy`: `gpt-5.3-codex`
  - `jeter`: `gpt-5.3-codex`
  - `mariano`: `gpt-5.4-mini`
  - `robinson`: `gpt-5.4-mini`
  - `scribe`: `claude-haiku-4.5`
  - `ralph`: `claude-haiku-4.5`
  - `rai`: `claude-sonnet-4.6`

Archivo fuente: `.squad/config.json`

## Comandos de rollback

### 1) Ver estado actual

```bash
git --no-pager diff .squad/config.json
git --no-pager log --oneline -- .squad/config.json
```

### 2) Volver a la versión anterior del archivo

```bash
git checkout HEAD~1 -- .squad/config.json
```

### 3) Rollback a un commit específico

```bash
git checkout <commit_sha> -- .squad/config.json
```

### 4) Confirmar y publicar rollback

```bash
git add .squad/config.json
git commit -m "chore(squad): rollback model policy"
git push origin develop
```

## Opción extrema (volver a modo automático simple)

Dejar `.squad/config.json` en:

```json
{
  "version": 1
}
```

Luego commit + push.
