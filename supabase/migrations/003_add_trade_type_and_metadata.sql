-- Add new insight types and metadata column for structured AI intelligence
ALTER TABLE public.ai_insights
  DROP CONSTRAINT IF EXISTS ai_insights_type_check;

ALTER TABLE public.ai_insights
  ADD CONSTRAINT ai_insights_type_check
  CHECK (type IN (
    'alert', 'recommendation', 'market', 'earnings', 'trade',
    'diagnosis', 'alloc_move', 'instrument_pick'
  ));

ALTER TABLE public.ai_insights
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;
