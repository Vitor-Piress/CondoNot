-- Etapa 1 (segura): cria a estrutura de acesso sem alterar o comportamento atual.

ALTER TABLE public.condominio
  ADD COLUMN IF NOT EXISTS criado_por uuid
    REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid();

CREATE TABLE IF NOT EXISTS public.condominio_membro (
  id_condominio bigint NOT NULL REFERENCES public.condominio (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_condominio, user_id)
);

CREATE INDEX IF NOT EXISTS condominio_membro_user_idx
  ON public.condominio_membro (user_id);

ALTER TABLE public.condominio_membro ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_membro(p_id_condominio bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.condominio_membro
    WHERE id_condominio = p_id_condominio
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_membro(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_membro(bigint) TO authenticated;

-- Quem cria um condomínio passa a ser membro dele automaticamente.
CREATE OR REPLACE FUNCTION public.condominio_adicionar_criador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.criado_por IS NOT NULL THEN
    INSERT INTO public.condominio_membro (id_condominio, user_id)
    VALUES (NEW.id, NEW.criado_por)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS condominio_adicionar_criador ON public.condominio;
CREATE TRIGGER condominio_adicionar_criador
  AFTER INSERT ON public.condominio
  FOR EACH ROW EXECUTE FUNCTION public.condominio_adicionar_criador();
