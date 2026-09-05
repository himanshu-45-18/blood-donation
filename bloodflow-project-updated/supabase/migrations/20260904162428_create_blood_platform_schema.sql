/*
# Blood Donor Platform - Core Schema

## Overview
Creates the complete database schema for a centralized real-time blood inventory
and donor engagement platform. The platform connects donors, hospitals, and admins.

## New Tables

1. **profiles** - Extends Supabase auth.users with role (donor/hospital_admin/admin),
   contact info, blood group (for donors), and verification status.
2. **hospitals** - Hospital records managed by hospital_admin users.
3. **blood_inventory** - Per-hospital blood type inventory (8 blood groups per hospital).
4. **appointments** - Donor scheduling for blood donation at a specific hospital.
5. **certificates** - Auto-generated donation certificates when appointments complete.
6. **emergency_requests** - Hospital emergency blood requests.
7. **emergency_calls** - Tracks calls made to hospitals for emergency requests.

## Triggers
- Auto-create profile on user signup (copies role from user metadata).
- Prevent role changes on profile updates (fraud prevention).
- Auto-create 8 blood inventory rows when a hospital is created.
- Auto-generate certificate when an appointment is marked completed.

## Security (RLS)
- Donors: can read/update own profile, CRUD own appointments, read own certificates.
- Hospital admins: can read donor profiles, manage their hospital, inventory,
  appointments at their hospital, create emergency requests.
- Admins: full read access to everything.
- All tables have RLS enabled with role-aware policies.
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'donor' CHECK (role IN ('donor', 'hospital_admin', 'admin')),
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  blood_group text CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  date_of_birth date,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, phone, blood_group, date_of_birth, address, city)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'donor'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'blood_group', ''),
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date,
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: prevent role changes (fraud prevention)
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.role := OLD.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS prevent_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();

-- Profile RLS policies
DROP POLICY IF EXISTS "select_profiles" ON public.profiles;
CREATE POLICY "select_profiles" ON public.profiles FOR SELECT
TO authenticated USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'hospital_admin')
);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
CREATE POLICY "admin_update_profiles" ON public.profiles FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============================================================
-- HOSPITALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  managed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_hospitals" ON public.hospitals;
CREATE POLICY "select_hospitals" ON public.hospitals FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_hospital" ON public.hospitals;
CREATE POLICY "insert_own_hospital" ON public.hospitals FOR INSERT
TO authenticated WITH CHECK (managed_by = auth.uid());

DROP POLICY IF EXISTS "update_own_hospital" ON public.hospitals;
CREATE POLICY "update_own_hospital" ON public.hospitals FOR UPDATE
TO authenticated
USING (managed_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (managed_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "admin_delete_hospital" ON public.hospitals;
CREATE POLICY "admin_delete_hospital" ON public.hospitals FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Create a pending hospital record as part of hospital account registration.
CREATE OR REPLACE FUNCTION public.create_hospital_for_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'hospital_admin' THEN
    INSERT INTO public.hospitals (name, address, city, phone, managed_by)
    VALUES (NEW.full_name, NEW.address, NEW.city, NEW.phone, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_hospital_profile_created ON public.profiles;
CREATE TRIGGER on_hospital_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_hospital_for_profile();

-- Trigger: auto-create blood inventory rows for new hospital
CREATE OR REPLACE FUNCTION public.create_hospital_inventory()
RETURNS TRIGGER AS $$
DECLARE
  bg TEXT;
BEGIN
  FOREACH bg IN ARRAY ARRAY['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] LOOP
    INSERT INTO public.blood_inventory (hospital_id, blood_group, units_available)
    VALUES (NEW.id, bg, 0)
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_hospital_created ON public.hospitals;
CREATE TRIGGER on_hospital_created
  AFTER INSERT ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.create_hospital_inventory();

-- ============================================================
-- BLOOD INVENTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blood_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  blood_group text NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  units_available integer NOT NULL DEFAULT 0 CHECK (units_available >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, blood_group)
);

ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_blood_inventory" ON public.blood_inventory;
CREATE POLICY "select_blood_inventory" ON public.blood_inventory FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "update_blood_inventory" ON public.blood_inventory;
CREATE POLICY "update_blood_inventory" ON public.blood_inventory FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = blood_inventory.hospital_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = blood_inventory.hospital_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "insert_blood_inventory" ON public.blood_inventory;
CREATE POLICY "insert_blood_inventory" ON public.blood_inventory FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = blood_inventory.hospital_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- APPOINTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_appointments_donor ON public.appointments(donor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON public.appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);

DROP POLICY IF EXISTS "select_appointments" ON public.appointments;
CREATE POLICY "select_appointments" ON public.appointments FOR SELECT
TO authenticated USING (
  donor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = appointments.hospital_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "insert_appointments" ON public.appointments;
CREATE POLICY "insert_appointments" ON public.appointments FOR INSERT
TO authenticated WITH CHECK (
  donor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "update_appointments" ON public.appointments;
CREATE POLICY "update_appointments" ON public.appointments FOR UPDATE
TO authenticated
USING (
  donor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = appointments.hospital_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  donor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = appointments.hospital_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "delete_appointments" ON public.appointments;
CREATE POLICY "delete_appointments" ON public.appointments FOR DELETE
TO authenticated
USING (
  donor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = appointments.hospital_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- CERTIFICATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number text NOT NULL UNIQUE,
  donor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  donor_name text NOT NULL,
  donor_blood_group text,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  hospital_name text NOT NULL,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  donation_date date NOT NULL,
  units_collected integer NOT NULL DEFAULT 1,
  issued_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_certificates_donor ON public.certificates(donor_id);

DROP POLICY IF EXISTS "select_certificates" ON public.certificates;
CREATE POLICY "select_certificates" ON public.certificates FOR SELECT
TO authenticated USING (
  donor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = certificates.hospital_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Trigger: auto-generate certificate when appointment completed
CREATE OR REPLACE FUNCTION public.generate_certificate()
RETURNS TRIGGER AS $$
DECLARE
  donor_record RECORD;
  hospital_record RECORD;
  cert_num TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    SELECT full_name, blood_group INTO donor_record
    FROM public.profiles WHERE id = NEW.donor_id;

    SELECT name INTO hospital_record
    FROM public.hospitals WHERE id = NEW.hospital_id;

    cert_num := 'BDC-' || EXTRACT(YEAR FROM NEW.appointment_date)::TEXT || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8));

    INSERT INTO public.certificates (
      certificate_number, donor_id, donor_name, donor_blood_group,
      hospital_id, hospital_name, appointment_id, donation_date
    ) VALUES (
      cert_num, NEW.donor_id, donor_record.full_name, donor_record.blood_group,
      NEW.hospital_id, hospital_record.name, NEW.id, NEW.appointment_date
    );

    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_appointment_completed ON public.appointments;
CREATE TRIGGER on_appointment_completed
  BEFORE UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.generate_certificate();

-- ============================================================
-- EMERGENCY REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  blood_group text NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  units_needed integer NOT NULL DEFAULT 1 CHECK (units_needed > 0),
  urgency text NOT NULL DEFAULT 'urgent' CHECK (urgency IN ('critical', 'urgent', 'moderate')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'closed')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_emergency_status ON public.emergency_requests(status);

DROP POLICY IF EXISTS "select_emergency_requests" ON public.emergency_requests;
CREATE POLICY "select_emergency_requests" ON public.emergency_requests FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = emergency_requests.requesting_hospital_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "insert_emergency_requests" ON public.emergency_requests;
CREATE POLICY "insert_emergency_requests" ON public.emergency_requests FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = emergency_requests.requesting_hospital_id AND h.managed_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "update_emergency_requests" ON public.emergency_requests;
CREATE POLICY "update_emergency_requests" ON public.emergency_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = emergency_requests.requesting_hospital_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hospitals h
    WHERE h.id = emergency_requests.requesting_hospital_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- EMERGENCY CALLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emergency_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_request_id uuid NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  hospital_name text NOT NULL DEFAULT '',
  hospital_phone text NOT NULL DEFAULT '',
  call_sid text,
  call_status text NOT NULL DEFAULT 'pending' CHECK (call_status IN ('pending', 'calling', 'answered', 'no_answer', 'failed')),
  call_duration integer,
  called_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_emergency_calls" ON public.emergency_calls;
CREATE POLICY "select_emergency_calls" ON public.emergency_calls FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.emergency_requests er
    JOIN public.hospitals h ON h.id = er.requesting_hospital_id
    WHERE er.id = emergency_calls.emergency_request_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "insert_emergency_calls" ON public.emergency_calls;
CREATE POLICY "insert_emergency_calls" ON public.emergency_calls FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.emergency_requests er
    JOIN public.hospitals h ON h.id = er.requesting_hospital_id
    WHERE er.id = emergency_calls.emergency_request_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "update_emergency_calls" ON public.emergency_calls;
CREATE POLICY "update_emergency_calls" ON public.emergency_calls FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.emergency_requests er
    JOIN public.hospitals h ON h.id = er.requesting_hospital_id
    WHERE er.id = emergency_calls.emergency_request_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.emergency_requests er
    JOIN public.hospitals h ON h.id = er.requesting_hospital_id
    WHERE er.id = emergency_calls.emergency_request_id AND h.managed_by = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);