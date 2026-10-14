import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_ADDRESS = Deno.env.get('RESEND_FROM') ?? 'CondoNot <notificacoes@condonot.com.br>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Trata requisições CORS (necessário se chamar direto do React)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, attachments, tags, notificacao_id } = await req.json()

    // O client usa o token do usuário: o RLS só devolve a notificação se ele for membro.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )

    const { data: notification } = notificacao_id
      ? await userClient.from('notificacao').select('id_unidade').eq('id', notificacao_id).maybeSingle()
      : { data: null }

    const { data: unit } = notification
      ? await userClient.from('unidades').select('proprietario, inquilino').eq('id', notification.id_unidade).maybeSingle()
      : { data: null }

    const allowedEmails = [unit?.proprietario, unit?.inquilino]
      .map((person) => person?.contato_email ?? person?.contatoEmail ?? person?.email)
      .filter((email): email is string => typeof email === 'string')
      .map((email) => email.trim().toLowerCase())

    if (!unit || typeof to !== 'string' || !allowedEmails.includes(to.trim().toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`, 
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject: subject,
        html: html,
        attachments: attachments,
        tags: tags,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: res.ok ? 200 : 400,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})