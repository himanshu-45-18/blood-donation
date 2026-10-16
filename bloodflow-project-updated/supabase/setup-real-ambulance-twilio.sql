-- ===================================================================
-- BloodFlow: Real Emergency Ambulance Twilio Configuration Schema
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gvwdrbrepbpmhjckdcyq/sql
-- ===================================================================

-- 1. Create emergency_ambulance_settings table to store your Twilio FROM & TO numbers
CREATE TABLE IF NOT EXISTS public.emergency_ambulance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL DEFAULT 'Emergency Ambulance Dispatch',
    twilio_from_number TEXT DEFAULT '',
    twilio_to_number TEXT DEFAULT '',
    notes TEXT DEFAULT 'Primary Twilio Emergency Line',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create ambulance_requests table for tracking real caller dispatch requests
CREATE TABLE IF NOT EXISTS public.ambulance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    caller_name TEXT NOT NULL,
    caller_phone TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    city TEXT NOT NULL,
    urgency TEXT DEFAULT 'CRITICAL' CHECK (urgency IN ('CRITICAL', 'URGENT', 'STANDARD')),
    patient_condition TEXT,
    status TEXT DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'DISPATCHED', 'EN_ROUTE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.emergency_ambulance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for emergency_ambulance_settings
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow all read emergency_ambulance_settings') THEN
        CREATE POLICY "Allow all read emergency_ambulance_settings" 
        ON public.emergency_ambulance_settings FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow authenticated manage emergency_ambulance_settings') THEN
        CREATE POLICY "Allow authenticated manage emergency_ambulance_settings" 
        ON public.emergency_ambulance_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow anon insert emergency_ambulance_settings') THEN
        CREATE POLICY "Allow anon insert emergency_ambulance_settings" 
        ON public.emergency_ambulance_settings FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. RLS Policies for ambulance_requests
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow all read ambulance_requests') THEN
        CREATE POLICY "Allow all read ambulance_requests" 
        ON public.ambulance_requests FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow all insert ambulance_requests') THEN
        CREATE POLICY "Allow all insert ambulance_requests" 
        ON public.ambulance_requests FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 6. Insert initial row if empty (Replace these numbers with your Twilio numbers, or configure via the UI)
INSERT INTO public.emergency_ambulance_settings (service_name, twilio_from_number, twilio_to_number, notes)
SELECT 'Emergency Ambulance Dispatch', '', '', 'Initial Config'
WHERE NOT EXISTS (SELECT 1 FROM public.emergency_ambulance_settings);

-- 7. Remove any fake demo ambulances if ambulance_services exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ambulance_services') THEN
        DELETE FROM public.ambulance_services WHERE name LIKE '%Apollo%' OR name LIKE '%Fortis%' OR name LIKE '%Max Healthcare%';
    END IF;
END $$;

-- 8. View current configured settings
SELECT id, service_name, twilio_from_number, twilio_to_number, is_active, updated_at 
FROM public.emergency_ambulance_settings;

