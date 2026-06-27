-- PlayFlow — Seed completo (schema actual + datos de referencia)
-- UTF-8: utf8mb4_unicode_ci | MySQL 8.0
-- Schema: todas las tablas (incluye columnas de migraciones 001-019)
-- Datos: tablas de referencia (excluye at_bats, pitches, broadcast_sessions, game_events, baserunning_events, operator_actions, sponsor_impressions)
-- Para regenerar: pnpm db:backup (sin -v), luego reemplazar este archivo con el dump
-- MySQL dump 10.13  Distrib 8.0.46, for Linux (aarch64)
--
-- Host: localhost    Database: playflow_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `associations`
--

DROP TABLE IF EXISTS `associations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `associations` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country_code` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sport_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `at_bats`
--

DROP TABLE IF EXISTS `at_bats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `at_bats` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `game_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batter_roster_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batter_player_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pitcher_roster_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pitcher_player_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inning` int NOT NULL,
  `inning_half` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rbi` int NOT NULL DEFAULT '0',
  `runs` int NOT NULL DEFAULT '0',
  `on_base` tinyint(1) NOT NULL DEFAULT '0',
  `pitch_count` int DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `contact_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hit_direction` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timestamp` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `event_type` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'vocabulario MLBAM: single|double|triple|home_run|strikeout|walk|field_out|...',
  `runners` json DEFAULT NULL COMMENT 'array [{runnerId,from,to,earned,outNumber,responsiblePitcherId}]',
  `hit_data` json DEFAULT NULL COMMENT 'MLBAM hitData: {type, hardness, coordinates:{coordX,coordY}}',
  `outs_before` tinyint(1) DEFAULT NULL COMMENT 'outs al inicio del at-bat',
  `score_home` int DEFAULT NULL COMMENT 'marcador local al inicio del at-bat',
  `score_away` int DEFAULT NULL COMMENT 'marcador visitante al inicio del at-bat',
  `video_timestamp` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'timecode del stream HH:MM:SS.mmm',
  `batting_team_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'equipo al bate â€” FK implÃ­cita a teams.id (MLBAM: battingTeam)',
  `ext` json DEFAULT NULL COMMENT 'PFX: PlayFlow eXtension â€” {playflow:{notes,onBase}}',
  PRIMARY KEY (`id`),
  KEY `idx_at_bats_game` (`game_id`),
  KEY `idx_at_bats_inning` (`game_id`,`inning`,`inning_half`),
  KEY `idx_at_bats_batter` (`batter_player_id`),
  KEY `idx_pitcher_player_id` (`pitcher_player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `baserunning_events`
--

DROP TABLE IF EXISTS `baserunning_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `baserunning_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `game_id` varchar(100) NOT NULL,
  `inning` int NOT NULL,
  `inning_half` varchar(10) NOT NULL,
  `event_type` varchar(30) NOT NULL,
  `player_id` varchar(36) DEFAULT NULL,
  `responsible_pitcher_id` varchar(100) DEFAULT NULL COMMENT 'player_id del lanzador responsable (para carrera limpia/sucia)',
  `scoring_team_id` varchar(100) DEFAULT NULL COMMENT 'team_id del equipo que anoto (cuando run_scored=1)',
  `ext` json DEFAULT NULL COMMENT 'PFX: PlayFlow eXtension â€” {playflow:{fielderPos}}',
  `from_base` varchar(5) NOT NULL,
  `to_base` varchar(5) NOT NULL,
  `run_scored` tinyint(1) NOT NULL DEFAULT '0',
  `earned_run` tinyint(1) NOT NULL DEFAULT '1',
  `fielder_pos` tinyint DEFAULT NULL,
  `operator_id` varchar(100) DEFAULT NULL,
  `timestamp` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `outs_before` tinyint(1) DEFAULT NULL COMMENT 'outs al momento del evento',
  `video_timestamp` varchar(30) DEFAULT NULL COMMENT 'timecode del stream HH:MM:SS.mmm',
  PRIMARY KEY (`id`),
  KEY `idx_br_game` (`game_id`),
  KEY `idx_br_inning` (`game_id`,`inning`,`inning_half`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `broadcast_sessions`
--

DROP TABLE IF EXISTS `broadcast_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `broadcast_sessions` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `game_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state_json` json NOT NULL DEFAULT (_latin1'{}'),
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_game_id` (`game_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaign_sponsors`
--

DROP TABLE IF EXISTS `campaign_sponsors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaign_sponsors` (
  `campaign_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sponsor_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`campaign_id`,`sponsor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaigns` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `placements` json NOT NULL DEFAULT (_latin1'[]'),
  `start_date` datetime(3) DEFAULT NULL,
  `end_date` datetime(3) DEFAULT NULL,
  `rules` json NOT NULL DEFAULT (_latin1'{}'),
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sport_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `age_min` tinyint unsigned DEFAULT NULL COMMENT 'Edad mínima inclusive',
  `age_max` tinyint unsigned DEFAULT NULL COMMENT 'Edad máxima inclusive',
  PRIMARY KEY (`id`),
  KEY `idx_categories_sport_id` (`sport_id`),
  KEY `idx_categories_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clubs`
--

DROP TABLE IF EXISTS `clubs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clubs` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country_code` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_asset_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `federated` tinyint(1) NOT NULL DEFAULT '0',
  `association_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_club_association` (`association_id`),
  CONSTRAINT `fk_club_association` FOREIGN KEY (`association_id`) REFERENCES `associations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `coaching_staff`
--

DROP TABLE IF EXISTS `coaching_staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coaching_staff` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `team_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tournament_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'manager|coach_bateo|coach_bases|pitcher_coach|utilero|otro',
  `photo_asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_coaching_staff_team_id` (`team_id`),
  KEY `idx_coaching_staff_tournament_id` (`tournament_id`),
  KEY `idx_coaching_staff_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_events`
--

DROP TABLE IF EXISTS `game_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_events` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `game_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'pitch|batted_ball|out|run|substitution|...',
  `at_bat_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inning` int NOT NULL,
  `inning_half` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batter_player_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pitcher_player_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload` json NOT NULL DEFAULT (_latin1'{}') COMMENT 'datos especÃ­ficos del evento (zona, secuencia out, tipo hit, etc.)',
  `operator_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `outs_before` tinyint(1) DEFAULT NULL COMMENT 'outs al momento del evento',
  `score_home` int DEFAULT NULL COMMENT 'marcador local al momento del evento',
  `score_away` int DEFAULT NULL COMMENT 'marcador visitante al momento del evento',
  `video_timestamp` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'timecode del stream HH:MM:SS.mmm',
  PRIMARY KEY (`id`),
  KEY `idx_game_events_game_id` (`game_id`),
  KEY `idx_game_events_game_inning_half` (`game_id`,`inning`,`inning_half`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_layouts`
--

DROP TABLE IF EXISTS `game_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_layouts` (
  `game_id` varchar(255) NOT NULL,
  `layout_id` char(36) NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`game_id`),
  KEY `layout_id` (`layout_id`),
  CONSTRAINT `game_layouts_ibfk_1` FOREIGN KEY (`layout_id`) REFERENCES `layouts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_lineups`
--

DROP TABLE IF EXISTS `game_lineups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_lineups` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `game_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `player_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `roster_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batting_order` int NOT NULL,
  `position` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `defensive_position` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Posicion defensiva en campo',
  `is_starter` tinyint(1) NOT NULL DEFAULT '1',
  `is_dp` tinyint(1) NOT NULL DEFAULT '0',
  `is_flex` tinyint(1) NOT NULL DEFAULT '0',
  `re_entry_used` tinyint(1) NOT NULL DEFAULT '0',
  `courtesy_running_for_roster_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `substituted_at` datetime(3) DEFAULT NULL,
  `substituted_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_game_lineups_game_id` (`game_id`),
  KEY `idx_game_lineups_team_id` (`team_id`),
  KEY `idx_game_lineups_roster` (`roster_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `games`
--

DROP TABLE IF EXISTS `games`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `games` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tournament_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `home_team_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `away_team_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `game_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nombre personalizado del partido',
  `game_type` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'MLBAM game type: R=Regular | P=Playoffs | S=Spring | A=All-Star | E=Exhibition',
  `series_description` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'DescripciÃ³n de la serie: Regular Season | Playoffs | etc.',
  `games_in_series` tinyint unsigned DEFAULT NULL COMMENT 'NÃºmero total de juegos en la serie',
  `double_header` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'S' COMMENT 'MLBAM double header: S=ninguno | Y=primer juego | Z=segundo juego',
  `weather` json DEFAULT NULL COMMENT 'Condiciones climÃ¡ticas MLBAM: {condition, temp, wind}',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduled',
  `scheduled_at` datetime(3) NOT NULL,
  `started_at` datetime(3) DEFAULT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `venue_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'FK a venues.id â€” reemplaza el campo venue VARCHAR libre',
  `season` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `game_number` int DEFAULT NULL,
  `final_score` json DEFAULT NULL,
  `game_state` json DEFAULT NULL,
  `rules_override` json DEFAULT NULL COMMENT 'GameRules que sobreescribe el torneo para este partido',
  `ext` json DEFAULT NULL COMMENT 'PFX: PlayFlow eXtension â€” campos no-estÃ¡ndar {playflow:{gameName,category,rulesOverride,gameState}}',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_games_tournament` (`tournament_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `layouts`
--

DROP TABLE IF EXISTS `layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `layouts` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `zones` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leagues`
--

DROP TABLE IF EXISTS `leagues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leagues` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sport_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DO',
  `level` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banner_asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `mlbam_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID de la liga en MLB Stats API',
  `wbsc_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID de la liga en WBSC',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_leagues_sport_id` (`sport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `operator_actions`
--

DROP TABLE IF EXISTS `operator_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `operator_actions` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `game_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `overlay_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload` json NOT NULL DEFAULT (_latin1'{}'),
  `result` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_operator_actions_game_id` (`game_id`),
  KEY `idx_operator_actions_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `overlay_configs`
--

DROP TABLE IF EXISTS `overlay_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `overlay_configs` (
  `overlay_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_variant` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auto_hide_ms` int DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '50',
  `preferred_zone` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `config` json NOT NULL DEFAULT (_latin1'{}'),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`overlay_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pitches`
--

DROP TABLE IF EXISTS `pitches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pitches` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `game_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `at_bat_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pitcher_player_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batter_player_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pitch_num` int NOT NULL COMMENT 'secuencia dentro del at-bat',
  `umpire_call` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `inning` int NOT NULL,
  `inning_half` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `operator_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `plate_x` decimal(7,4) DEFAULT NULL COMMENT 'metros desde centro del plato (izq negativo, der positivo)',
  `plate_z` decimal(7,4) DEFAULT NULL COMMENT 'metros desde el suelo',
  `zone` tinyint unsigned DEFAULT NULL COMMENT '1-9 zona strike, 11-14 zona bola (MLBAM)',
  `sz_top` decimal(5,4) DEFAULT NULL COMMENT 'tope de zona de strike en metros (se mide por bateador)',
  `sz_bottom` decimal(5,4) DEFAULT NULL COMMENT 'fondo de zona de strike en metros',
  `pfx_x` decimal(6,2) DEFAULT NULL COMMENT 'movimiento horizontal en cm vs lanzamiento sin efecto',
  `pfx_z` decimal(6,2) DEFAULT NULL COMMENT 'movimiento vertical en cm vs lanzamiento sin efecto',
  `start_speed` decimal(6,2) DEFAULT NULL COMMENT 'velocidad de salida en km/h',
  `end_speed` decimal(6,2) DEFAULT NULL COMMENT 'velocidad al llegar al plato en km/h',
  `spin_rate` smallint unsigned DEFAULT NULL COMMENT 'revoluciones por minuto (rpm)',
  `spin_axis` smallint unsigned DEFAULT NULL COMMENT 'eje de rotaciÃ³n en grados (0-360)',
  `pitch_class` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'cÃ³digo MLBAM/WBSC: FF SI FC SL CU CH RB DB DR DC KN EP SC',
  `confidence` decimal(4,3) DEFAULT NULL COMMENT 'confianza de clasificaciÃ³n del dispositivo (0.000-1.000)',
  `ext` json DEFAULT NULL COMMENT 'PFX: PlayFlow eXtension â€” {playflow:{catcherTarget,operatorId,note}}',
  `device_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'identificador del dispositivo que generÃ³ los datos',
  `outs_before` tinyint(1) DEFAULT NULL COMMENT 'outs al momento del lanzamiento',
  PRIMARY KEY (`id`),
  KEY `idx_pitches_game_id` (`game_id`),
  KEY `idx_pitches_at_bat_id` (`at_bat_id`),
  KEY `idx_pitches_game_pitcher` (`game_id`,`pitcher_player_id`),
  KEY `idx_pitches_game_inning` (`game_id`,`inning`,`inning_half`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `players`
--

DROP TABLE IF EXISTS `players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `players` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bats` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `throws` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo_asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo_action_asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stats` json NOT NULL DEFAULT (_latin1'{}'),
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `date_of_birth` date DEFAULT NULL,
  `nationality` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'DO',
  `gender` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'male',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `mlbam_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID en MLB Stats API (jugadores de referencia MLB)',
  `wbsc_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID en WBSC (torneos internacionales)',
  `ext_ref` json DEFAULT NULL COMMENT 'referencias externas adicionales {fuente: id}',
  PRIMARY KEY (`id`),
  KEY `idx_players_team_id` (`team_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rosters`
--

DROP TABLE IF EXISTS `rosters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rosters` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `tournament_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `player_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `number` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batting_slot` int DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `is_dp` tinyint(1) NOT NULL DEFAULT '0',
  `is_flex` tinyint(1) NOT NULL DEFAULT '0',
  `re_entry_used` tinyint(1) NOT NULL DEFAULT '0',
  `joined_date` date DEFAULT NULL,
  `left_date` date DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roster` (`tournament_id`,`team_id`,`player_id`),
  KEY `idx_roster_tournament` (`tournament_id`),
  KEY `idx_roster_team` (`team_id`),
  KEY `idx_roster_player` (`player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sponsor_impressions`
--

DROP TABLE IF EXISTS `sponsor_impressions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sponsor_impressions` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `sponsor_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `campaign_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `game_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `placement` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `zone_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scene_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trigger` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ended_at` datetime(3) DEFAULT NULL,
  `duration_seconds` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sponsor_impressions_game_id` (`game_id`),
  KEY `idx_sponsor_impressions_sponsor_id` (`sponsor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sponsors`
--

DROP TABLE IF EXISTS `sponsors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sponsors` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `priority` int NOT NULL DEFAULT '50',
  `weight` int NOT NULL DEFAULT '10',
  `allowed_placements` json NOT NULL DEFAULT (_latin1'[]'),
  `start_date` datetime(3) DEFAULT NULL,
  `end_date` datetime(3) DEFAULT NULL,
  `exposure_limits` json NOT NULL DEFAULT (_latin1'{}'),
  `blackout_rules` json NOT NULL DEFAULT (_latin1'[]'),
  `metadata` json NOT NULL DEFAULT (_latin1'{}'),
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sports`
--

DROP TABLE IF EXISTS `sports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sports` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mixed',
  `has_pitcher` tinyint(1) NOT NULL DEFAULT '1',
  `default_rules` json NOT NULL COMMENT 'GameRules JSON template base',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `standings`
--

DROP TABLE IF EXISTS `standings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `standings` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `tournament_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `JG` int NOT NULL DEFAULT '0',
  `JP` int NOT NULL DEFAULT '0',
  `JE` int NOT NULL DEFAULT '0',
  `PCT` decimal(5,3) NOT NULL DEFAULT '0.000',
  `RA` int NOT NULL DEFAULT '0',
  `RC` int NOT NULL DEFAULT '0',
  `Dif` int NOT NULL DEFAULT '0',
  `GB` decimal(4,1) DEFAULT NULL COMMENT 'Games Behind el lider',
  `streak` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Racha: W{n}=ganando, L{n}=perdiendo',
  `L10` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Record ultimos 10 partidos ej: 7-3',
  `home_record` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Record de local ej: 12-5',
  `away_record` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Record de visitante ej: 8-9',
  `elimination_number` smallint DEFAULT NULL COMMENT 'Numero de eliminacion',
  `magic_number` smallint DEFAULT NULL COMMENT 'Numero magico del lider para ganar la serie',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_standings_tournament_group_team` (`tournament_id`,`group_id`,`team_id`),
  KEY `idx_standings_tournament_group` (`tournament_id`,`group_id`),
  KEY `idx_standings_team_id` (`team_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `team_categories`
--

DROP TABLE IF EXISTS `team_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_categories` (
  `team_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`team_id`,`category_id`),
  KEY `idx_team_categories_category_id` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `abbreviation` varchar(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_wordmark_asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_alternate_asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'DO',
  `club_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_color` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secondary_color` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `founded_year` int DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `mlbam_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID del equipo en MLB Stats API',
  `wbsc_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID del equipo en WBSC (torneos internacionales)',
  `ext_ref` json DEFAULT NULL COMMENT 'Referencias externas adicionales {fuente: id}',
  `team_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'CÃ³digo de transmisiÃ³n MLBAM fileCode: ej. "min", "rot" (lowercase)',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_team_club` (`club_id`),
  CONSTRAINT `fk_team_club` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tournament_group_teams`
--

DROP TABLE IF EXISTS `tournament_group_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_group_teams` (
  `group_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `seeding` int DEFAULT NULL,
  PRIMARY KEY (`group_id`,`team_id`),
  KEY `idx_tournament_group_teams_team_id` (`team_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tournament_groups`
--

DROP TABLE IF EXISTS `tournament_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_groups` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `tournament_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_num` int NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tournament_groups_tournament_id` (`tournament_id`),
  KEY `idx_tournament_groups_order_num` (`tournament_id`,`order_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tournament_teams`
--

DROP TABLE IF EXISTS `tournament_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_teams` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `tournament_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `seeding` int DEFAULT NULL,
  `eliminated` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tt` (`tournament_id`,`team_id`),
  KEY `idx_tt_tournament` (`tournament_id`),
  KEY `idx_tt_team` (`team_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tournaments`
--

DROP TABLE IF EXISTS `tournaments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournaments` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `league_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `season` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `rules` json DEFAULT NULL COMMENT 'GameRules que sobreescribe el sport default',
  `logo_asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banner_asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trophy_asset_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'upcoming',
  `mlbam_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID en MLB Stats API',
  `wbsc_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID en WBSC',
  `ext_ref` json DEFAULT NULL COMMENT 'Referencias externas {fuente:id}',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `structure_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'round_robin' COMMENT 'round_robin|single_elimination|double_elimination|group_stage|exhibition',
  `num_rounds` int DEFAULT '1' COMMENT 'a cuantas vueltas',
  `has_playoffs` tinyint(1) NOT NULL DEFAULT '0',
  `playoff_format` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'semifinal_final|quarterfinal_semi_final',
  PRIMARY KEY (`id`),
  KEY `idx_tournaments_league_id` (`league_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `venues`
--

DROP TABLE IF EXISTS `venues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venues` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo_asset_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line2` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state_province` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country_code` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_place_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-27  5:47:01

-- ─── Datos de referencia ────────────────────────────────────────────────────
-- MySQL dump 10.13  Distrib 8.0.46, for Linux (aarch64)
--
-- Host: localhost    Database: playflow_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `associations`
--

LOCK TABLES `associations` WRITE;
/*!40000 ALTER TABLE `associations` DISABLE KEYS */;
/*!40000 ALTER TABLE `associations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `campaigns`
--

LOCK TABLES `campaigns` WRITE;
/*!40000 ALTER TABLE `campaigns` DISABLE KEYS */;
INSERT INTO `campaigns` (`id`, `name`, `status`, `placements`, `start_date`, `end_date`, `rules`, `created_at`, `updated_at`) VALUES ('campaign-exhibicion-2026','Exhibición Softball 2026','active','[\"scorebug\", \"ticker\", \"sponsor_overlay\", \"summary\", \"lineup\"]','2026-01-01 00:00:00.000','2026-12-31 00:00:00.000','{\"rotationMode\": \"weighted\", \"allowBetweenInnings\": true, \"allowDuringLivePlay\": false, \"maxConsecutiveForSameSponsor\": 2}','2026-06-25 01:27:20.150','2026-06-27 05:46:05.385');
/*!40000 ALTER TABLE `campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `campaign_sponsors`
--

LOCK TABLES `campaign_sponsors` WRITE;
/*!40000 ALTER TABLE `campaign_sponsors` DISABLE KEYS */;
INSERT INTO `campaign_sponsors` (`campaign_id`, `sponsor_id`) VALUES ('campaign-exhibicion-2026','sponsor-agua-yaque');
INSERT INTO `campaign_sponsors` (`campaign_id`, `sponsor_id`) VALUES ('campaign-exhibicion-2026','sponsor-cafe-cibao');
/*!40000 ALTER TABLE `campaign_sponsors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-b5-adulto','baseball5','Adulto Beisbol5','Béisbol5 Adulto',1,'2026-06-25 19:12:06.959',18,NULL);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-b5-sub14','baseball5','Sub-14','Béisbol5 Sub-14',1,'2026-06-25 19:12:06.959',NULL,14);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-b5-sub17','baseball5','Sub-17','Béisbol5 Sub-17',1,'2026-06-25 19:12:06.959',NULL,17);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-bf-adulto','baseball_f','Adulto Béisbol Femenino','Béisbol Federado Femenino Adulto',1,'2026-06-25 19:12:06.959',18,NULL);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-bf-master','baseball_f','Máster Béisbol Femenino','Béisbol Federado Femenino Máster',1,'2026-06-25 19:12:06.959',35,NULL);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-bf-sub15','baseball_f','Sub-15','Béisbol Federado Femenino Sub-15',1,'2026-06-25 19:12:06.959',NULL,15);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-bf-sub18','baseball_f','Sub-18','Béisbol Federado Femenino Sub-18',1,'2026-06-25 19:12:06.959',NULL,18);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-bf-sub23','baseball_f','Sub-23','Béisbol Federado Femenino Sub-23',1,'2026-06-25 19:12:06.959',NULL,23);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-bm-adulto','baseball_m','Adulto Béisbol Masculino','Béisbol Federado Masculino Adulto',1,'2026-06-25 19:12:06.959',18,NULL);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-bm-master','baseball_m','Máster Béisbol Masculino','Béisbol Federado Masculino Máster',1,'2026-06-25 19:12:06.959',35,NULL);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-bm-sub15','baseball_m','Sub-15','Béisbol Federado Masculino Sub-15',1,'2026-06-25 19:12:06.959',NULL,15);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-bm-sub18','baseball_m','Sub-18','Béisbol Federado Masculino Sub-18',1,'2026-06-25 19:12:06.959',NULL,18);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-bm-sub23','baseball_m','Sub-23','Béisbol Federado Masculino Sub-23',1,'2026-06-25 19:12:06.959',NULL,23);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-sf-adulto','softball_fast_f','Adulto Softball Femenino','Softball Federado Femenino Adulto',1,'2026-06-25 19:12:06.959',18,NULL);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-sf-master','softball_fast_f','Máster Softball Femenino','Softball Federado Femenino Máster',1,'2026-06-25 19:12:06.959',35,NULL);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-sf-sub15','softball_fast_f','Sub-15','Softball Federado Femenino Sub-15',1,'2026-06-25 19:12:06.959',NULL,15);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-sf-sub18','softball_fast_f','Sub-18','Softball Federado Femenino Sub-18',1,'2026-06-25 19:12:06.959',NULL,18);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-sf-sub23','softball_fast_f','Sub-23','Softball Federado Femenino Sub-23',1,'2026-06-25 19:12:06.959',NULL,23);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-sm-adulto','softball_fast_m','Adulto Softball Masculino','Softball Federado Masculino Adulto',1,'2026-06-25 19:12:06.959',18,NULL);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-sm-master','softball_fast_m','Máster Softball Msculino','Softball Federado Masculino Máster',1,'2026-06-25 19:12:06.959',35,NULL);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-sm-sub15','softball_fast_m','Sub-15','Softball Federado Masculino Sub-15',1,'2026-06-25 19:12:06.959',NULL,15);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-sm-sub18','softball_fast_m','Sub-18','Softball Federado Masculino Sub-18',1,'2026-06-25 19:12:06.959',NULL,18);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-fed-sm-sub23','softball_fast_m','Sub-23','Softball Federado Masculino Sub-23',1,'2026-06-25 19:12:06.959',NULL,23);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pb-intermediate','baseball_m','Intermediate 50/70','División Intermediate (50/70), 11-13 años',1,'2026-06-25 19:21:20.548',11,13);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pb-junior','baseball_m','Junior','División Junior, 13-14 años',1,'2026-06-25 19:12:06.959',12,14);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pb-menor','baseball_m','Infantil','División Infantil (Pequeñas Ligas), 11-12 años',1,'2026-06-25 19:12:06.959',11,12);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pb-novato','baseball_m','Pitoco','División Pitoco (Novato), 7-8 años',1,'2026-06-25 19:12:06.959',7,8);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pb-rookies','baseball_m','Pre-Infantil','División Pre-Infantil (Rookies), 9-10 años',1,'2026-06-25 19:21:20.548',9,10);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pb-senior','baseball_m','Senior','División Senior, 15-16 años',1,'2026-06-25 19:12:06.959',13,16);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pb-tball','baseball_m','T-Ball','Iniciación, 4-6 años',1,'2026-06-25 19:12:06.959',4,6);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pony-colt','baseball_m','Colt','Pony League, 15-16 años',1,'2026-06-25 19:12:06.959',15,16);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pony-palomino','baseball_m','Palomino','Pony League, 17-18 años',1,'2026-06-25 19:12:06.959',17,18);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pony-pony','baseball_m','Pony','Pony League, 13-14 años',1,'2026-06-25 19:12:06.959',13,14);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pony-shetland','baseball_m','Shetland','Pony League, 5-6 años',1,'2026-06-25 19:12:06.959',5,6);
INSERT INTO `categories` (`id`, `sport_id`, `name`, `description`, `active`, `created_at`, `age_min`, `age_max`) VALUES ('cat-pony-thorobred','baseball_m','Thorobred','Pony League, 19-22 años',1,'2026-06-25 19:12:06.959',19,22);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `clubs`
--

LOCK TABLES `clubs` WRITE;
/*!40000 ALTER TABLE `clubs` DISABLE KEYS */;
/*!40000 ALTER TABLE `clubs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `coaching_staff`
--

LOCK TABLES `coaching_staff` WRITE;
/*!40000 ALTER TABLE `coaching_staff` DISABLE KEYS */;
INSERT INTO `coaching_staff` (`id`, `team_id`, `tournament_id`, `name`, `role`, `photo_asset_id`, `active`, `created_at`, `updated_at`) VALUES ('006ffded-f2a4-4532-b5fe-2db5d8c50a52','team-guerreras',NULL,'Amandito','manager',NULL,1,'2026-06-26 01:20:55.973','2026-06-26 01:20:55.973');
/*!40000 ALTER TABLE `coaching_staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `game_layouts`
--

LOCK TABLES `game_layouts` WRITE;
/*!40000 ALTER TABLE `game_layouts` DISABLE KEYS */;
INSERT INTO `game_layouts` (`game_id`, `layout_id`, `assigned_at`) VALUES ('game-gue-vs-chi-20260611','863a0e57-388b-45f5-8ba0-e7ae651b0297','2026-06-25 08:49:48');
/*!40000 ALTER TABLE `game_layouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `game_lineups`
--

LOCK TABLES `game_lineups` WRITE;
/*!40000 ALTER TABLE `game_lineups` DISABLE KEYS */;
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('02715ccc-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-guerreras','player-gue-01',NULL,1,'LF','LF',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.175');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('02715d99-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-guerreras','player-gue-02',NULL,2,'1B','1B',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.175');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('02715e2a-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-guerreras','player-gue-03',NULL,3,'3B','3B',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.175');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('02715e7c-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-guerreras','player-gue-05',NULL,4,'CF','CF',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.175');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('02715ec7-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-guerreras','player-gue-06',NULL,5,'C','C',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.175');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('02715f15-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-guerreras','player-gue-07',NULL,6,'RF','RF',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.175');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('02715f58-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-guerreras','player-gue-08',NULL,7,'2B','2B',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.175');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('02715f96-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-guerreras','player-gue-09',NULL,8,'SS','SS',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.175');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('02715fd9-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-guerreras','player-gue-04',NULL,9,'P','P',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.175');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('0271a051-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-chile','player-chi-01',NULL,1,'1B','1B',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.177');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('0271a0f7-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-chile','player-chi-02',NULL,2,'DP',NULL,1,1,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.177');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('0271a143-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-chile','player-chi-03',NULL,3,'SS','SS',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.177');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('0271a189-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-chile','player-chi-06',NULL,4,'3B','3B',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.177');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('0271a1ce-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-chile','player-chi-07',NULL,5,'2B','2B',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.177');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('0271a214-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-chile','player-chi-08',NULL,6,'RF','RF',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.177');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('0271a254-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-chile','player-chi-10',NULL,7,'LF','LF',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.177');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('0271a295-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-chile','player-chi-11',NULL,8,'CF','CF',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.177');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('0271a2d6-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-chile','player-chi-12',NULL,9,'C','C',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.177');
INSERT INTO `game_lineups` (`id`, `game_id`, `team_id`, `player_id`, `roster_id`, `batting_order`, `position`, `defensive_position`, `is_starter`, `is_dp`, `is_flex`, `re_entry_used`, `courtesy_running_for_roster_id`, `substituted_at`, `substituted_by`, `created_at`) VALUES ('0271a316-7035-11f1-ba8f-8e6f87d63acf','game-gue-vs-chi-20260611','team-chile','player-chi-09',NULL,10,'P','P',1,0,0,0,NULL,NULL,NULL,'2026-06-25 01:27:20.177');
/*!40000 ALTER TABLE `game_lineups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `games`
--

LOCK TABLES `games` WRITE;
/*!40000 ALTER TABLE `games` DISABLE KEYS */;
INSERT INTO `games` (`id`, `tournament_id`, `category_id`, `home_team_id`, `away_team_id`, `game_name`, `game_type`, `series_description`, `games_in_series`, `double_header`, `weather`, `status`, `scheduled_at`, `started_at`, `finished_at`, `venue_id`, `season`, `game_number`, `final_score`, `game_state`, `rules_override`, `ext`, `created_at`, `updated_at`) VALUES ('game-123eb8f3-8d38-4fc3-aa7e-55d61e1c75d7',NULL,NULL,'team-chile','team-guerreras','Team Chile vs Guerreras','R',NULL,NULL,'S',NULL,'live','2026-07-10 00:00:00.000',NULL,NULL,'venue-penaloen',NULL,NULL,NULL,NULL,NULL,'{\"playflow\": {\"gameName\": \"Team Chile vs Guerreras\", \"gameState\": {}, \"rulesOverride\": {}}}','2026-06-26 01:05:57.626','2026-06-27 03:38:37.635');
INSERT INTO `games` (`id`, `tournament_id`, `category_id`, `home_team_id`, `away_team_id`, `game_name`, `game_type`, `series_description`, `games_in_series`, `double_header`, `weather`, `status`, `scheduled_at`, `started_at`, `finished_at`, `venue_id`, `season`, `game_number`, `final_score`, `game_state`, `rules_override`, `ext`, `created_at`, `updated_at`) VALUES ('game-gue-vs-chi-20260611','tournament-exhibicion-jun2026',NULL,'team-chile','team-guerreras','Guerreras vs Team Chile','R',NULL,NULL,'S',NULL,'completed','2026-06-20 00:00:00.000',NULL,NULL,'venue-penaloen','2026',NULL,NULL,NULL,NULL,'{\"playflow\": {\"gameName\": \"Guerreras vs Team Chile\", \"gameState\": {}, \"rulesOverride\": {}}}','2026-06-25 01:27:20.174','2026-06-27 03:38:37.635');
/*!40000 ALTER TABLE `games` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `layouts`
--

LOCK TABLES `layouts` WRITE;
/*!40000 ALTER TABLE `layouts` DISABLE KEYS */;
INSERT INTO `layouts` (`id`, `name`, `is_default`, `zones`, `created_at`, `updated_at`) VALUES ('863a0e57-388b-45f5-8ba0-e7ae651b0297','prueba 1',0,'{\"batter\": {\"x\": -20, \"y\": 42, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"lineup\": {\"x\": 424, \"y\": -48, \"width\": 1920, \"animIn\": \"slide_left\", \"height\": 1080, \"animOut\": \"slide_left_out\", \"visible\": true}, \"social\": {\"x\": 124, \"y\": 468, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"pitcher\": {\"x\": 822, \"y\": 36, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"scorebug\": {\"x\": -24, \"y\": 24, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"slide_down_out\", \"visible\": true}, \"countdown\": {\"x\": 854, \"y\": -792, \"width\": 1920, \"animIn\": \"fade_in\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"game-event\": {\"x\": 554, \"y\": -436, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"final-score\": {\"x\": 466, \"y\": -394, \"width\": 1920, \"animIn\": \"zoom_in\", \"height\": 1080, \"animOut\": \"zoom_out\", \"visible\": true}, \"announcement\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"next-batters\": {\"x\": 416, \"y\": -364, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"substitution\": {\"x\": 738, \"y\": 84, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"sponsor-break\": {\"x\": -30, \"y\": -796, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"inning-transition\": {\"x\": 358, \"y\": -348, \"width\": 1920, \"animIn\": \"fade_in\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}}','2026-06-25 07:50:57','2026-06-25 09:55:38');
INSERT INTO `layouts` (`id`, `name`, `is_default`, `zones`, `created_at`, `updated_at`) VALUES ('default-layout-001','Layout por defecto',1,'{\"batter\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"lineup\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"slide_left\", \"height\": 1080, \"animOut\": \"slide_left_out\", \"visible\": true}, \"social\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"pitcher\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"scorebug\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"slide_down_out\", \"visible\": true}, \"countdown\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"fade_in\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"game-event\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"final-score\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"zoom_in\", \"height\": 1080, \"animOut\": \"zoom_out\", \"visible\": true}, \"announcement\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"next-batters\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"substitution\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"sponsor-break\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"slide_up\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}, \"inning-transition\": {\"x\": 0, \"y\": 0, \"width\": 1920, \"animIn\": \"fade_in\", \"height\": 1080, \"animOut\": \"fade_out\", \"visible\": true}}','2026-06-25 04:18:53','2026-06-25 09:55:38');
/*!40000 ALTER TABLE `layouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `leagues`
--

LOCK TABLES `leagues` WRITE;
/*!40000 ALTER TABLE `leagues` DISABLE KEYS */;
INSERT INTO `leagues` (`id`, `sport_id`, `name`, `short_name`, `country`, `level`, `logo_asset_id`, `banner_asset_id`, `active`, `mlbam_id`, `wbsc_id`, `created_at`, `updated_at`) VALUES ('league-exhibicion-softball-cl','softball_fast','Exhibición Softball Femenino','EXHIB-SB','CL','exhibition',NULL,NULL,1,NULL,NULL,'2026-06-25 01:27:20.159','2026-06-25 18:14:39.015');
INSERT INTO `leagues` (`id`, `sport_id`, `name`, `short_name`, `country`, `level`, `logo_asset_id`, `banner_asset_id`, `active`, `mlbam_id`, `wbsc_id`, `created_at`, `updated_at`) VALUES ('Pequeñas Ligas Santiago Oriente-95066204-7ff2-45aa-bff4-37b526d61e44','baseball','Pequeñas Ligas Santiago Oriente','PLSO','CL',NULL,'leagues/plso-logo',NULL,1,NULL,NULL,'2026-06-26 03:02:35.346','2026-06-26 03:03:15.632');
/*!40000 ALTER TABLE `leagues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `overlay_configs`
--

LOCK TABLES `overlay_configs` WRITE;
/*!40000 ALTER TABLE `overlay_configs` DISABLE KEYS */;
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('announcement_overlay','default',10000,68,'zone-d','{\"requiresPreview\": true, \"allowManualDismiss\": true}','2026-06-25 01:27:20.146');
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('batter_overlay','compact',8000,80,'zone-c','{\"showHeadshot\": true, \"requiresPreview\": true, \"showSeasonStats\": true}','2026-06-25 01:27:20.146');
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('countdown_overlay','default',30000,72,'zone-f','{\"showSeconds\": true, \"requiresPreview\": true}','2026-06-25 01:27:20.146');
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('final_score_overlay','default',NULL,88,'zone-f','{\"requiresPreview\": true, \"persistentUntilHidden\": true}','2026-06-25 01:27:20.146');
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('game_event_overlay','highlight',6000,90,'zone-b','{\"allowForceShow\": true, \"requiresPreview\": false}','2026-06-25 01:27:20.146');
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('inning_transition_overlay','default',9000,75,'zone-f','{\"requiresPreview\": false, \"allowDuringLivePlay\": false}','2026-06-25 01:27:20.146');
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('lineup_overlay','full',12000,70,'zone-f','{\"requiresPreview\": true, \"allowSponsorSlot\": true}','2026-06-25 01:27:20.146');
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('next_batters_overlay','default',7000,65,'zone-c','{\"maxPlayers\": 3, \"requiresPreview\": true}','2026-06-25 01:27:20.146');
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('pitcher_overlay','default',8000,78,'zone-c','{\"showPitchCount\": true, \"requiresPreview\": true}','2026-06-25 01:27:20.146');
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('scorebug','default',NULL,100,'zone-a','{\"locked\": true, \"persistent\": true, \"showSponsorBadge\": true}','2026-06-25 01:27:20.146');
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('social_lower_third','default',10000,60,'zone-e','{\"requiresPreview\": true, \"hasTickerBehavior\": false}','2026-06-25 01:27:20.146');
INSERT INTO `overlay_configs` (`overlay_id`, `default_variant`, `auto_hide_ms`, `priority`, `preferred_zone`, `config`, `updated_at`) VALUES ('sponsor_break_overlay','full',15000,85,'zone-f','{\"commercial\": true, \"requiresPreview\": true}','2026-06-25 01:27:20.146');
/*!40000 ALTER TABLE `overlay_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `players`
--

LOCK TABLES `players` WRITE;
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-01','Constanza','Aguilera',NULL,'Constanza Aguilera','team-chile','3','1B','R','R','players/chi-p-01-constanza-aguilera',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 01:27:20.168',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-02','Florencia','Honorato',NULL,'Florencia Honorato','team-chile','5','DP','R','R','players/chi-p-02-florencia-honorato',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 01:27:20.168',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-03','Daniela','De Oliveira',NULL,'Daniela De Oliveira','team-chile','6','SS','R','R','players/chi-p-03-daniela-deoliveira',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 01:27:20.168',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-04','Vanessa','Adams',NULL,'Vanessa Adams','team-chile','11','Suplente','R','R','players/chi-p-04-vanessa-adams',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 01:27:20.168',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-05','Cecilia','Muñoz',NULL,'Cecilia Muñoz','team-chile','13','Suplente','R','R','players/chi-p-05-cecilia-munoz',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 02:44:27.688',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-06','Martina','Pellizaris',NULL,'Martina Pellizaris','team-chile','16','3B','R','R','players/chi-p-07-martina-pellizaris',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 02:59:29.373',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-07','Carolina','Jara',NULL,'Carolina Jara','team-chile','17','2B','R','R','players/chi-p-08-carolina-jara',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 02:59:29.375',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-08','Constanza','Espinoza',NULL,'Constanza Espinoza','team-chile','22','RF','R','R','players/chi-p-09-constanza-espinoza',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 02:59:29.376',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-09','Catalina','Guerra',NULL,'Catalina Guerra','team-chile','24','P','R','R','players/chi-p-10-catalina-guerra',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 02:59:29.377',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-10','Marianny','Mendez',NULL,'Marianny Mendez','team-chile','27','LF','R','R','players/chi-p-11-marianny-mendez',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 02:59:29.378',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-11','María','Mondeja',NULL,'María Mondeja','team-chile','42','CF','R','R','players/chi-p-12-maria-mondeja',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 02:59:29.382',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-chi-12','Barbara','Carrasco',NULL,'Barbara Carrasco','team-chile','14','C','R','R','players/chi-p-06-barbara-carrasco',NULL,'{}','active',NULL,'CL','female','2026-06-25 01:27:20.168','2026-06-25 02:59:29.371',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-gue-01','Angélica','González',NULL,'Angélica González','team-guerreras','20','LF','R','R','players/gue-p-01-angelica',NULL,'{}','active',NULL,'VE','female','2026-06-25 01:27:20.165','2026-06-25 02:44:12.191',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-gue-02','Mariela','Diaz',NULL,'Mariela Diaz','team-guerreras','21','1B','R','R','players/gue-p-02-mariela-diaz',NULL,'{}','active',NULL,'VE','female','2026-06-25 01:27:20.165','2026-06-25 01:27:20.165',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-gue-03','María','Gabriela',NULL,'María Gabriela','team-guerreras','22','3B','R','R','players/gue-p-03-maria-gabriela',NULL,'{}','active',NULL,'VE','female','2026-06-25 01:27:20.165','2026-06-25 02:44:18.564',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-gue-04','Jessica','Martínez',NULL,'Jessica Martínez','team-guerreras','23','P','R','R','players/gue-p-04-jessica',NULL,'{}','active',NULL,'VE','female','2026-06-25 01:27:20.165','2026-06-25 02:44:18.573',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-gue-05','Merly','Rodríguez',NULL,'Merly Rodríguez','team-guerreras','25','CF','R','R','players/gue-p-05-merly',NULL,'{}','active',NULL,'VE','female','2026-06-25 01:27:20.165','2026-06-25 02:44:18.567',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-gue-06','María','Mora',NULL,'María Mora','team-guerreras','26','C','R','R','players/gue-p-06-maria-mora',NULL,'{}','active',NULL,'VE','female','2026-06-25 01:27:20.165','2026-06-25 02:44:18.568',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-gue-07','Raquel','Hernández',NULL,'Raquel Hernández','team-guerreras','27','RF','R','R','players/gue-p-07-raquel',NULL,'{}','active',NULL,'VE','female','2026-06-25 01:27:20.165','2026-06-25 02:44:18.570',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-gue-08','Mariant','Reyes',NULL,'Mariant Reyes','team-guerreras','28','2B','R','R','players/gue-p-08-mariant-reyes',NULL,'{}','active',NULL,'VE','female','2026-06-25 01:27:20.165','2026-06-25 01:27:20.165',NULL,NULL,NULL);
INSERT INTO `players` (`id`, `first_name`, `last_name`, `nickname`, `name`, `team_id`, `number`, `position`, `bats`, `throws`, `photo_asset_id`, `photo_action_asset_id`, `stats`, `status`, `date_of_birth`, `nationality`, `gender`, `created_at`, `updated_at`, `mlbam_id`, `wbsc_id`, `ext_ref`) VALUES ('player-gue-09','Maoly','Talamonty',NULL,'Maoly Talamonty','team-guerreras','29','SS','R','R','players/gue-p-09-maoly-talamonty',NULL,'{}','active',NULL,'VE','female','2026-06-25 01:27:20.165','2026-06-25 01:27:20.165',NULL,NULL,NULL);
/*!40000 ALTER TABLE `players` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `rosters`
--

LOCK TABLES `rosters` WRITE;
/*!40000 ALTER TABLE `rosters` DISABLE KEYS */;
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('027084ed-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-guerreras','player-gue-01','20','LF',1,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.169','2026-06-25 01:27:20.169');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('02708653-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-guerreras','player-gue-02','21','1B',2,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.169','2026-06-25 01:27:20.169');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('02708766-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-guerreras','player-gue-03','22','3B',3,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.169','2026-06-25 01:27:20.169');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('02708837-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-guerreras','player-gue-04','23','P',9,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.169','2026-06-25 01:27:20.169');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('02708909-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-guerreras','player-gue-05','25','CF',4,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.169','2026-06-25 01:27:20.169');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('027089dc-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-guerreras','player-gue-06','26','C',5,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.169','2026-06-25 01:27:20.169');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('02708a99-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-guerreras','player-gue-07','27','RF',6,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.169','2026-06-25 01:27:20.169');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('02708b54-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-guerreras','player-gue-08','28','2B',7,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.169','2026-06-25 01:27:20.169');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('02708c16-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-guerreras','player-gue-09','29','SS',8,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.169','2026-06-25 01:27:20.169');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270c9bc-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-01','3','1B',1,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270cb30-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-02','5','DP',2,'active',1,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270cc10-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-03','6','SS',3,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270cce2-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-04','11','Suplente',NULL,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270cdb3-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-05','13','Suplente',NULL,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270ce82-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-06','16','3B',4,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270cf45-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-07','17','2B',5,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270d006-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-08','22','RF',6,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270d0ca-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-09','24','P',10,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270d192-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-10','27','LF',7,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270d255-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-11','42','CF',8,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
INSERT INTO `rosters` (`id`, `tournament_id`, `team_id`, `player_id`, `number`, `position`, `batting_slot`, `status`, `is_dp`, `is_flex`, `re_entry_used`, `joined_date`, `left_date`, `created_at`, `updated_at`) VALUES ('0270d316-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile','player-chi-12','14','C',9,'active',0,0,0,NULL,NULL,'2026-06-25 01:27:20.171','2026-06-25 01:27:20.171');
/*!40000 ALTER TABLE `rosters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `sports`
--

LOCK TABLES `sports` WRITE;
/*!40000 ALTER TABLE `sports` DISABLE KEYS */;
INSERT INTO `sports` (`id`, `name`, `gender`, `has_pitcher`, `default_rules`, `created_at`) VALUES ('baseball','Béisbol','mixed',1,'{\"maxOuts\": 3, \"maxBalls\": 4, \"mercyRule\": [], \"hasPitcher\": true, \"maxStrikes\": 3, \"buntsAllowed\": true, \"extraInnings\": {\"type\": \"standard\"}, \"inningsCount\": 9, \"dpFlexAllowed\": false, \"batterAttempts\": null, \"timeLimitMinutes\": null, \"continuousBatting\": false, \"pitchClockSeconds\": null}','2026-06-25 01:27:20.142');
INSERT INTO `sports` (`id`, `name`, `gender`, `has_pitcher`, `default_rules`, `created_at`) VALUES ('baseball_amateur','Béisbol Amateur','mixed',1,'{\"maxOuts\": 3, \"maxBalls\": 4, \"mercyRule\": [{\"runDiff\": 10, \"afterInning\": 5}], \"hasPitcher\": true, \"maxStrikes\": 3, \"buntsAllowed\": true, \"extraInnings\": {\"type\": \"standard\"}, \"inningsCount\": 7, \"dpFlexAllowed\": false, \"batterAttempts\": null, \"timeLimitMinutes\": null, \"continuousBatting\": false, \"pitchClockSeconds\": null}','2026-06-25 01:27:20.142');
INSERT INTO `sports` (`id`, `name`, `gender`, `has_pitcher`, `default_rules`, `created_at`) VALUES ('baseball_f','Béisbol Femenino','female',1,'{\"maxOuts\": 3, \"maxBalls\": 4, \"mercyRule\": [], \"hasPitcher\": true, \"maxStrikes\": 3, \"buntsAllowed\": true, \"extraInnings\": {\"type\": \"standard\"}, \"inningsCount\": 9, \"dpFlexAllowed\": false, \"batterAttempts\": null, \"timeLimitMinutes\": null, \"continuousBatting\": false, \"pitchClockSeconds\": null}','2026-06-25 18:23:00.733');
INSERT INTO `sports` (`id`, `name`, `gender`, `has_pitcher`, `default_rules`, `created_at`) VALUES ('baseball_m','Béisbol Masculino','male',1,'{\"maxOuts\": 3, \"maxBalls\": 4, \"mercyRule\": [], \"hasPitcher\": true, \"maxStrikes\": 3, \"buntsAllowed\": true, \"extraInnings\": {\"type\": \"standard\"}, \"inningsCount\": 9, \"dpFlexAllowed\": false, \"batterAttempts\": null, \"timeLimitMinutes\": null, \"continuousBatting\": false, \"pitchClockSeconds\": null}','2026-06-25 18:23:00.733');
INSERT INTO `sports` (`id`, `name`, `gender`, `has_pitcher`, `default_rules`, `created_at`) VALUES ('baseball5','Béisbol5','mixed',0,'{\"maxOuts\": 3, \"maxBalls\": null, \"mercyRule\": [{\"runDiff\": 10, \"afterInning\": 3}], \"hasPitcher\": false, \"maxStrikes\": 3, \"buntsAllowed\": false, \"extraInnings\": {\"type\": \"b5_escalating\"}, \"inningsCount\": 5, \"dpFlexAllowed\": false, \"batterAttempts\": 1, \"timeLimitMinutes\": null, \"continuousBatting\": true, \"pitchClockSeconds\": null}','2026-06-25 01:27:20.142');
INSERT INTO `sports` (`id`, `name`, `gender`, `has_pitcher`, `default_rules`, `created_at`) VALUES ('softball_fast','Softball Rápido','mixed',1,'{\"maxOuts\": 3, \"maxBalls\": 4, \"mercyRule\": [{\"runDiff\": 10, \"afterInning\": 5}], \"hasPitcher\": true, \"maxStrikes\": 3, \"buntsAllowed\": true, \"extraInnings\": {\"type\": \"runner_on_second\"}, \"inningsCount\": 7, \"dpFlexAllowed\": true, \"batterAttempts\": null, \"timeLimitMinutes\": null, \"continuousBatting\": false, \"pitchClockSeconds\": null}','2026-06-25 01:27:20.142');
INSERT INTO `sports` (`id`, `name`, `gender`, `has_pitcher`, `default_rules`, `created_at`) VALUES ('softball_fast_f','Softball Femenino','female',1,'{}','2026-06-25 18:22:53.935');
INSERT INTO `sports` (`id`, `name`, `gender`, `has_pitcher`, `default_rules`, `created_at`) VALUES ('softball_fast_m','Softball Masculino','male',1,'{\"maxOuts\": 3, \"maxBalls\": 4, \"mercyRule\": [{\"runDiff\": 10, \"afterInning\": 5}], \"hasPitcher\": true, \"maxStrikes\": 3, \"buntsAllowed\": true, \"extraInnings\": {\"type\": \"runner_on_second\"}, \"inningsCount\": 7, \"dpFlexAllowed\": true, \"batterAttempts\": null, \"timeLimitMinutes\": null, \"continuousBatting\": false, \"pitchClockSeconds\": null}','2026-06-25 18:23:00.733');
INSERT INTO `sports` (`id`, `name`, `gender`, `has_pitcher`, `default_rules`, `created_at`) VALUES ('softball_slow','Softball Lento','mixed',1,'{\"maxOuts\": 3, \"maxBalls\": 4, \"mercyRule\": [{\"runDiff\": 10, \"afterInning\": 5}], \"hasPitcher\": true, \"maxStrikes\": 3, \"buntsAllowed\": false, \"extraInnings\": {\"type\": \"runner_on_second\"}, \"inningsCount\": 7, \"dpFlexAllowed\": false, \"batterAttempts\": null, \"timeLimitMinutes\": null, \"continuousBatting\": true, \"pitchClockSeconds\": null}','2026-06-25 01:27:20.142');
/*!40000 ALTER TABLE `sports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `sponsors`
--

LOCK TABLES `sponsors` WRITE;
/*!40000 ALTER TABLE `sponsors` DISABLE KEYS */;
INSERT INTO `sponsors` (`id`, `name`, `brand`, `asset_id`, `status`, `priority`, `weight`, `allowed_placements`, `start_date`, `end_date`, `exposure_limits`, `blackout_rules`, `metadata`, `created_at`, `updated_at`) VALUES ('sponsor-merchise','Merchise','Merchise','sponsors/merchise-logo','active',90,60,'[\"scorebug\", \"sponsor_overlay\", \"fullscreen\", \"summary\"]',NULL,NULL,'{\"maxPerGame\": 18, \"minSecondsBetween\": 120}','[]','{\"tagline\": \"Innovacion y Tecnologia\", \"category\": \"tecnologia\"}','2026-06-25 20:50:28.230','2026-06-26 01:18:04.295');
INSERT INTO `sponsors` (`id`, `name`, `brand`, `asset_id`, `status`, `priority`, `weight`, `allowed_placements`, `start_date`, `end_date`, `exposure_limits`, `blackout_rules`, `metadata`, `created_at`, `updated_at`) VALUES ('sponsor-merchise-online','Merchise Online Services','Merchise Online Services','sponsors/mols-logo','active',85,50,'[\"scorebug\", \"sponsor_overlay\", \"fullscreen\", \"summary\"]',NULL,NULL,'{\"maxPerGame\": 18, \"minSecondsBetween\": 120}','[]','{\"tagline\": \"Tecnologia con sentido para digitalizar tu negocio\", \"category\": \"tecnologia\"}','2026-06-25 20:50:28.230','2026-06-26 01:18:21.564');
INSERT INTO `sponsors` (`id`, `name`, `brand`, `asset_id`, `status`, `priority`, `weight`, `allowed_placements`, `start_date`, `end_date`, `exposure_limits`, `blackout_rules`, `metadata`, `created_at`, `updated_at`) VALUES ('sponsor-storeware','Storeware','Storeware','sponsors/storeware-logo','active',80,45,'[\"scorebug\", \"sponsor_overlay\", \"fullscreen\", \"summary\"]',NULL,NULL,'{\"maxPerGame\": 18, \"minSecondsBetween\": 120}','[]','{\"tagline\": \"Tus pedidos directo a la cocina\", \"category\": \"tecnologia\"}','2026-06-25 20:50:28.230','2026-06-26 01:18:28.009');
/*!40000 ALTER TABLE `sponsors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `standings`
--

LOCK TABLES `standings` WRITE;
/*!40000 ALTER TABLE `standings` DISABLE KEYS */;
/*!40000 ALTER TABLE `standings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
INSERT INTO `teams` (`id`, `name`, `short_name`, `abbreviation`, `logo_asset_id`, `logo_wordmark_asset_id`, `logo_alternate_asset_id`, `city`, `country`, `club_id`, `primary_color`, `secondary_color`, `founded_year`, `active`, `mlbam_id`, `wbsc_id`, `ext_ref`, `team_code`, `created_at`, `updated_at`) VALUES ('team-chile','Team Chile','CHI','CHI','teams/teamchile-logo',NULL,NULL,'Santiago','CL',NULL,'#CC0F0C','#01299F',NULL,1,NULL,NULL,NULL,'chi','2026-06-25 01:27:20.163','2026-06-27 03:16:09.871');
INSERT INTO `teams` (`id`, `name`, `short_name`, `abbreviation`, `logo_asset_id`, `logo_wordmark_asset_id`, `logo_alternate_asset_id`, `city`, `country`, `club_id`, `primary_color`, `secondary_color`, `founded_year`, `active`, `mlbam_id`, `wbsc_id`, `ext_ref`, `team_code`, `created_at`, `updated_at`) VALUES ('team-guerreras','Guerreras','GUE','GUER','teams/guerreras-logo',NULL,NULL,'Santiago de Chile','VE',NULL,'#760B24','#E0BA86',NULL,1,NULL,NULL,NULL,'guer','2026-06-25 01:27:20.163','2026-06-27 03:16:09.871');
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `team_categories`
--

LOCK TABLES `team_categories` WRITE;
/*!40000 ALTER TABLE `team_categories` DISABLE KEYS */;
INSERT INTO `team_categories` (`team_id`, `category_id`) VALUES ('team-chile','cat-fed-sf-adulto');
INSERT INTO `team_categories` (`team_id`, `category_id`) VALUES ('team-guerreras','cat-fed-sf-adulto');
/*!40000 ALTER TABLE `team_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tournament_group_teams`
--

LOCK TABLES `tournament_group_teams` WRITE;
/*!40000 ALTER TABLE `tournament_group_teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_group_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tournament_groups`
--

LOCK TABLES `tournament_groups` WRITE;
/*!40000 ALTER TABLE `tournament_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tournament_teams`
--

LOCK TABLES `tournament_teams` WRITE;
/*!40000 ALTER TABLE `tournament_teams` DISABLE KEYS */;
INSERT INTO `tournament_teams` (`id`, `tournament_id`, `team_id`, `seeding`, `eliminated`, `created_at`) VALUES ('026fabed-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-guerreras',1,0,'2026-06-25 01:27:20.164');
INSERT INTO `tournament_teams` (`id`, `tournament_id`, `team_id`, `seeding`, `eliminated`, `created_at`) VALUES ('026fad1c-7035-11f1-ba8f-8e6f87d63acf','tournament-exhibicion-jun2026','team-chile',2,0,'2026-06-25 01:27:20.164');
/*!40000 ALTER TABLE `tournament_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tournaments`
--

LOCK TABLES `tournaments` WRITE;
/*!40000 ALTER TABLE `tournaments` DISABLE KEYS */;
INSERT INTO `tournaments` (`id`, `league_id`, `category_id`, `name`, `short_name`, `type`, `season`, `start_date`, `end_date`, `rules`, `logo_asset_id`, `banner_asset_id`, `trophy_asset_id`, `status`, `mlbam_id`, `wbsc_id`, `ext_ref`, `created_at`, `updated_at`, `structure_type`, `num_rounds`, `has_playoffs`, `playoff_format`) VALUES ('8ba0e1cd-7940-4ea4-9073-0a53101e2378','league-0cdccbd8-f9f3-41cd-b798-6f4ec2cb481d','cat-pb-tball','Pequeñas Ligas Santiago Oriente 2026-2027','PLSO-2627','league','2026-2027',NULL,NULL,'{}',NULL,NULL,NULL,'upcoming',NULL,NULL,NULL,'2026-06-25 19:25:10.567','2026-06-25 19:25:10.567','round_robin',1,1,'semifinal_final');
INSERT INTO `tournaments` (`id`, `league_id`, `category_id`, `name`, `short_name`, `type`, `season`, `start_date`, `end_date`, `rules`, `logo_asset_id`, `banner_asset_id`, `trophy_asset_id`, `status`, `mlbam_id`, `wbsc_id`, `ext_ref`, `created_at`, `updated_at`, `structure_type`, `num_rounds`, `has_playoffs`, `playoff_format`) VALUES ('tournament-exhibicion-jun2026','league-exhibicion-softball-cl',NULL,'Exhibición Softball Femenino','EXHIB-JUN26','exhibition','2026','2026-06-11','2026-06-11',NULL,NULL,NULL,NULL,'completed',NULL,NULL,NULL,'2026-06-25 01:27:20.161','2026-06-25 18:15:13.042','round_robin',1,0,NULL);
/*!40000 ALTER TABLE `tournaments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `venues`
--

LOCK TABLES `venues` WRITE;
/*!40000 ALTER TABLE `venues` DISABLE KEYS */;
INSERT INTO `venues` (`id`, `name`, `photo_asset_id`, `address_line1`, `address_line2`, `city`, `state_province`, `postal_code`, `country`, `country_code`, `google_place_id`, `latitude`, `longitude`, `capacity`, `notes`, `created_at`, `updated_at`) VALUES ('venue-bonilla','Bonilla',NULL,'Av. Gral. Óscar Bonilla 6950, Lo Prado',NULL,'Santiago','Región Metropolitana de Santiago',NULL,'Chile','CL','ChIJE62d4ZjDYpYR6-z13HRws6Q',-33.45395590,-70.73327170,NULL,'Casa oficial de Pequeñas Ligas Santiago Oriente','2026-06-25 21:23:33.831','2026-06-25 21:39:33.635');
INSERT INTO `venues` (`id`, `name`, `photo_asset_id`, `address_line1`, `address_line2`, `city`, `state_province`, `postal_code`, `country`, `country_code`, `google_place_id`, `latitude`, `longitude`, `capacity`, `notes`, `created_at`, `updated_at`) VALUES ('venue-penaloen','Peñaloén',NULL,'Antupirén 8740, Peñalolén',NULL,'Santiago','Región Metropolitana de Santiago',NULL,'Chile','CL','EkFBbnR1cGlyZW4gODc0MCwgNzk0MDQwNSBQZcOxYWxvbMOpbiwgUmVnacOzbiBNZXRyb3BvbGl0YW5hLCBDaGlsZSIxEi8KFAoSCbdnSMnl0WKWEY9I88ld_xTvEKREKhQKEglJ_HFA5dFilhHGnYNPcBiguA',-33.47978460,-70.54296820,NULL,'Casa oficial del Club Mineros de Santiago','2026-06-25 21:18:36.392','2026-06-25 21:21:54.696');
/*!40000 ALTER TABLE `venues` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-27  5:47:01
