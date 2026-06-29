#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_NAME="${MYSQL_CONTAINER:-}"
MYSQL_HOST="${MYSQL_HOST:-}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-playflow_db}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root_password}"
MYSQL_ROOT_USER="${MYSQL_ROOT_USER:-root}"
WAIT_SECONDS="${MYSQL_WAIT_SECONDS:-90}"

mysql_cmd() {
  if [ -n "$MYSQL_HOST" ]; then
    docker run --rm -i --network host mysql:8.0 mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_ROOT_USER" "-p$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"
  else
    docker exec -i "$CONTAINER_NAME" mysql -u"$MYSQL_ROOT_USER" "-p$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"
  fi
}

mysql_exec() {
  mysql_cmd
}

mysql_query() {
  if [ -n "$MYSQL_HOST" ]; then
    docker run --rm --network host mysql:8.0 mysql -N -B -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_ROOT_USER" "-p$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "$1"
  else
    docker exec -i "$CONTAINER_NAME" mysql -N -B -u"$MYSQL_ROOT_USER" "-p$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "$1"
  fi
}

wait_for_mysql() {
  local elapsed=0
  while true; do
    if [ -n "$MYSQL_HOST" ]; then
      if docker run --rm --network host mysql:8.0 mysql -N -B -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_ROOT_USER" "-p$MYSQL_ROOT_PASSWORD" -e 'SELECT 1' >/dev/null 2>&1; then
        return 0
      fi
    elif docker exec "$CONTAINER_NAME" mysql -N -B -u"$MYSQL_ROOT_USER" "-p$MYSQL_ROOT_PASSWORD" -e 'SELECT 1' >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
    elapsed=$((elapsed + 2))
    if [ "$elapsed" -ge "$WAIT_SECONDS" ]; then
      echo "❌ MySQL no respondió en ${WAIT_SECONDS}s" >&2
      return 1
    fi
  done
}

apply_sql_file() {
  local file="$1"
  echo "▶️  Aplicando $(basename "$file")"
  mysql_exec < "$file"
}

assert_equals() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" != "$expected" ]; then
    echo "❌ ${label}: esperado=${expected} actual=${actual}" >&2
    return 1
  fi
  echo "✅ ${label}: ${actual}"
}

main() {
  if [ -z "$MYSQL_HOST" ] && [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Define MYSQL_CONTAINER o MYSQL_HOST para conectar a MySQL" >&2
    return 1
  fi

  if [ -z "$MYSQL_HOST" ] && ! docker ps --format '{{.Names}}' | grep -Fx "$CONTAINER_NAME" >/dev/null; then
    echo "❌ No existe un contenedor Docker activo llamado $CONTAINER_NAME" >&2
    return 1
  fi

  wait_for_mysql

  for migration in \
    "$SCRIPT_DIR/migrations/000_playflow_seed.sql" \
    "$SCRIPT_DIR/migrations/007_lineup_roster_refactor.sql"
  do
    apply_sql_file "$migration"
  done

  local null_roster_count
  null_roster_count="$(mysql_query "SELECT COUNT(*) FROM game_lineups WHERE roster_id IS NULL;")"
  assert_equals "Lineups sin roster_id tras 007" "0" "$null_roster_count"

  local active_lookup_index
  active_lookup_index="$(mysql_query "SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'game_lineups' AND INDEX_NAME = 'idx_game_lineups_active_lookup';")"
  assert_equals "Índice idx_game_lineups_active_lookup" "1" "$active_lookup_index"

  local substituted_by_index
  substituted_by_index="$(mysql_query "SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'game_lineups' AND INDEX_NAME = 'idx_game_lineups_substituted_by_roster';")"
  assert_equals "Índice idx_game_lineups_substituted_by_roster" "1" "$substituted_by_index"

  local roster_fk
  roster_fk="$(mysql_query "SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'game_lineups' AND CONSTRAINT_NAME = 'fk_game_lineups_roster_id';")"
  assert_equals "FK fk_game_lineups_roster_id" "1" "$roster_fk"

  local courtesy_fk
  courtesy_fk="$(mysql_query "SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'game_lineups' AND CONSTRAINT_NAME = 'fk_game_lineups_courtesy_running_for_roster_id';")"
  assert_equals "FK fk_game_lineups_courtesy_running_for_roster_id" "1" "$courtesy_fk"

  local substituted_by_fk
  substituted_by_fk="$(mysql_query "SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'game_lineups' AND CONSTRAINT_NAME = 'fk_game_lineups_substituted_by_roster_id';")"
  assert_equals "FK fk_game_lineups_substituted_by_roster_id" "1" "$substituted_by_fk"

  apply_sql_file "$SCRIPT_DIR/ROLLBACK_007.sql"

  local rollback_column
  rollback_column="$(mysql_query "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'game_lineups' AND COLUMN_NAME = 'substituted_by_roster_id';")"
  assert_equals "Columna substituted_by_roster_id tras rollback" "0" "$rollback_column"

  local rollback_backup
  rollback_backup="$(mysql_query "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'migration_007_lineup_roster_backup';")"
  assert_equals "Tabla backup migration_007 tras rollback" "0" "$rollback_backup"

  local rollback_active_lookup
  rollback_active_lookup="$(mysql_query "SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'game_lineups' AND INDEX_NAME = 'idx_game_lineups_active_lookup';")"
  assert_equals "Índice idx_game_lineups_active_lookup tras rollback" "0" "$rollback_active_lookup"

  local restored_null_roster_count
  restored_null_roster_count="$(mysql_query "SELECT COUNT(*) FROM game_lineups WHERE roster_id IS NULL;")"
  assert_equals "Lineups restaurados sin roster_id tras rollback" "19" "$restored_null_roster_count"

  echo "✅ Validación completa de migration 007 + rollback"
}

main "$@"
