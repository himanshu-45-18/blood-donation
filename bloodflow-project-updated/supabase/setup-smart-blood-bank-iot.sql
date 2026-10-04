-- Smart Blood Bank IoT Schema & Seed Script for Supabase SQL Editor
-- Run this in your Supabase project (gvwdrbrepbpmhjckdcyq) SQL Editor

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
    device_type TEXT DEFAULT 'ESP32_DS18B20_RC522',
    status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline')),
    wifi_status TEXT NOT NULL DEFAULT 'connected' CHECK (wifi_status IN ('connected', 'disconnected', 'weak')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    last_temperature NUMERIC(4,1) DEFAULT 4.2,
    firmware_version TEXT DEFAULT 'v1.4.2-iot',
    ip_address TEXT DEFAULT '192.168.1.105',
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

ALTER TABLE public.storage_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperature_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfid_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_alerts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read storage_units') THEN
        CREATE POLICY "Allow authenticated read storage_units" ON public.storage_units FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated manage storage_units') THEN
        CREATE POLICY "Allow authenticated manage storage_units" ON public.storage_units FOR ALL TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read iot_devices') THEN
        CREATE POLICY "Allow authenticated read iot_devices" ON public.iot_devices FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated manage iot_devices') THEN
        CREATE POLICY "Allow authenticated manage iot_devices" ON public.iot_devices FOR ALL TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read temperature_readings') THEN
        CREATE POLICY "Allow authenticated read temperature_readings" ON public.temperature_readings FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated insert temperature_readings') THEN
        CREATE POLICY "Allow authenticated insert temperature_readings" ON public.temperature_readings FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read blood_units') THEN
        CREATE POLICY "Allow authenticated read blood_units" ON public.blood_units FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated manage blood_units') THEN
        CREATE POLICY "Allow authenticated manage blood_units" ON public.blood_units FOR ALL TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read rfid_events') THEN
        CREATE POLICY "Allow authenticated read rfid_events" ON public.rfid_events FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated insert rfid_events') THEN
        CREATE POLICY "Allow authenticated insert rfid_events" ON public.rfid_events FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read iot_alerts') THEN
        CREATE POLICY "Allow authenticated read iot_alerts" ON public.iot_alerts FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated manage iot_alerts') THEN
        CREATE POLICY "Allow authenticated manage iot_alerts" ON public.iot_alerts FOR ALL TO authenticated USING (true);
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.storage_units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.iot_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.temperature_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rfid_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.iot_alerts;

INSERT INTO public.storage_units (storage_code, name, location, status, current_temperature, min_temp_threshold, max_temp_threshold)
VALUES 
  ('ST001', 'Cold Vault A (Whole Blood)', 'Blood Bank Wing A - Room 101', 'normal', 4.2, 2.0, 6.0),
  ('ST002', 'Cold Vault B (Plasma & RBC)', 'Blood Bank Wing A - Room 102', 'warning', 7.4, 2.0, 6.0),
  ('ST003', 'Emergency Unit C', 'ICU Emergency Ward - Floor 2', 'critical', 11.8, 2.0, 6.0),
  ('ST004', 'Reserve Storage D', 'Sub-Basement Storage', 'offline', 4.0, 2.0, 6.0)
ON CONFLICT (storage_code) DO NOTHING;
