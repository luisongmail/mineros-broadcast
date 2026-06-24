create extension if not exists pgcrypto;

-- Asset Manager: tabla de assets (ref: 03-asset-manager.md)
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_id text unique not null,
  name text not null,
  type text not null check (type in ('logo','player_photo','sponsor_asset','background','icon','template','lower_third','broadcast_graphic')),
  owner text not null,
  brand text not null,
  status text not null default 'draft' check (status in ('draft','review','approved','rejected','archived','expired')),
  usage text[] not null default '{}',
  file text not null,
  format text not null check (format in ('png','svg','jpg','webp','json')),
  protected boolean not null default false,
  checksum text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.assets enable row level security;

drop policy if exists "Leer assets aprobados" on public.assets;

-- Solo usuarios autenticados pueden leer assets aprobados
create policy "Leer assets aprobados" on public.assets
  for select using (auth.role() = 'authenticated' and status = 'approved');

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists assets_updated_at on public.assets;

create trigger assets_updated_at before update on public.assets
  for each row execute function public.set_updated_at();
