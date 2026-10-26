-- Adiciona suporte a texto_apoio específico na notificação (até 500 caracteres),
-- permitido apenas quando o modelo_notificacao vinculado não possui texto_apoio próprio,
-- e aplica limites de tamanho para motivo (até 800 caracteres) e texto_apoio.

ALTER TABLE public.notificacao
  ADD COLUMN IF NOT EXISTS texto_apoio text;

ALTER TABLE public.notificacao
  DROP CONSTRAINT IF EXISTS notificacao_texto_apoio_length_check;

ALTER TABLE public.notificacao
  ADD CONSTRAINT notificacao_texto_apoio_length_check
  CHECK (
    texto_apoio IS NULL
    OR (
      char_length(btrim(texto_apoio)) >= 5
      AND char_length(texto_apoio) <= 500
    )
  );

ALTER TABLE public.notificacao
  DROP CONSTRAINT IF EXISTS notificacao_motivo_length_check;

ALTER TABLE public.notificacao
  ADD CONSTRAINT notificacao_motivo_length_check
  CHECK (
    motivo IS NULL
    OR (
      char_length(btrim(motivo)) >= 6
      AND char_length(motivo) <= 800
    )
  ) NOT VALID;

ALTER TABLE public.modelo_notificacao
  DROP CONSTRAINT IF EXISTS modelo_notificacao_texto_apoio_length_check;

ALTER TABLE public.modelo_notificacao
  ADD CONSTRAINT modelo_notificacao_texto_apoio_length_check
  CHECK (
    texto_apoio IS NULL
    OR (
      char_length(btrim(texto_apoio)) >= 5
      AND char_length(texto_apoio) <= 500
    )
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.notificacao_validar_texto_apoio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modelo_texto_apoio text;
BEGIN
  NEW.texto_apoio := NULLIF(btrim(COALESCE(NEW.texto_apoio, '')), '');

  IF NEW.texto_apoio IS NOT NULL THEN
    SELECT NULLIF(btrim(COALESCE(m.texto_apoio, '')), '')
      INTO v_modelo_texto_apoio
      FROM public.modelo_notificacao m
     WHERE m.id = NEW.id_tipo_notificacao
       AND m.id_condominio = NEW.id_condominio;

    IF v_modelo_texto_apoio IS NOT NULL THEN
      RAISE EXCEPTION 'Este modelo de notificação já possui um texto de apoio padrão.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notificacao_validar_texto_apoio ON public.notificacao;
CREATE TRIGGER notificacao_validar_texto_apoio
  BEFORE INSERT OR UPDATE ON public.notificacao
  FOR EACH ROW EXECUTE FUNCTION public.notificacao_validar_texto_apoio();

