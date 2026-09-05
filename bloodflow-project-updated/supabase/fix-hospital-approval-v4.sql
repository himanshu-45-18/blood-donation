-- Create the approval RPC and force PostgREST to reload its schema cache.
CREATE OR REPLACE FUNCTION public.approve_hospital_v4(
  approved boolean,
  hospital_id uuid
)
RETURNS public.hospitals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  actor_role text;
  updated_hospital public.hospitals;
BEGIN
  SELECT role INTO actor_role FROM public.profiles WHERE id = auth.uid();
  IF actor_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can approve hospitals';
  END IF;

  UPDATE public.hospitals
  SET is_approved = approved
  WHERE id = hospital_id
  RETURNING * INTO updated_hospital;

  IF updated_hospital.id IS NULL THEN
    RAISE EXCEPTION 'Hospital not found';
  END IF;
  RETURN updated_hospital;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_hospital_v4(boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_hospital_v4(boolean, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'approve_hospital_v4';
