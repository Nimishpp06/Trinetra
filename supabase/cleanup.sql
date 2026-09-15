-- ============================================================
-- Trinetra — clean schema for 2 real devices only
-- Run in Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Remove bad columns from stations
ALTER TABLE public.stations DROP COLUMN IF EXISTS source_type;
ALTER TABLE public.stations DROP COLUMN IF EXISTS description;

-- 2. Remove bad column from readings
ALTER TABLE public.readings DROP COLUMN IF EXISTS air_quality_category;

-- 3. Delete all fake stations, keep only station_01 and station_02
DELETE FROM public.stations WHERE id NOT IN ('station_01', 'station_02');

-- 4. Rename station names to match what you actually have
UPDATE public.stations SET name = 'Device 1' WHERE id = 'station_01';
UPDATE public.stations SET name = 'Device 2' WHERE id = 'station_02';

-- 5. Verify
SELECT * FROM public.stations;
SELECT count(*) as total_stations FROM public.stations;
