Levanta MySQL 8 local con Docker: `docker run --name mineros-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=mineros_broadcast -p 3306:3306 -d mysql:8.0`.
Aplica el schema: `docker exec -i mineros-mysql mysql -uroot -proot mineros_broadcast < infra/mysql/migrations/001_initial_schema.sql`.
Carga datos demo: `docker exec -i mineros-mysql mysql -uroot -proot mineros_broadcast < infra/mysql/migrations/002_demo_seed.sql`.
Verifica tablas: `docker exec -it mineros-mysql mysql -uroot -proot -e "USE mineros_broadcast; SHOW TABLES;"`.
