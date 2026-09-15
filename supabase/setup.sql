-- ============================================================
-- Trinetra — Supabase setup (clean schema)
-- Run in Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Stations: just id, name, coordinates
create table if not exists public.stations (
  id          text primary key,
  name        text not null,
  lat         double precision not null,
  lng         double precision not null,
  created_at  timestamptz default now()
);

-- Readings: raw sensor data + ML-computed values
create table if not exists public.readings (
  id                bigint generated always as identity primary key,
  station_id        text references public.stations(id),
  -- raw sensor data (from ESP32)
  temperature       double precision,
  humidity          double precision,
  mq135_raw         integer,
  dust_density      double precision,
  -- ML-computed values (written by /api/predict)
  pm25_ug_m3        double precision,
  pm10_ug_m3        double precision,
  aqi               integer,
  pollution_source  text,           -- ambient/traffic/indoor/industrial (RF model M1)
  thermal_comfort   text,           -- Comfortable/Hot & Humid (RF model M2)
  recorded_at       timestamptz default now()
);

create index if not exists readings_station_time_idx
  on public.readings (station_id, recorded_at desc);

-- Seed only 2 real devices
insert into public.stations (id, name, lat, lng) values
  ('station_01', 'Device 1', 19.0748, 72.8856),
  ('station_02', 'Device 2', 19.0730, 72.8880)
on conflict (id) do nothing;

-- RLS
alter table public.stations enable row level security;
alter table public.readings enable row level security;

create policy "stations public read" on public.stations
  for select using (true);

create policy "readings public read" on public.readings
  for select using (true);

create policy "readings anon insert" on public.readings
  for insert to anon
  with check (true);
