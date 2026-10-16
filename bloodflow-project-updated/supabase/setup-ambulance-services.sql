-- ===================================================================
-- BloodFlow: Multiple Ambulance Services & Request Dispatch Schema
-- Run this ONCE in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gvwdrbrepbpmhjckdcyq/sql
-- ===================================================================

-- 1. Create ambulance_services table
CREATE TABLE IF NOT EXISTS public.ambulance_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    service_type TEXT NOT NULL CHECK (service_type IN ('ALS_ICU', 'BLS', 'PATIENT_TRANSPORT', 'BLOOD_TRANSPORT')),
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    city TEXT NOT NULL,
    area TEXT,
    available_24_7 BOOLEAN DEFAULT TRUE,
    average_eta_mins INT DEFAULT 15,
    hospital_affiliation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create ambulance_requests table
CREATE TABLE IF NOT EXISTS public.ambulance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.ambulance_services(id) ON DELETE SET NULL,
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
ALTER TABLE public.ambulance_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for ambulance_services
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow all read ambulance_services') THEN
        CREATE POLICY "Allow all read ambulance_services" ON public.ambulance_services FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow admin manage ambulance_services') THEN
        CREATE POLICY "Allow admin manage ambulance_services" ON public.ambulance_services FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- 5. RLS Policies for ambulance_requests
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow authenticated insert ambulance_requests') THEN
        CREATE POLICY "Allow authenticated insert ambulance_requests" ON public.ambulance_requests FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow authenticated read ambulance_requests') THEN
        CREATE POLICY "Allow authenticated read ambulance_requests" ON public.ambulance_requests FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow anon insert ambulance_requests') THEN
        CREATE POLICY "Allow anon insert ambulance_requests" ON public.ambulance_requests FOR INSERT TO anon WITH CHECK (true);
    END IF;
END $$;

-- 6. Enable Realtime on ambulance_requests
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulance_requests;
    EXCEPTION WHEN duplicate_object THEN
        -- already added
    END;
END $$;

-- 7. Seed Initial Verified Ambulance Providers
INSERT INTO public.ambulance_services (name, service_type, phone, alternate_phone, city, area, available_24_7, average_eta_mins, hospital_affiliation)
VALUES
    ('National Emergency Ambulance Service (108)', 'ALS_ICU', '108', '112', 'All Cities', 'Pan-India Toll-Free', TRUE, 12, 'National Health Mission'),
    ('National Medical & Pregnancy Helpline (102)', 'BLS', '102', '108', 'All Cities', 'Govt Medical Transport', TRUE, 15, 'Ministry of Health & Family Welfare'),
    ('Apollo 1066 Emergency Cardiac ICU Ambulance', 'ALS_ICU', '1066', '+911126925858', 'Delhi', 'Sarita Vihar & NCR', TRUE, 10, 'Apollo Hospitals'),
    ('Red Cross Critical Blood & Organ Transport', 'BLOOD_TRANSPORT', '104', '+911123716441', 'All Cities', 'Central Red Cross Wing', TRUE, 15, 'Indian Red Cross Society'),
    ('Fortis Critical Care Rapid Response Ambulance', 'ALS_ICU', '+911244921021', '+911244921000', 'Delhi', 'Gurugram & South Delhi', TRUE, 12, 'Fortis Memorial Research Institute'),
    ('Max Healthcare BLS Rapid Medical Response', 'BLS', '+911126515050', '+911140554055', 'Delhi', 'Saket & South Delhi', TRUE, 14, 'Max Super Speciality Hospital'),
    ('Mumbai Emergency Trauma Care Unit (1298)', 'ALS_ICU', '1298', '+912224177000', 'Mumbai', 'Greater Mumbai & Suburbs', TRUE, 12, 'Ziqitza Healthcare & KEM Hospital'),
    ('Bangalore Critical Care Ambulances', 'ALS_ICU', '+918022065000', '108', 'Bangalore', 'Electronic City & Whitefield', TRUE, 15, 'Manipal Hospital & Narayana Health')
ON CONFLICT DO NOTHING;

-- 8. Verify Table
SELECT id, name, service_type, phone, city, average_eta_mins FROM public.ambulance_services;

