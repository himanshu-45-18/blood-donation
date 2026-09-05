-- Confirm the tables exist before running this query.
SELECT to_regclass('public.profiles') AS profiles,
       to_regclass('public.hospitals') AS hospitals;

-- Role lookup runs outside normal RLS evaluation.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role FROM public.profiles AS p WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

DROP POLICY IF EXISTS "update_own_hospital" ON public.hospitals;

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
