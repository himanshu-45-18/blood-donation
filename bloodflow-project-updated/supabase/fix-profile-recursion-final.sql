-- Final fix for: infinite recursion detected in policy for relation profiles

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT p.role FROM public.profiles AS p WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

DROP POLICY IF EXISTS "select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_own_hospital" ON public.hospitals;

CREATE POLICY "select_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.current_user_role() IN ('admin', 'hospital_admin')
);

CREATE POLICY "update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_update_profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "update_own_hospital"
ON public.hospitals
FOR UPDATE
TO authenticated
USING (
  managed_by = auth.uid()
  OR public.current_user_role() = 'admin'
)
WITH CHECK (
  managed_by = auth.uid()
  OR public.current_user_role() = 'admin'
);
