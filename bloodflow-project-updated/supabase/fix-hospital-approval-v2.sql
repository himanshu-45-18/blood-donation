-- Create a uniquely named RPC so PostgREST can discover it without the old schema-cache signature.
CREATE OR REPLACE FUNCTION public.approve_hospital_v2(
  hospital_id uuid,
  approved boolean
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

REVOKE EXECUTE ON FUNCTION public.approve_hospital_v2(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_hospital_v2(uuid, boolean) TO authenticated;
