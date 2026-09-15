-- ============================================================
-- Trinetra — Complete SQL Migration
-- Run in Supabase Dashboard → SQL Editor → New query
-- Does everything: cleanup + two-table split + forecast support
-- ============================================================

-- === STEP 1: Clean stations table ===
-- Remove source_type and description columns
ALTER TABLE public.stations DROP COLUMN IF EXISTS source_type;
ALTER TABLE public.stations DROP COLUMN IF EXISTS description;

-- === STEP 2: Clean readings table (raw sensor data only) ===
-- Remove ML-computed columns — these go in processed_readings
ALTER TABLE public.readings DROP COLUMN IF EXISTS pm25_ug_m3;
ALTER TABLE public.readings DROP COLUMN IF EXISTS pm10_ug_m3;
ALTER TABLE public.readings DROP COLUMN IF EXISTS aqi;
ALTER TABLE public.readings DROP COLUMN IF EXISTS air_quality_category;

-- === STEP 3: Keep only real devices ===
DELETE FROM public.stations WHERE id NOT IN ('station_01', 'station_02');
UPDATE public.stations SET name = 'Device 1' WHERE id = 'station_01';
UPDATE public.stations SET name = 'Device 2' WHERE id = 'station_02';

-- === STEP 4: Create processed_readings table (ML-enriched) ===
CREATE TABLE IF NOT EXISTS public.processed_readings (
  id                bigint generated always as identity primary key,
  reading_id        bigint REFERENCES public.readings(id) ON DELETE CASCADE,
  station_id        text REFERENCES public.stations(id),
  temperature       double precision,
  humidity          double precision,
  pm25_ug_m3        double precision,
  pm10_ug_m3        double precision,
  aqi               integer,
  source            text,              -- M1: ambient/traffic/indoor/industrial
  source_confidence double precision,
  thermal_comfort   text,              -- M2: Comfortable/Warm/Hot & Humid
  processed_at      timestamptz default now()
);

CREATE INDEX IF NOT EXISTS processed_station_time_idx
  ON public.processed_readings (station_id, processed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS processed_reading_id_idx
  ON public.processed_readings (reading_id);

-- === STEP 5: RLS for processed_readings ===
ALTER TABLE public.processed_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processed public read" ON public.processed_readings
  FOR SELECT USING (true);

CREATE POLICY "processed anon insert" ON public.processed_readings
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "processed authenticated insert" ON public.processed_readings
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- === STEP 6: Verify ===
SELECT 'stations' as tbl, count(*) as rows FROM public.stations
UNION ALL
SELECT 'readings', count(*) FROM public.readings
UNION ALL
SELECT 'processed_readings', count(*) FROM public.processed_readings;
