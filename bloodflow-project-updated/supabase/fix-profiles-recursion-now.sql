-- Remove the recursive profiles policies that break every dashboard.
DROP POLICY IF EXISTS "select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;

-- Temporary functional policy: authenticated platform users can read profiles.
-- This is intentionally non-recursive so dashboards can load normally.
CREATE POLICY "select_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

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
USING (true)
WITH CHECK (true);
