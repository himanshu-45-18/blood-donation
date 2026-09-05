ALTER TABLE public.emergency_calls
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.emergency_calls DROP CONSTRAINT IF EXISTS emergency_calls_call_status_check;
ALTER TABLE public.emergency_calls
  ADD CONSTRAINT emergency_calls_call_status_check
  CHECK (call_status IN ('pending', 'calling', 'initiated', 'ringing', 'answered', 'completed', 'no_answer', 'failed'));

CREATE INDEX IF NOT EXISTS idx_emergency_calls_sid ON public.emergency_calls(call_sid);