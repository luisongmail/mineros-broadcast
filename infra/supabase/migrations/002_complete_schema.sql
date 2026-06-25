create extension if not exists pgcrypto;

-- Teams
create table if not exists public.teams (
  id text primary key,
  name text not null,
  short_name text not null,
  logo_asset_id text,
  city text,
  country text default 'DO',
  primary_color text,
  secondary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Players
create table if not exists public.players (
  id text primary key,
  team_id text references public.teams(id) on delete set null,
  number text not null,
  name text not null,
  position text not null,
  bats text,
  throws text,
  photo_asset_id text,
  stats jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Games
create table if not exists public.games (
  id text primary key,
  home_team_id text references public.teams(id) on delete set null,
  away_team_id text references public.teams(id) on delete set null,
  status text not null default 'scheduled',
  scheduled_at timestamptz not null,
  started_at timestamptz,
  finished_at timestamptz,
  venue text,
  season text,
  game_number integer,
  final_score jsonb,
  game_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Game lineups
create table if not exists public.game_lineups (
  id text primary key default gen_random_uuid()::text,
  game_id text references public.games(id) on delete cascade,
  team_id text references public.teams(id) on delete cascade,
  player_id text references public.players(id) on delete cascade,
  batting_order integer not null,
  position text not null,
  is_starter boolean not null default true,
  substituted_at timestamptz,
  substituted_by text references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Sponsors
create table if not exists public.sponsors (
  id text primary key,
  name text not null,
  brand text not null,
  asset_id text,
  status text not null default 'draft',
  priority integer not null default 50,
  weight integer not null default 10,
  allowed_placements jsonb not null default '[]'::jsonb,
  start_date timestamptz,
  end_date timestamptz,
  exposure_limits jsonb not null default '{}'::jsonb,
  blackout_rules jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Campaigns
create table if not exists public.campaigns (
  id text primary key,
  name text not null,
  status text not null default 'draft',
  placements jsonb not null default '[]'::jsonb,
  start_date timestamptz,
  end_date timestamptz,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Campaign sponsors
create table if not exists public.campaign_sponsors (
  campaign_id text references public.campaigns(id) on delete cascade,
  sponsor_id text references public.sponsors(id) on delete cascade,
  primary key (campaign_id, sponsor_id)
);

-- Sponsor impressions
create table if not exists public.sponsor_impressions (
  id text primary key default gen_random_uuid()::text,
  sponsor_id text references public.sponsors(id) on delete set null,
  campaign_id text references public.campaigns(id) on delete set null,
  game_id text references public.games(id) on delete set null,
  placement text not null,
  zone_id text,
  scene_id text,
  trigger text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer
);

-- Operator actions
create table if not exists public.operator_actions (
  id text primary key default gen_random_uuid()::text,
  game_id text references public.games(id) on delete set null,
  operator_id text not null,
  role text not null,
  action text not null,
  overlay_id text,
  payload jsonb not null default '{}'::jsonb,
  result text,
  created_at timestamptz not null default now()
);

-- Overlay configs
create table if not exists public.overlay_configs (
  overlay_id text primary key,
  default_variant text,
  auto_hide_ms integer,
  priority integer not null default 50,
  preferred_zone text,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_game_lineups_game_id on public.game_lineups(game_id);
create index if not exists idx_game_lineups_team_id on public.game_lineups(team_id);
create index if not exists idx_sponsor_impressions_game_id on public.sponsor_impressions(game_id);
create index if not exists idx_sponsor_impressions_sponsor_id on public.sponsor_impressions(sponsor_id);
create index if not exists idx_operator_actions_game_id on public.operator_actions(game_id);
create index if not exists idx_operator_actions_created_at on public.operator_actions(created_at);
create index if not exists idx_players_team_id on public.players(team_id);

drop trigger if exists teams_updated_at on public.teams;
create trigger teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists players_updated_at on public.players;
create trigger players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

drop trigger if exists games_updated_at on public.games;
create trigger games_updated_at
before update on public.games
for each row execute function public.set_updated_at();

drop trigger if exists sponsors_updated_at on public.sponsors;
create trigger sponsors_updated_at
before update on public.sponsors
for each row execute function public.set_updated_at();

drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

drop trigger if exists overlay_configs_updated_at on public.overlay_configs;
create trigger overlay_configs_updated_at
before update on public.overlay_configs
for each row execute function public.set_updated_at();
