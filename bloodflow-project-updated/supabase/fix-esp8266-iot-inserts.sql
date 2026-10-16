-- =======================================================
-- BloodFlow IoT: Fix ESP8266 Hardware Insert Permissions
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/gvwdrbrepbpmhjckdcyq/sql
-- =======================================================

-- 1. Allow ANON (device) to insert temperature readings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'temperature_readings'
        AND policyname = 'Allow anon insert temperature_readings'
    ) THEN
        CREATE POLICY "Allow anon insert temperature_readings"
        ON public.temperature_readings
        FOR INSERT TO anon
        WITH CHECK (true);
    END IF;
END $$;

-- 2. Allow ANON (device) to insert rfid_events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'rfid_events'
        AND policyname = 'Allow anon insert rfid_events'
    ) THEN
        CREATE POLICY "Allow anon insert rfid_events"
        ON public.rfid_events
        FOR INSERT TO anon
        WITH CHECK (true);
    END IF;
END $$;

-- 3. Allow ANON (device) to UPDATE storage_units temperature
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'storage_units'
        AND policyname = 'Allow anon update storage_units temperature'
    ) THEN
        CREATE POLICY "Allow anon update storage_units temperature"
        ON public.storage_units
        FOR UPDATE TO anon
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 4. Allow ANON (device) to read storage_units (needed to look up ST001 UUID)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'storage_units'
        AND policyname = 'Allow anon read storage_units'
    ) THEN
        CREATE POLICY "Allow anon read storage_units"
        ON public.storage_units
        FOR SELECT TO anon
        USING (true);
    END IF;
END $$;

-- 5. Allow ANON to read rfid_events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'rfid_events'
        AND policyname = 'Allow anon read rfid_events'
    ) THEN
        CREATE POLICY "Allow anon read rfid_events"
        ON public.rfid_events
        FOR SELECT TO anon
        USING (true);
    END IF;
END $$;

-- 6. Allow ANON to read temperature_readings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'temperature_readings'
        AND policyname = 'Allow anon read temperature_readings'
    ) THEN
        CREATE POLICY "Allow anon read temperature_readings"
        ON public.temperature_readings
        FOR SELECT TO anon
        USING (true);
    END IF;
END $$;

-- 7. Allow ANON to insert iot_alerts (for temperature warnings)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'iot_alerts'
        AND policyname = 'Allow anon insert iot_alerts'
    ) THEN
        CREATE POLICY "Allow anon insert iot_alerts"
        ON public.iot_alerts
        FOR INSERT TO anon
        WITH CHECK (true);
    END IF;
END $$;

-- 8. Allow ANON to update iot_devices (heartbeat / last_seen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'iot_devices'
        AND policyname = 'Allow anon upsert iot_devices'
    ) THEN
        CREATE POLICY "Allow anon upsert iot_devices"
        ON public.iot_devices
        FOR ALL TO anon
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- VERIFY: Show all policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN (
    'temperature_readings',
    'rfid_events',
    'storage_units',
    'iot_alerts',
    'iot_devices'
)
ORDER BY tablename, policyname;
