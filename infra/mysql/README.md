Levanta MySQL 8 local aislado para validar migraciones:
`docker run --name playflow-db-p5-robinson -e MYSQL_ROOT_PASSWORD=root_password -e MYSQL_DATABASE=playflow_db -p 3307:3306 -d mysql:8.0`

Valida la migration 007 + rollback:
`MYSQL_CONTAINER=playflow-db-p5-robinson MYSQL_DATABASE=playflow_db MYSQL_ROOT_PASSWORD=root_password bash infra/mysql/validate-migration-007.sh`

Nota: esta validación usa el baseline `000_playflow_seed.sql` + `007_lineup_roster_refactor.sql`, que es el mínimo necesario para probar el refactor de lineups sin depender de migraciones no relacionadas.

Limpia el contenedor cuando termines:
`docker rm -f playflow-db-p5-robinson`
