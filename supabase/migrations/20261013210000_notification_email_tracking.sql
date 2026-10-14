ALTER TABLE public.notificacao
  ADD COLUMN IF NOT EXISTS email_resend_id text,
  ADD COLUMN IF NOT EXISTS email_entregue_em timestamptz,
  ADD COLUMN IF NOT EXISTS email_aberto_em timestamptz,
  ADD COLUMN IF NOT EXISTS email_falha_em timestamptz,
  ADD COLUMN IF NOT EXISTS email_falha_motivo text,
  ADD COLUMN IF NOT EXISTS ciencia_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS ciencia_em timestamptz,
  ADD COLUMN IF NOT EXISTS ciencia_user_agent text;

CREATE UNIQUE INDEX IF NOT EXISTS notificacao_ciencia_token_key
  ON public.notificacao (ciencia_token);
