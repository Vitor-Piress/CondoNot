ALTER TABLE public.condominio
    ADD COLUMN IF NOT EXISTS valor_multa numeric(12,2);

ALTER TABLE public.condominio
    ALTER COLUMN valor_multa TYPE numeric(12,2)
    USING valor_multa::numeric;

ALTER TABLE public.notificacao
    ALTER COLUMN valor_multa TYPE numeric(12,2)
    USING valor_multa::numeric;
