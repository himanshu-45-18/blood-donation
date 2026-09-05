-- Donor Loyalty & Incentive System
-- Completion is verified by the existing hospital/admin appointment workflow.

CREATE TABLE IF NOT EXISTS public.reward_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_count integer NOT NULL CHECK (donation_count > 0),
  points integer NOT NULL CHECK (points > 0),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  badge text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_rules_count ON public.reward_rules(donation_count);

CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  blood_group text CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  units integer NOT NULL DEFAULT 1 CHECK (units > 0),
  donation_date date NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'rejected')),
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donations_donor ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_date ON public.donations(donation_date);

CREATE TABLE IF NOT EXISTS public.donor_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  donation_id uuid NOT NULL UNIQUE REFERENCES public.donations(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES public.reward_rules(id) ON DELETE SET NULL,
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  reward_title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donor_rewards_donor ON public.donor_rewards(donor_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS completed_donations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_units_donated integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS donor_level text NOT NULL DEFAULT 'Starter';

ALTER TABLE public.reward_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_rewards ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.prevent_unverified_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = NEW.hospital_id AND h.managed_by = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Only the managing hospital or an administrator can verify a donation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS prevent_unverified_completion_trigger ON public.appointments;
CREATE TRIGGER prevent_unverified_completion_trigger
  BEFORE INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unverified_completion();

DROP POLICY IF EXISTS "insert_appointments" ON public.appointments;
CREATE POLICY "insert_appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (
  (donor_id = auth.uid() AND status = 'scheduled')
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "read_reward_rules" ON public.reward_rules;
CREATE POLICY "read_reward_rules" ON public.reward_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_reward_rules" ON public.reward_rules;
CREATE POLICY "manage_reward_rules" ON public.reward_rules FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hospital_admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hospital_admin'))
);

DROP POLICY IF EXISTS "read_own_donations" ON public.donations;
CREATE POLICY "read_own_donations" ON public.donations FOR SELECT TO authenticated USING (
  donor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hospital_admin'))
);

DROP POLICY IF EXISTS "read_own_rewards" ON public.donor_rewards;
CREATE POLICY "read_own_rewards" ON public.donor_rewards FOR SELECT TO authenticated USING (
  donor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hospital_admin'))
);

-- Donors can edit their contact details, but never reward/accounting fields.
CREATE OR REPLACE FUNCTION public.protect_donor_reward_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('bloodflow.reward_update', true) = 'on' THEN
    RETURN NEW;
  END IF;
  NEW.completed_donations := OLD.completed_donations;
  NEW.total_units_donated := OLD.total_units_donated;
  NEW.reward_points := OLD.reward_points;
  NEW.donor_level := OLD.donor_level;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_donor_reward_totals_trigger ON public.profiles;
CREATE TRIGGER protect_donor_reward_totals_trigger
  BEFORE UPDATE OF completed_donations, total_units_donated, reward_points, donor_level ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_donor_reward_totals();

CREATE OR REPLACE FUNCTION public.donor_level_for_count(donation_count integer)
RETURNS text AS $$
BEGIN
  RETURN CASE
    WHEN donation_count >= 10 THEN 'Platinum'
    WHEN donation_count >= 5 THEN 'Gold'
    WHEN donation_count >= 3 THEN 'Silver'
    WHEN donation_count >= 1 THEN 'Bronze'
    ELSE 'Starter'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.award_verified_donation_reward()
RETURNS TRIGGER AS $$
DECLARE
  donation_record public.donations%ROWTYPE;
  donor_count integer;
  rule_record public.reward_rules%ROWTYPE;
BEGIN
  IF NEW.status <> 'completed' OR (OLD IS NOT NULL AND OLD.status = 'completed') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.donations (appointment_id, donor_id, hospital_id, blood_group, units, donation_date, status, verified)
  SELECT NEW.id, NEW.donor_id, NEW.hospital_id, p.blood_group, 1, NEW.appointment_date, 'completed', true
  FROM public.profiles p
  WHERE p.id = NEW.donor_id
  ON CONFLICT (appointment_id) DO NOTHING
  RETURNING * INTO donation_record;

  IF donation_record.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO donor_count
  FROM public.donations
  WHERE donor_id = NEW.donor_id AND status = 'completed' AND verified = true;

  SELECT * INTO rule_record
  FROM public.reward_rules
  WHERE active = true AND donation_count = donor_count
  LIMIT 1;

  INSERT INTO public.donor_rewards (donor_id, donation_id, reward_id, points, reward_title)
  VALUES (
    NEW.donor_id,
    donation_record.id,
    rule_record.id,
    COALESCE(rule_record.points, 0),
    COALESCE(rule_record.title, 'Donation completed')
  )
  ON CONFLICT (donation_id) DO NOTHING;

  PERFORM set_config('bloodflow.reward_update', 'on', true);

  UPDATE public.profiles
  SET completed_donations = donor_count,
      total_units_donated = (SELECT COALESCE(SUM(units), 0) FROM public.donations WHERE donor_id = NEW.donor_id AND status = 'completed' AND verified = true),
      reward_points = (SELECT COALESCE(SUM(points), 0) FROM public.donor_rewards WHERE donor_id = NEW.donor_id),
      donor_level = public.donor_level_for_count(donor_count)
  WHERE id = NEW.donor_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS award_verified_donation_reward_trigger ON public.appointments;
CREATE TRIGGER award_verified_donation_reward_trigger
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.award_verified_donation_reward();

INSERT INTO public.reward_rules (donation_count, points, title, description, badge)
VALUES
  (2, 5, 'Consistency Starter', 'Complete two verified donations.', 'Steady Saver'),
  (3, 10, 'Community Supporter', 'Complete three verified donations.', 'Community Hero'),
  (5, 25, 'Lifeline Champion', 'Complete five verified donations.', 'Lifeline Champion'),
  (10, 50, 'BloodFlow Guardian', 'Complete ten verified donations.', 'BloodFlow Guardian')
ON CONFLICT (donation_count) DO NOTHING;

-- Backfill the trusted ledger for existing completed appointments without duplicating rows.
INSERT INTO public.donations (appointment_id, donor_id, hospital_id, blood_group, units, donation_date, status, verified)
SELECT a.id, a.donor_id, a.hospital_id, p.blood_group, COALESCE(c.units_collected, 1), a.appointment_date, 'completed', true
FROM public.appointments a
JOIN public.profiles p ON p.id = a.donor_id
LEFT JOIN public.certificates c ON c.appointment_id = a.id
WHERE a.status = 'completed'
ON CONFLICT (appointment_id) DO NOTHING;

WITH ordered_donations AS (
  SELECT d.*, ROW_NUMBER() OVER (PARTITION BY d.donor_id ORDER BY d.donation_date, d.created_at, d.id) AS donor_count
  FROM public.donations d
  WHERE d.status = 'completed' AND d.verified = true
)
INSERT INTO public.donor_rewards (donor_id, donation_id, reward_id, points, reward_title)
SELECT d.donor_id, d.id, r.id, COALESCE(r.points, 0), COALESCE(r.title, 'Donation completed')
FROM ordered_donations d
LEFT JOIN public.reward_rules r ON r.active = true AND r.donation_count = d.donor_count
ON CONFLICT (donation_id) DO NOTHING;

UPDATE public.profiles p
SET completed_donations = stats.completed,
    total_units_donated = stats.units,
    reward_points = stats.points,
    donor_level = public.donor_level_for_count(stats.completed)
FROM (
  SELECT p2.id,
    (SELECT COUNT(*) FROM public.donations d WHERE d.donor_id = p2.id AND d.status = 'completed' AND d.verified = true) AS completed,
    (SELECT COALESCE(SUM(d.units), 0) FROM public.donations d WHERE d.donor_id = p2.id AND d.status = 'completed' AND d.verified = true) AS units,
    (SELECT COALESCE(SUM(dr.points), 0) FROM public.donor_rewards dr WHERE dr.donor_id = p2.id) AS points
  FROM public.profiles p2 WHERE p2.role = 'donor'
) stats
WHERE p.id = stats.id;