#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION_FILE="${ROOT_DIR}/infra/mysql/migrations/007_lineup_roster_refactor.sql"
ROLLBACK_FILE="${ROOT_DIR}/infra/mysql/ROLLBACK_007.sql"

if [[ ! -f "${MIGRATION_FILE}" ]]; then
  echo "❌ Missing migration: ${MIGRATION_FILE}"
  exit 1
fi

if [[ ! -f "${ROLLBACK_FILE}" ]]; then
  echo "❌ Missing rollback: ${ROLLBACK_FILE}"
  exit 1
fi

if rg -n "rosters_new" "${MIGRATION_FILE}" >/dev/null; then
  echo "❌ Migration still references rosters_new"
  exit 1
fi

if ! rg -n "ENUM\\('added', 'removed', 'used_in_lineup'\\)" "${MIGRATION_FILE}" >/dev/null; then
  echo "❌ roster_changes.action enum is incomplete"
  exit 1
fi

if ! rg -n "CREATE TABLE rosters" "${MIGRATION_FILE}" >/dev/null; then
  echo "❌ rosters table creation not found"
  exit 1
fi

echo "✅ Migration 007 checks passed."
