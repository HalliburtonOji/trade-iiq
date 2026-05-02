ALTER TABLE public.oracle_sessions
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_os_user_last ON public.oracle_sessions (user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_om_session ON public.oracle_messages (session_id, created_at);

ALTER TABLE public.xp_ledger DROP CONSTRAINT IF EXISTS xp_ledger_source_check;
ALTER TABLE public.xp_ledger ADD CONSTRAINT xp_ledger_source_check
  CHECK (source IN (
    'initiation','morning_brief','evening_reflection','codex','demo_trade',
    'council','playbook','review','oracle',
    'daily_mission','trading_mission','drill','scenario'
  ));