import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, action } = await req.json()

    if (typeof token !== 'string' || !UUID_REGEX.test(token)) {
      return json({ error: 'Link inválido.' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: notification, error } = await supabase
      .from('notificacao')
      .select('id, categoria, created_at, ciencia_em, id_condominio, id_unidade, id_tipo_notificacao')
      .eq('ciencia_token', token)
      .maybeSingle()

    if (error) {
      return json({ error: 'Não foi possível consultar a notificação.' }, 500)
    }
    if (!notification) {
      return json({ error: 'Link inválido ou expirado.' }, 404)
    }

    // Só uma ação explícita (clique no botão) registra a ciência, evitando que
    // leitores automáticos de e-mail confirmem sozinhos ao abrir o link.
    if (action === 'confirm' && !notification.ciencia_em) {
      const { error: updateError } = await supabase
        .from('notificacao')
        .update({
          ciencia_em: new Date().toISOString(),
          ciencia_user_agent: (req.headers.get('user-agent') ?? '').slice(0, 300),
        })
        .eq('id', notification.id)
        .is('ciencia_em', null)

      if (updateError) {
        return json({ error: 'Não foi possível registrar a ciência.' }, 500)
      }
      notification.ciencia_em = new Date().toISOString()
    }

    const [{ data: condominio }, { data: unit }, { data: type }] = await Promise.all([
      supabase.from('condominio').select('name').eq('id', notification.id_condominio).maybeSingle(),
      supabase.from('unidades').select('bloco, apartamento').eq('id', notification.id_unidade).maybeSingle(),
      supabase.from('modelo_notificacao').select('titulo').eq('id', notification.id_tipo_notificacao).maybeSingle(),
    ])

    return json({
      categoria: notification.categoria,
      createdAt: notification.created_at,
      cienciaEm: notification.ciencia_em,
      condominio: condominio?.name ?? null,
      unidade: unit ? `Bloco ${unit.bloco}, unidade ${unit.apartamento}` : null,
      tipo: type?.titulo ?? null,
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400)
  }
})
