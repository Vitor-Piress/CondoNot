-- Etapa 2: ativa o RLS por membro. Só rode depois de (1) criar seu usuário,
-- (2) vincular os condomínios existentes a ele e (3) publicar o front com login.

-- Remove as policies de teste.
DROP POLICY IF EXISTS "All para testes" ON public.condominio;
DROP POLICY IF EXISTS "All para testes" ON public.unidades;
DROP POLICY IF EXISTS "All para testes" ON public.notificacao;
DROP POLICY IF EXISTS "All para testes" ON public.notificacao_anexo;
DROP POLICY IF EXISTS "All para testes" ON public.modelo_notificacao;

-- anon não acessa mais nenhuma tabela.
REVOKE ALL ON TABLE
  public.condominio, public.unidades, public.notificacao,
  public.notificacao_anexo, public.modelo_notificacao, public.condominio_membro
FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.condominio, public.unidades, public.notificacao,
  public.notificacao_anexo, public.modelo_notificacao
TO authenticated;
GRANT SELECT ON TABLE public.condominio_membro TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- condominio_membro: cada usuário só enxerga os próprios vínculos.
-- Criar/alterar vínculos é feito apenas pelo painel (service role).
DROP POLICY IF EXISTS membro_select ON public.condominio_membro;
CREATE POLICY membro_select ON public.condominio_membro
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- condominio
DROP POLICY IF EXISTS condominio_select ON public.condominio;
DROP POLICY IF EXISTS condominio_insert ON public.condominio;
DROP POLICY IF EXISTS condominio_update ON public.condominio;
DROP POLICY IF EXISTS condominio_delete ON public.condominio;

-- criado_por permite o retorno do INSERT ... RETURNING antes do vínculo existir.
CREATE POLICY condominio_select ON public.condominio
  FOR SELECT TO authenticated
  USING (criado_por = auth.uid() OR public.is_membro(id));
CREATE POLICY condominio_insert ON public.condominio
  FOR INSERT TO authenticated
  WITH CHECK (criado_por = auth.uid());
CREATE POLICY condominio_update ON public.condominio
  FOR UPDATE TO authenticated
  USING (public.is_membro(id))
  WITH CHECK (public.is_membro(id));
CREATE POLICY condominio_delete ON public.condominio
  FOR DELETE TO authenticated
  USING (public.is_membro(id));

-- Tabelas filhas, isoladas por id_condominio.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['unidades', 'notificacao', 'notificacao_anexo', 'modelo_notificacao']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS membro_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY membro_all ON public.%I FOR ALL TO authenticated
         USING (public.is_membro(id_condominio))
         WITH CHECK (public.is_membro(id_condominio))',
      t
    );
  END LOOP;
END;
$$;

-- Storage: remove policies antigas dos buckets do app e recria por membro.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (
        coalesce(qual, '') ~ '(notificacoes-anexos|regimentos-internos|images-app)'
        OR coalesce(with_check, '') ~ '(notificacoes-anexos|regimentos-internos|images-app)'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END;
$$;

-- Caminhos: condominios/<id_condominio>/... ; CASE evita cast inválido.
CREATE OR REPLACE FUNCTION public.storage_membro_do_caminho(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (storage.foldername(p_name))[1] = 'condominios'
     AND (storage.foldername(p_name))[2] ~ '^[0-9]+$'
    THEN public.is_membro(((storage.foldername(p_name))[2])::bigint)
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.storage_membro_do_caminho(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_membro_do_caminho(text) TO authenticated;

CREATE POLICY app_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('notificacoes-anexos', 'regimentos-internos', 'images-app')
    AND public.storage_membro_do_caminho(name)
  );
CREATE POLICY app_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('notificacoes-anexos', 'regimentos-internos', 'images-app')
    AND public.storage_membro_do_caminho(name)
  );
CREATE POLICY app_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('notificacoes-anexos', 'regimentos-internos', 'images-app')
    AND public.storage_membro_do_caminho(name)
  )
  WITH CHECK (
    bucket_id IN ('notificacoes-anexos', 'regimentos-internos', 'images-app')
    AND public.storage_membro_do_caminho(name)
  );
CREATE POLICY app_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('notificacoes-anexos', 'regimentos-internos', 'images-app')
    AND public.storage_membro_do_caminho(name)
  );
