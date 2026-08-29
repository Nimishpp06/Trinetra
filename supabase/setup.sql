-- ============================================================
-- Trinetra — Supabase setup
-- Run once in: Supabase Dashboard → SQL Editor → New query
-- Replace placeholders, then flip the ESP32 config and upload.
-- ============================================================

-- Stations: fixed sensor locations (no GPS on the device).
-- Coordinates + zone are assigned here, once, at install time.
create table if not exists public.stations (
  id          text primary key,          -- e.g. 'station_01'
  name        text not null,             -- e.g. 'Engineering Block'
  zone        text not null,             -- e.g. 'Vidyavihar', 'Kurla'
  lat         double precision not null, -- station's fixed coordinates
  lng         double precision not null,
  description text,
  created_at  timestamptz default now()
);

-- Readings: one row per ESP32 POST.
create table if not exists public.readings (
  id            bigint generated always as identity primary key,
  station_id    text references public.stations(id),
  temperature   double precision,
  humidity      double precision,
  mq135_raw     integer,
  dust_density  double precision,
  aqi           integer,          -- computed later by ML/backend if desired
  recorded_at   timestamptz default now()
);

create index if not exists readings_station_time_idx
  on public.readings (station_id, recorded_at desc);

-- Seed your stations here (one row per deployed sensor):
insert into public.stations (id, name, zone, lat, lng) values
  ('station_01', 'Engineering Block',   'Vidyavihar', 19.0748, 72.8856),
  ('station_02', 'Sports Ground',       'Vidyavihar', 19.0730, 72.8880)
on conflict (id) do nothing;

-- ============================================================
-- Row Level Security
-- Public (anon): can READ everything, can INSERT readings only.
-- Only authenticated users can manage stations.
-- ============================================================
alter table public.stations enable row level security;
alter table public.readings enable row level security;

-- Everyone may read readings (public data).
create policy "readings public read" on public.readings
  for select using (true);

-- The ESP32 inserts with the anon key, no login needed.
create policy "readings anon insert" on public.readings
  for insert to anon
  with check (true);

-- Stations are visible publicly (map needs them).
create policy "stations public read" on public.stations
  for select using (true);

-- Only logged-in admins manage stations.
create policy "stations admin all" on public.stations
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Optional: readings inserts also allowed for logged-in users (future).
-- create policy "readings authenticated insert" on public.readings
--   for insert to authenticated
--   with check (true);