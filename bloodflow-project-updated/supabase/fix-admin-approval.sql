-- Run this only after public.profiles and public.hospitals exist.
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
CREATE POLICY "select_profiles" ON public.profiles FOR SELECT TO authenticated USING (
  auth.uid() = id OR public.current_user_role() IN ('admin', 'hospital_admin')
);

DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
CREATE POLICY "admin_update_profiles" ON public.profiles FOR UPDATE TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "update_own_hospital" ON public.hospitals;
CREATE POLICY "update_own_hospital" ON public.hospitals FOR UPDATE TO authenticated
USING (managed_by = auth.uid() OR public.current_user_role() = 'admin')
WITH CHECK (managed_by = auth.uid() OR public.current_user_role() = 'admin');

SELECT to_regclass('public.profiles') AS profiles,
       to_regclass('public.hospitals') AS hospitals;
