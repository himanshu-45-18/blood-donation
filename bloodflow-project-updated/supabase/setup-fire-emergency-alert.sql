-- =========================================================
-- BLOODFLOW SMART BLOOD BANK IOT - FIRE & EMERGENCY ALERT SQL
-- Paste this script into your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/gvwdrbrepbpmhjckdcyq/sql/new)
-- =========================================================

-- 1. Create emergency_events table if not exists
CREATE TABLE IF NOT EXISTS public.emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT DEFAULT 'BLOOD-BANK-01',
  source TEXT NOT NULL, -- 'hardware_button' | 'web_button'
  emergency_type TEXT DEFAULT 'FIRE',
  message TEXT,
  status TEXT DEFAULT 'CALL_INITIATED', -- 'CALL_INITIATED' | 'CALL_FAILED' | 'BLOCKED_COOLDOWN'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
DROP POLICY IF EXISTS "Allow public read access on emergency_events" ON public.emergency_events;
CREATE POLICY "Allow public read access on emergency_events"
  ON public.emergency_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access on emergency_events" ON public.emergency_events;
CREATE POLICY "Allow public insert access on emergency_events"
  ON public.emergency_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on emergency_events" ON public.emergency_events;
CREATE POLICY "Allow public update access on emergency_events"
  ON public.emergency_events FOR UPDATE USING (true);

-- 4. Enable Supabase Realtime Publication for emergency_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'emergency_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_events;
  END IF;
END $$;

