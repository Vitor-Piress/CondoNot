-- Gestão de acessos por condomínio (Admin vs Operador) e autoria nas notificações.

-- 1. Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS public.perfil_usuario (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nome text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.perfil_usuario ENABLE ROW LEVEL SECURITY;

-- Função para verificar se o usuário logado é administrador global
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfil_usuario
    WHERE user_id = auth.uid()
      AND is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Promove automaticamente a admin quem já cadastrou condomínios
INSERT INTO public.perfil_usuario (user_id, is_admin)
SELECT DISTINCT criado_por, true
FROM public.condominio
WHERE criado_por IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET is_admin = true;

-- Se ainda não houver nenhum admin cadastrado, promove o usuário mais antigo do projeto
INSERT INTO public.perfil_usuario (user_id, is_admin)
SELECT id, true
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.perfil_usuario WHERE is_admin = true)
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id) DO UPDATE SET is_admin = true;

-- Garante que todos os usuários existentes tenham um registro em perfil_usuario
INSERT INTO public.perfil_usuario (user_id, is_admin)
SELECT id, false
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Trigger para criar perfil automaticamente quando um novo usuário for criado no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfil_usuario (user_id, nome, is_admin)
  VALUES (
    NEW.id,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '')), ''),
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_perfil ON auth.users;
CREATE TRIGGER on_auth_user_created_perfil
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_perfil();

-- Policies de perfil_usuario
GRANT SELECT ON TABLE public.perfil_usuario TO authenticated;

DROP POLICY IF EXISTS perfil_usuario_select ON public.perfil_usuario;
CREATE POLICY perfil_usuario_select ON public.perfil_usuario
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 2. Atualiza is_membro para que administradores tenham acesso a todos os condomínios
-- e usuários comuns tenham acesso apenas aos condomínios vinculados em condominio_membro
CREATE OR REPLACE FUNCTION public.is_membro(p_id_condominio bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1
    FROM public.condominio_membro
    WHERE id_condominio = p_id_condominio
      AND user_id = auth.uid()
  );
$$;

-- Atualiza policies de condominio_membro
DROP POLICY IF EXISTS membro_select ON public.condominio_membro;
CREATE POLICY membro_select ON public.condominio_membro
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Atualiza policies de condominio:
-- Somente admin pode criar ou excluir condomínios.
DROP POLICY IF EXISTS condominio_select ON public.condominio;
DROP POLICY IF EXISTS condominio_insert ON public.condominio;
DROP POLICY IF EXISTS condominio_update ON public.condominio;
DROP POLICY IF EXISTS condominio_delete ON public.condominio;

CREATE POLICY condominio_select ON public.condominio
  FOR SELECT TO authenticated
  USING (public.is_membro(id));

CREATE POLICY condominio_insert ON public.condominio
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY condominio_update ON public.condominio
  FOR UPDATE TO authenticated
  USING (public.is_membro(id))
  WITH CHECK (public.is_membro(id));

CREATE POLICY condominio_delete ON public.condominio
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Impede que operadores não-admin alterem dados cadastrais do condomínio (permitindo apenas o upload de regimento interno)
CREATE OR REPLACE FUNCTION public.condominio_restringir_edicao_nao_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.name IS DISTINCT FROM OLD.name
       OR NEW.location IS DISTINCT FROM OLD.location
       OR NEW.logo_url IS DISTINCT FROM OLD.logo_url
       OR NEW.valor_multa IS DISTINCT FROM OLD.valor_multa
       OR NEW.criado_por IS DISTINCT FROM OLD.criado_por
    THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar os dados cadastrais do condomínio.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS condominio_restringir_edicao_nao_admin ON public.condominio;
CREATE TRIGGER condominio_restringir_edicao_nao_admin
  BEFORE UPDATE ON public.condominio
  FOR EACH ROW EXECUTE FUNCTION public.condominio_restringir_edicao_nao_admin();

