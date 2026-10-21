-- ===================================================================
-- BloodFlow Smart IoT — Complete Setup SQL
-- Run this ONCE in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gvwdrbrepbpmhjckdcyq/sql
-- ===================================================================

-- ───────────────────────────────────────────
-- 1. CREATE TABLES
-- ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.storage_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'critical', 'offline')),
    current_temperature NUMERIC(4,1) DEFAULT 4.2,
    min_temp_threshold NUMERIC(4,1) DEFAULT 2.0,
    max_temp_threshold NUMERIC(4,1) DEFAULT 6.0,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.iot_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE NOT NULL,
    storage_unit_id UUID REFERENCES public.storage_units(id) ON DELETE SET NULL,
    device_type TEXT DEFAULT 'ESP8266_DS18B20_RC522',
    status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline')),
    wifi_status TEXT NOT NULL DEFAULT 'connected' CHECK (wifi_status IN ('connected', 'disconnected', 'weak')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    last_temperature NUMERIC(4,1) DEFAULT 4.2,
    firmware_version TEXT DEFAULT 'v2.0.0-bloodflow',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.temperature_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    storage_unit_id UUID REFERENCES public.storage_units(id) ON DELETE CASCADE,
    temperature NUMERIC(4,1) NOT NULL,
    status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'critical')),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blood_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blood_unit_code TEXT UNIQUE NOT NULL,
    rfid_uid TEXT UNIQUE NOT NULL,
    blood_group TEXT NOT NULL,
    storage_unit_id UUID REFERENCES public.storage_units(id) ON DELETE SET NULL,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'DISPATCHED', 'RESERVED', 'EXPIRED')),
    volume_ml INT DEFAULT 350,
    collection_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '35 days'),
    last_scanned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rfid_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfid_uid TEXT NOT NULL,
    blood_unit_id UUID REFERENCES public.blood_units(id) ON DELETE SET NULL,
    blood_unit_code TEXT,
    blood_group TEXT,
    storage_unit_id UUID REFERENCES public.storage_units(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('ENTERED', 'DISPATCHED', 'MOVED', 'SCAN_FAILED', 'UNKNOWN_TAG')),
    result TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (result IN ('SUCCESS', 'FAILED', 'FLAGGED')),
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.iot_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT,
    storage_unit_id UUID REFERENCES public.storage_units(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.emergency_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL DEFAULT 'BLOOD-BANK-01',
    source TEXT NOT NULL DEFAULT 'web_button',
    emergency_type TEXT NOT NULL DEFAULT 'FIRE',
    message TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────
-- 2. ENABLE ROW LEVEL SECURITY
-- ───────────────────────────────────────────

ALTER TABLE public.storage_units      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_devices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperature_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_units        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfid_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_alerts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_events   ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────
-- 3. RLS POLICIES — AUTHENTICATED USERS (Doctor Dashboard)
-- ───────────────────────────────────────────

DO $$ BEGIN
  -- storage_units
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth read storage_units') THEN
    CREATE POLICY "auth read storage_units" ON public.storage_units FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth manage storage_units') THEN
    CREATE POLICY "auth manage storage_units" ON public.storage_units FOR ALL TO authenticated USING (true);
  END IF;

  -- iot_devices
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth read iot_devices') THEN
    CREATE POLICY "auth read iot_devices" ON public.iot_devices FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth manage iot_devices') THEN
    CREATE POLICY "auth manage iot_devices" ON public.iot_devices FOR ALL TO authenticated USING (true);
  END IF;

  -- temperature_readings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth read temperature_readings') THEN
    CREATE POLICY "auth read temperature_readings" ON public.temperature_readings FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth insert temperature_readings') THEN
    CREATE POLICY "auth insert temperature_readings" ON public.temperature_readings FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  -- blood_units
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth read blood_units') THEN
    CREATE POLICY "auth read blood_units" ON public.blood_units FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth manage blood_units') THEN
    CREATE POLICY "auth manage blood_units" ON public.blood_units FOR ALL TO authenticated USING (true);
  END IF;

  -- rfid_events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth read rfid_events') THEN
    CREATE POLICY "auth read rfid_events" ON public.rfid_events FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth insert rfid_events') THEN
    CREATE POLICY "auth insert rfid_events" ON public.rfid_events FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  -- iot_alerts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth read iot_alerts') THEN
    CREATE POLICY "auth read iot_alerts" ON public.iot_alerts FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth manage iot_alerts') THEN
    CREATE POLICY "auth manage iot_alerts" ON public.iot_alerts FOR ALL TO authenticated USING (true);
  END IF;

  -- emergency_events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth manage emergency_events') THEN
    CREATE POLICY "auth manage emergency_events" ON public.emergency_events FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- ───────────────────────────────────────────
-- 4. RLS POLICIES — ANON ROLE (ESP8266 Hardware Device)
-- ───────────────────────────────────────────

DO $$ BEGIN
  -- storage_units: anon can READ (to look up UUID by storage_code) and UPDATE temperature
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon read storage_units') THEN
    CREATE POLICY "anon read storage_units" ON public.storage_units FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon update storage_units') THEN
    CREATE POLICY "anon update storage_units" ON public.storage_units FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  -- temperature_readings: anon INSERT
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon insert temperature_readings') THEN
    CREATE POLICY "anon insert temperature_readings" ON public.temperature_readings FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon read temperature_readings') THEN
    CREATE POLICY "anon read temperature_readings" ON public.temperature_readings FOR SELECT TO anon USING (true);
  END IF;

  -- rfid_events: anon INSERT + READ
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon insert rfid_events') THEN
    CREATE POLICY "anon insert rfid_events" ON public.rfid_events FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon read rfid_events') THEN
    CREATE POLICY "anon read rfid_events" ON public.rfid_events FOR SELECT TO anon USING (true);
  END IF;

  -- iot_alerts: anon INSERT (temperature warnings from device)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon insert iot_alerts') THEN
    CREATE POLICY "anon insert iot_alerts" ON public.iot_alerts FOR INSERT TO anon WITH CHECK (true);
  END IF;

  -- iot_devices: anon UPSERT (device heartbeat)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon upsert iot_devices') THEN
    CREATE POLICY "anon upsert iot_devices" ON public.iot_devices FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- emergency_events: anon INSERT + READ (hardware button trigger)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon insert emergency_events') THEN
    CREATE POLICY "anon insert emergency_events" ON public.emergency_events FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon read emergency_events') THEN
    CREATE POLICY "anon read emergency_events" ON public.emergency_events FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ───────────────────────────────────────────
-- 5. ENABLE REALTIME ON ALL IOT TABLES
-- ───────────────────────────────────────────

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'storage_units', 'iot_devices', 'temperature_readings',
    'blood_units', 'rfid_events', 'iot_alerts', 'emergency_events'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      -- Already a member, skip silently
    END;
  END LOOP;
END $$;

-- ───────────────────────────────────────────
-- 6. RFID SCAN TRIGGER (Auto-links scanned UID to blood_units inventory)
-- ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_rfid_scan_event()
RETURNS TRIGGER AS $$
DECLARE
    matched_unit public.blood_units%ROWTYPE;
BEGIN
    -- Look for a registered blood unit matching this scanned tag
    SELECT * INTO matched_unit 
    FROM public.blood_units 
    WHERE LOWER(rfid_uid) = LOWER(NEW.rfid_uid) 
    LIMIT 1;

    IF FOUND THEN
        NEW.blood_unit_id   := matched_unit.id;
        NEW.blood_unit_code := matched_unit.blood_unit_code;
        NEW.blood_group     := matched_unit.blood_group;
        NEW.result          := 'SUCCESS';

        -- Update the blood unit timestamp and assigned storage unit
        UPDATE public.blood_units 
        SET last_scanned_at = NOW(),
            storage_unit_id = COALESCE(NEW.storage_unit_id, storage_unit_id)
        WHERE id = matched_unit.id;
    ELSE
        -- Tag scanned on hardware is not registered in blood_units yet
        NEW.result := 'FLAGGED';
        NEW.action := 'UNKNOWN_TAG';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_rfid_scan_event ON public.rfid_events;
CREATE TRIGGER trg_handle_rfid_scan_event
BEFORE INSERT ON public.rfid_events
FOR EACH ROW EXECUTE FUNCTION public.handle_rfid_scan_event();

-- ───────────────────────────────────────────
-- 7. SEED DEMO STORAGE UNITS
-- ───────────────────────────────────────────

INSERT INTO public.storage_units (storage_code, name, location, status, current_temperature, min_temp_threshold, max_temp_threshold)
VALUES
  ('ST001', 'Cold Vault A (Whole Blood)',   'Blood Bank Wing A - Room 101', 'normal',   4.2, 2.0, 6.0),
  ('ST002', 'Cold Vault B (Plasma & RBC)',  'Blood Bank Wing A - Room 102', 'warning',  7.4, 2.0, 6.0),
  ('ST003', 'Emergency Unit C',             'ICU Emergency Ward - Floor 2', 'critical', 11.8, 2.0, 6.0),
  ('ST004', 'Reserve Storage D',            'Sub-Basement Storage',         'offline',  4.0, 2.0, 6.0)
ON CONFLICT (storage_code) DO NOTHING;

-- ───────────────────────────────────────────
-- 7. VERIFY — CHECK TABLES AND POLICIES CREATED
-- ───────────────────────────────────────────

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'storage_units', 'iot_devices', 'temperature_readings',
    'blood_units', 'rfid_events', 'iot_alerts', 'emergency_events'
  )
ORDER BY table_name;
