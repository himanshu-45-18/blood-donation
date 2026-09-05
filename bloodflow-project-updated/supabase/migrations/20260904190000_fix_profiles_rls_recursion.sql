-- Fix recursive RLS checks that query public.profiles from inside profiles/hospital policies.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

DROP POLICY IF EXISTS "select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "select_hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "insert_own_hospital" ON public.hospitals;
DROP POLICY IF EXISTS "update_own_hospital" ON public.hospitals;
DROP POLICY IF EXISTS "admin_delete_hospital" ON public.hospitals;
DROP POLICY IF EXISTS "select_blood_inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "update_blood_inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "insert_blood_inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "select_appointments" ON public.appointments;
DROP POLICY IF EXISTS "insert_appointments" ON public.appointments;
DROP POLICY IF EXISTS "update_appointments" ON public.appointments;
DROP POLICY IF EXISTS "delete_appointments" ON public.appointments;
DROP POLICY IF EXISTS "select_certificates" ON public.certificates;
DROP POLICY IF EXISTS "select_emergency_requests" ON public.emergency_requests;
DROP POLICY IF EXISTS "insert_emergency_requests" ON public.emergency_requests;
DROP POLICY IF EXISTS "update_emergency_requests" ON public.emergency_requests;
DROP POLICY IF EXISTS "select_emergency_calls" ON public.emergency_calls;
DROP POLICY IF EXISTS "insert_emergency_calls" ON public.emergency_calls;
DROP POLICY IF EXISTS "update_emergency_calls" ON public.emergency_calls;

CREATE POLICY "select_profiles" ON public.profiles FOR SELECT TO authenticated USING (
  auth.uid() = id OR public.current_user_role() IN ('admin', 'hospital_admin')
);
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "admin_update_profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "select_hospitals" ON public.hospitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_hospital" ON public.hospitals FOR INSERT TO authenticated
  WITH CHECK (managed_by = auth.uid());
CREATE POLICY "update_own_hospital" ON public.hospitals FOR UPDATE TO authenticated
  USING (managed_by = auth.uid() OR public.current_user_role() = 'admin')
  WITH CHECK (managed_by = auth.uid() OR public.current_user_role() = 'admin');
CREATE POLICY "admin_delete_hospital" ON public.hospitals FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "select_blood_inventory" ON public.blood_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "update_blood_inventory" ON public.blood_inventory FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = blood_inventory.hospital_id AND h.managed_by = auth.uid())
    OR public.current_user_role() = 'admin'
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = blood_inventory.hospital_id AND h.managed_by = auth.uid())
    OR public.current_user_role() = 'admin'
  );
CREATE POLICY "insert_blood_inventory" ON public.blood_inventory FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = blood_inventory.hospital_id AND h.managed_by = auth.uid())
    OR public.current_user_role() = 'admin'
  );

CREATE POLICY "select_appointments" ON public.appointments FOR SELECT TO authenticated USING (
  donor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = appointments.hospital_id AND h.managed_by = auth.uid())
  OR public.current_user_role() = 'admin'
);
CREATE POLICY "insert_appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (
  donor_id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY "update_appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (
    donor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = appointments.hospital_id AND h.managed_by = auth.uid())
    OR public.current_user_role() = 'admin'
  )
  WITH CHECK (
    donor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = appointments.hospital_id AND h.managed_by = auth.uid())
    OR public.current_user_role() = 'admin'
  );
CREATE POLICY "delete_appointments" ON public.appointments FOR DELETE TO authenticated USING (
  donor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = appointments.hospital_id AND h.managed_by = auth.uid())
  OR public.current_user_role() = 'admin'
);

CREATE POLICY "select_certificates" ON public.certificates FOR SELECT TO authenticated USING (
  donor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = certificates.hospital_id AND h.managed_by = auth.uid())
  OR public.current_user_role() = 'admin'
);

CREATE POLICY "select_emergency_requests" ON public.emergency_requests FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = emergency_requests.requesting_hospital_id AND h.managed_by = auth.uid())
  OR public.current_user_role() = 'admin'
);
CREATE POLICY "insert_emergency_requests" ON public.emergency_requests FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = emergency_requests.requesting_hospital_id AND h.managed_by = auth.uid())
);
CREATE POLICY "update_emergency_requests" ON public.emergency_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = emergency_requests.requesting_hospital_id AND h.managed_by = auth.uid())
    OR public.current_user_role() = 'admin'
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = emergency_requests.requesting_hospital_id AND h.managed_by = auth.uid())
    OR public.current_user_role() = 'admin'
  );

CREATE POLICY "select_emergency_calls" ON public.emergency_calls FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.emergency_requests er
    JOIN public.hospitals h ON h.id = er.requesting_hospital_id
    WHERE er.id = emergency_calls.emergency_request_id AND h.managed_by = auth.uid()
  ) OR public.current_user_role() = 'admin'
);
CREATE POLICY "insert_emergency_calls" ON public.emergency_calls FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.emergency_requests er
    JOIN public.hospitals h ON h.id = er.requesting_hospital_id
    WHERE er.id = emergency_calls.emergency_request_id AND h.managed_by = auth.uid()
  ) OR public.current_user_role() = 'admin'
);
CREATE POLICY "update_emergency_calls" ON public.emergency_calls FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.emergency_requests er
      JOIN public.hospitals h ON h.id = er.requesting_hospital_id
      WHERE er.id = emergency_calls.emergency_request_id AND h.managed_by = auth.uid()
    ) OR public.current_user_role() = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.emergency_requests er
      JOIN public.hospitals h ON h.id = er.requesting_hospital_id
      WHERE er.id = emergency_calls.emergency_request_id AND h.managed_by = auth.uid()
    ) OR public.current_user_role() = 'admin'
  );