-- 3. Funções RPC para gerenciamento de acessos no painel (exclusivas para admin)
CREATE OR REPLACE FUNCTION public.listar_usuarios_acessos()
RETURNS TABLE (
  user_id uuid,
  email text,
  nome text,
  is_admin boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  condominio_ids bigint[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem listar os acessos do sistema.';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    COALESCE(u.email::text, '') AS email,
    COALESCE(
      NULLIF(TRIM(p.nome), ''),
      NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', '')), '')
    ) AS nome,
    COALESCE(p.is_admin, false) AS is_admin,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(
      ARRAY(
        SELECT cm.id_condominio
        FROM public.condominio_membro cm
        WHERE cm.user_id = u.id
        ORDER BY cm.id_condominio ASC
      ),
      ARRAY[]::bigint[]
    ) AS condominio_ids
  FROM auth.users u
  LEFT JOIN public.perfil_usuario p ON p.user_id = u.id
  ORDER BY COALESCE(p.is_admin, false) DESC, u.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_usuarios_acessos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_usuarios_acessos() TO authenticated;

CREATE OR REPLACE FUNCTION public.atualizar_acesso_usuario(
  p_user_id uuid,
  p_nome text,
  p_is_admin boolean,
  p_condominio_ids bigint[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar acessos de usuários.';
  END IF;

  IF p_user_id = auth.uid() AND NOT COALESCE(p_is_admin, false) THEN
    RAISE EXCEPTION 'Você não pode remover seu próprio perfil de administrador.';
  END IF;

  INSERT INTO public.perfil_usuario (user_id, nome, is_admin)
  VALUES (
    p_user_id,
    NULLIF(TRIM(COALESCE(p_nome, '')), ''),
    COALESCE(p_is_admin, false)
  )
  ON CONFLICT (user_id) DO UPDATE
    SET nome = EXCLUDED.nome,
        is_admin = EXCLUDED.is_admin;

  DELETE FROM public.condominio_membro
  WHERE user_id = p_user_id
    AND NOT (id_condominio = ANY(COALESCE(p_condominio_ids, ARRAY[]::bigint[])));

  INSERT INTO public.condominio_membro (id_condominio, user_id)
  SELECT DISTINCT cid, p_user_id
  FROM unnest(COALESCE(p_condominio_ids, ARRAY[]::bigint[])) AS cid
  WHERE EXISTS (SELECT 1 FROM public.condominio c WHERE c.id = cid)
  ON CONFLICT (id_condominio, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_acesso_usuario(uuid, text, boolean, bigint[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_acesso_usuario(uuid, text, boolean, bigint[]) TO authenticated;

-- 4. Registro de quem criou cada notificação
ALTER TABLE public.notificacao
  ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS criado_por_email text,
  ADD COLUMN IF NOT EXISTS criado_por_nome text;

CREATE OR REPLACE FUNCTION public.notificacao_preencher_autor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_nome text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.criado_por := auth.uid();
    END IF;

    IF NEW.criado_por IS NOT NULL THEN
      SELECT
        u.email::text,
        COALESCE(
          NULLIF(TRIM(p.nome), ''),
          NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', '')), '')
        )
      INTO v_email, v_nome
      FROM auth.users u
      LEFT JOIN public.perfil_usuario p ON p.user_id = u.id
      WHERE u.id = NEW.criado_por;

      NEW.criado_por_email := COALESCE(v_email, NEW.criado_por_email);
      NEW.criado_por_nome := COALESCE(v_nome, NEW.criado_por_nome);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Preserva o autor original da notificação em qualquer atualização posterior
    NEW.criado_por := OLD.criado_por;
    NEW.criado_por_email := OLD.criado_por_email;
    NEW.criado_por_nome := OLD.criado_por_nome;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notificacao_preencher_autor ON public.notificacao;
CREATE TRIGGER notificacao_preencher_autor
  BEFORE INSERT OR UPDATE ON public.notificacao
  FOR EACH ROW EXECUTE FUNCTION public.notificacao_preencher_autor();

