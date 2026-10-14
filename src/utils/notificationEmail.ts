import type { Condominio, Notification, Unit } from "../types/domain";
import { formatOnlyDateInFull } from "./format";
import { getNotificationPrintCopy } from "./notificationPrint";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const KIND_LABELS = {
  warning: { noun: "advertência", article: "uma", subject: "Advertência" },
  guidance: {
    noun: "carta de orientação",
    article: "uma",
    subject: "Carta de orientação",
  },
  fine: { noun: "aviso de multa", article: "um", subject: "Aviso de multa" },
} as const;

function detailRow(title: string, value: string): string {
  return `<tr>
      <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top;">${title}</td>
      <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`;
}

export function buildNotificationEmail(input: {
  notification: Notification;
  unit: Unit;
  condominio: Condominio | null;
  typeTitle: string;
  cienciaUrl: string;
}): { subject: string; html: string } {
  const { notification, unit, condominio, typeTitle, cienciaUrl } = input;
  const kind = getNotificationPrintCopy(notification.categoria).kind;
  const label = KIND_LABELS[kind];
  const condominioName = condominio?.name ?? "condomínio";
  const unitLabel = `Bloco ${unit.bloco}, unidade ${unit.apartamento ?? "-"}`;
  const recipientName =
    unit.inquilino?.nome?.trim() || unit.proprietario?.nome?.trim() || null;
  const greeting = recipientName
    ? `Prezado(a) ${escapeHtml(recipientName)},`
    : "Prezado(a) condômino(a),";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
    <tr>
      <td style="padding:28px 32px 8px 32px;">
        <p style="margin:0;color:#64748b;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(condominioName)}</p>
        <h1 style="margin:8px 0 0 0;color:#0f172a;font-size:22px;line-height:1.3;">Você recebeu ${label.article} ${label.noun}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;color:#334155;font-size:15px;line-height:1.6;">
        <p style="margin:0 0 14px 0;">${greeting}</p>
        <p style="margin:0 0 14px 0;">Informamos que foi registrada ${label.article} <strong>${label.noun}</strong> referente à sua unidade, em razão do descumprimento de normas previstas no regimento interno do condomínio. O documento completo segue em anexo a este e-mail, em formato PDF.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;width:100%;">
          <tr><td style="padding:12px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              ${detailRow("Unidade", unitLabel)}
              ${detailRow("Assunto", typeTitle)}
              ${detailRow("Data", formatOnlyDateInFull(notification.createdAt))}
            </table>
          </td></tr>
        </table>
        <p style="margin:0 0 14px 0;">Caso entenda que esta notificação foi emitida indevidamente, pedimos que se manifeste junto à administração do condomínio, apresentando os esclarecimentos ou comprovações que julgar necessários, para que o caso seja reavaliado.</p>
        <p style="margin:0 0 14px 0;">Caso contrário, solicitamos que os moradores da unidade respeitem as normas do condomínio, de modo a preservar a boa convivência e o bem-estar de todos.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;">
          <tr><td align="center">
            <table role="presentation" width="80%" cellpadding="0" cellspacing="0" style="width:80%;max-width:420px;">
              <tr><td align="center" style="background:#0f172a;border-radius:8px;">
                <a href="${escapeHtml(cienciaUrl)}" style="display:block;padding:16px 24px;color:#ffffff;font-size:16px;font-weight:700;text-align:center;text-decoration:none;">Confirmar ciência</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
        <p style="margin:0 0 14px 0;color:#64748b;font-size:13px;">Ao clicar, você registra que tomou conhecimento desta notificação; isso não significa concordância com o seu conteúdo.</p>
        <p style="margin:0;">Atenciosamente,<br /><strong>Administração — ${escapeHtml(condominioName)}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 24px 32px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;line-height:1.5;">
        Esta é uma mensagem automática enviada pelo CondoNot. Por favor, não responda a este e-mail.
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `${label.subject} - ${condominioName}`,
    html,
  };
}
