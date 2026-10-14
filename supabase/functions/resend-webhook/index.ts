import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET')!
const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
}

// Valida a assinatura Svix usada pelo Resend nos webhooks.
async function verifySignature(req: Request, body: string): Promise<boolean> {
  const id = req.headers.get('svix-id')
  const timestamp = req.headers.get('svix-timestamp')
  const signatures = req.headers.get('svix-signature')
  if (!id || !timestamp || !signatures) return false

  const skew = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(skew) || skew > MAX_TIMESTAMP_SKEW_SECONDS) return false

  const key = await crypto.subtle.importKey(
    'raw',
    base64ToBytes(WEBHOOK_SECRET.replace(/^whsec_/, '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`),
  )
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed)))

  return signatures
    .split(' ')
    .some((entry) => entry.split(',')[1] === expected)
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.text()

  if (!WEBHOOK_SECRET || !(await verifySignature(req, body))) {
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(body)
  const data = event.data ?? {}
  const emailId: string | undefined = data.email_id
  const tags = data.tags ?? {}
  const notificationId = Array.isArray(tags)
    ? tags.find((t: { name: string }) => t.name === 'notificacao_id')?.value
    : tags.notificacao_id

  if (!emailId || !notificationId) {
    return new Response('ignored', { status: 200 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: current } = await supabase
    .from('notificacao')
    .select('email_resend_id')
    .eq('id', notificationId)
    .maybeSingle()

  if (!current) {
    return new Response('ignored', { status: 200 })
  }

  const occurredAt = event.created_at ?? new Date().toISOString()
  const update: Record<string, unknown> = {}

  // Um novo envio (id diferente) começa um histórico de eventos limpo.
  if (current.email_resend_id !== emailId) {
    Object.assign(update, {
      email_resend_id: emailId,
      email_entregue_em: null,
      email_aberto_em: null,
      email_falha_em: null,
      email_falha_motivo: null,
    })
  }

  switch (event.type) {
    case 'email.delivered':
      update.email_entregue_em = occurredAt
      break
    case 'email.opened':
      update.email_aberto_em = occurredAt
      break
    case 'email.bounced':
      update.email_falha_em = occurredAt
      update.email_falha_motivo = 'Endereço rejeitado (bounce)'
      break
    case 'email.complained':
      update.email_falha_em = occurredAt
      update.email_falha_motivo = 'Marcado como spam'
      break
    case 'email.failed':
      update.email_falha_em = occurredAt
      update.email_falha_motivo = 'Falha no envio'
      break
    default:
      if (Object.keys(update).length === 0) {
        return new Response('ignored', { status: 200 })
      }
  }

  const { error } = await supabase
    .from('notificacao')
    .update(update)
    .eq('id', notificationId)

  if (error) {
    return new Response('db error', { status: 500 })
  }

  return new Response('ok', { status: 200 })
})
