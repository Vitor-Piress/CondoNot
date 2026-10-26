import { createElement, type ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { supabase } from "./supabase";
import { includesQuery } from "../utils/format";
import { buildNotificationEmail } from "../utils/notificationEmail";
import {
  parseNotification,
  type Notification,
  type Unit,
  type NotificationType,
  type Condominio,
  type NotificationAttachment,
} from "../types/domain";
import {
  createNotificationAttachmentSignedUrl,
  NOTIFICATION_ATTACHMENT_BUCKET,
  uploadNotificationAttachment,
  validateNotificationAttachmentContents,
  validateNotificationAttachments,
} from "./storageService";

const NOTIFICATION_TABLE = "notificacao";
const NOTIFICATION_ATTACHMENT_TABLE = "notificacao_anexo";

export class NotificationAttachmentCreationError extends Error {
  readonly notificationId: string;

  constructor(
    message: string,
    notificationId: string,
    cause: unknown,
  ) {
    super(message, { cause });
    this.notificationId = notificationId;
    this.name = "NotificationAttachmentCreationError";
  }
}

export interface NotificationFilters {
  query: string;
  typeId: string;
  unitId: string;
}

const fallbackNotifications: Notification[] = [
  {
    id: "401",
    idCondominio: "1",
    createdAt: "2026-08-10T09:20:00.000Z",
    idTipoNotificacao: "2",
    idUnidade: "101",
    tipo: "Advertencia",
    motivo: "Barulho após horário permitido.",
    textoApoio: null,
    categoria: "Perturbação do sossego",
    dataRetroativa: "2026-08-09",
    valorMulta: 150,
    status: "ativa",
    dataBaixa: null,
    motivoBaixa: null,
    emailNotificacao: false,
    emailEnviadoEm: null,
    emailEnviadoPara: null,
    emailResendId: null,
    emailEntregueEm: null,
    emailAbertoEm: null,
    emailFalhaEm: null,
    emailFalhaMotivo: null,
    cienciaToken: null,
    cienciaEm: null,
    criadoPor: "demo-admin-1",
    criadoPorEmail: "admin@condonot.com.br",
    criadoPorNome: "Administrador Geral",
  },
  {
    id: "402",
    idCondominio: "1",
    createdAt: "2026-08-09T18:00:00.000Z",
    idTipoNotificacao: "1",
    idUnidade: "102",
    tipo: "Comunicado",
    motivo: "Uso irregular de vaga de visitante.",
    textoApoio: null,
    categoria: "Estacionamento indevido",
    dataRetroativa: null,
    valorMulta: null,
    status: "ativa",
    dataBaixa: null,
    motivoBaixa: null,
    emailNotificacao: false,
    emailEnviadoEm: null,
    emailEnviadoPara: null,
    emailResendId: null,
    emailEntregueEm: null,
    emailAbertoEm: null,
    emailFalhaEm: null,
    emailFalhaMotivo: null,
    cienciaToken: null,
    cienciaEm: null,
    criadoPor: "demo-user-2",
    criadoPorEmail: "portaria.goiabinha@condonot.com.br",
    criadoPorNome: "Portaria Goiabinha",
  },
  {
    id: "403",
    idCondominio: "1",
    createdAt: "2026-08-08T13:45:00.000Z",
    idTipoNotificacao: "3",
    idUnidade: "103",
    tipo: "Ocorrência",
    motivo: "Comportamento inadequado em área comum.",
    textoApoio: null,
    categoria: "Convivência",
    dataRetroativa: null,
    valorMulta: 80,
    status: "ativa",
    dataBaixa: null,
    motivoBaixa: null,
    emailNotificacao: false,
    emailEnviadoEm: null,
    emailEnviadoPara: null,
    emailResendId: null,
    emailEntregueEm: null,
    emailAbertoEm: null,
    emailFalhaEm: null,
    emailFalhaMotivo: null,
    cienciaToken: null,
    cienciaEm: null,
    criadoPor: "demo-admin-1",
    criadoPorEmail: "admin@condonot.com.br",
    criadoPorNome: "Administrador Geral",
  },
];

function sortByDateDesc(rows: Notification[]): Notification[] {
  return rows
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

function applyFilters(
  rows: Notification[],
  filters: NotificationFilters,
): Notification[] {
  return rows.filter((row) => {
    const queryMatch =
      filters.query.trim() === "" ||
      includesQuery(
        `${row.tipo ?? ""} ${row.motivo ?? ""} ${row.categoria ?? ""} ${row.criadoPorNome ?? ""} ${row.criadoPorEmail ?? ""}`,
        filters.query,
      );
    const typeMatch =
      filters.typeId === "" || row.idTipoNotificacao === filters.typeId;
    const unitMatch = filters.unitId === "" || row.idUnidade === filters.unitId;

    return queryMatch && typeMatch && unitMatch;
  });
}

export async function listNotifications(
  filters: NotificationFilters,
  condominioId: string,
): Promise<Notification[]> {
  if (!supabase) {
    return applyFilters(
      sortByDateDesc(
        fallbackNotifications.filter(
          (row) => row.idCondominio === condominioId,
        ),
      ),
      filters,
    );
  }

  const { data, error } = await supabase
    .from(NOTIFICATION_TABLE)
    .select("*")
    .eq("id_condominio", condominioId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = sortByDateDesc(
    (data ?? []).map((row) => parseNotification(row)),
  );
  return applyFilters(rows, filters);
}

export async function listNotificationsByUnitId(
  unitId: string,
  condominioId: string,
): Promise<Notification[]> {
  if (!supabase) {
    return applyFilters(
      sortByDateDesc(
        fallbackNotifications.filter(
          (row) => row.idCondominio === condominioId,
        ),
      ),
      {
        query: "",
        typeId: "",
        unitId,
      },
    );
  }

  const { data, error } = await supabase
    .from(NOTIFICATION_TABLE)
    .select("*")
    .eq("id_condominio", condominioId)
    .eq("id_unidade", unitId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return sortByDateDesc((data ?? []).map((row) => parseNotification(row)));
}

export async function listRecentNotifications(
  limit = 7,
  condominioId: string,
): Promise<Notification[]> {
  const all = await listNotifications(
    { query: "", typeId: "", unitId: "" },
    condominioId,
  );
  return all.filter((row) => row.status === "ativa").slice(0, limit);
}

export async function getNotificationById(
  id: string,
  condominioId: string,
): Promise<Notification | null> {
  if (!supabase) {
    return (
      fallbackNotifications.find(
        (item) => item.id === id && item.idCondominio === condominioId,
      ) ?? null
    );
  }

  const { data, error } = await supabase
    .from(NOTIFICATION_TABLE)
    .select("*")
    .eq("id", id)
    .eq("id_condominio", condominioId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return parseNotification(data);
}

export async function listNotificationAttachments(
  notificationId: string,
  condominioId: string,
): Promise<NotificationAttachment[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(NOTIFICATION_ATTACHMENT_TABLE)
    .select("*")
    .eq("id_notificacao", notificationId)
    .eq("id_condominio", condominioId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return Promise.all(
    (data ?? []).map(async (row) => ({
      id: String(row.id),
      idCondominio: String(row.id_condominio),
      idNotificacao: String(row.id_notificacao),
      storagePath: String(row.storage_path),
      fileName: String(row.nome_arquivo),
      mimeType: String(row.mime_type),
      fileSizeBytes: Number(row.tamanho_bytes),
      signedUrl: await createNotificationAttachmentSignedUrl(
        String(row.storage_path),
      ),
    })),
  );
}

export async function createNotification(input: {
  idCondominio: string;
  idTipoNotificacao: string;
  idUnidade: string;
  motivo: string;
  textoApoio?: string | null;
  categoria: string;
  dataRetroativa: string | null;
  valorMulta: number | null;
  attachments?: File[];
}): Promise<Notification> {
  const attachments = input.attachments ?? [];
  const normalizedTextoApoio = input.textoApoio?.trim() || null;
  validateNotificationAttachments(attachments);

  if (!supabase) {
    if (attachments.length > 0) {
      throw new Error(
        "Configure o Supabase para salvar fotos anexadas à notificação.",
      );
    }

    return {
      id: crypto.randomUUID(),
      idCondominio: input.idCondominio,
      createdAt: new Date().toISOString(),
      idTipoNotificacao: input.idTipoNotificacao,
      idUnidade: input.idUnidade,
      tipo: null,
      motivo: input.motivo || null,
      textoApoio: normalizedTextoApoio,
      categoria: input.categoria || null,
      dataRetroativa: input.dataRetroativa,
      valorMulta: input.valorMulta,
      status: "ativa",
      dataBaixa: null,
      motivoBaixa: null,
      emailNotificacao: false,
      emailEnviadoEm: null,
      emailEnviadoPara: null,
      emailResendId: null,
      emailEntregueEm: null,
      emailAbertoEm: null,
      emailFalhaEm: null,
      emailFalhaMotivo: null,
      cienciaToken: null,
      cienciaEm: null,
      criadoPor: "demo-admin-1",
      criadoPorEmail: "admin@condonot.com.br",
      criadoPorNome: "Administrador Geral",
    };
  }

  await validateNotificationAttachmentContents(attachments);

  const { data, error } = await supabase
    .from(NOTIFICATION_TABLE)
    .insert([
      {
        id_condominio: input.idCondominio,
        id_tipo_notificacao: input.idTipoNotificacao,
        id_unidade: input.idUnidade,
        motivo: input.motivo || null,
        texto_apoio: normalizedTextoApoio,
        categoria: input.categoria || null,
        data_retroativa: input.dataRetroativa,
        valor_multa: input.valorMulta,
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = parseNotification(data);
  const uploadedPaths: string[] = [];

  try {
    for (const file of attachments) {
      uploadedPaths.push(
        await uploadNotificationAttachment(
          input.idCondominio,
          created.id,
          file,
        ),
      );
    }

    if (attachments.length > 0) {
      const { error: attachmentError } = await supabase
        .from(NOTIFICATION_ATTACHMENT_TABLE)
        .insert(
          attachments.map((file, index) => ({
            id_condominio: input.idCondominio,
            id_notificacao: created.id,
            storage_path: uploadedPaths[index],
            nome_arquivo: file.name,
            mime_type: file.type,
            tamanho_bytes: file.size,
          })),
        );

      if (attachmentError) {
        throw new Error(attachmentError.message);
      }
    }

    return created;
  } catch (creationError) {
    const cleanupResults = await Promise.allSettled([
      supabase
        .from(NOTIFICATION_ATTACHMENT_TABLE)
        .delete()
        .eq("id_notificacao", created.id)
        .eq("id_condominio", input.idCondominio),
      ...(uploadedPaths.length > 0
        ? [
            supabase.storage
              .from(NOTIFICATION_ATTACHMENT_BUCKET)
              .remove(uploadedPaths),
          ]
        : []),
      supabase
        .from(NOTIFICATION_TABLE)
        .delete()
        .eq("id", created.id)
        .eq("id_condominio", input.idCondominio),
    ]);
    const cleanupErrors = cleanupResults.flatMap((result) => {
      if (result.status === "rejected") {
        return [
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        ];
      }

      return result.value.error ? [result.value.error.message] : [];
    });
    const originalMessage =
      creationError instanceof Error
        ? creationError.message
        : String(creationError);

    if (cleanupErrors.length > 0) {
      throw new NotificationAttachmentCreationError(
        `Não foi possível salvar as fotos (${originalMessage}). A notificação #${created.id} pode ter permanecido salva. Falha ao limpar dados: ${cleanupErrors.join("; ")}`,
        created.id,
        creationError,
      );
    }

    throw new Error(
      `Não foi possível salvar as fotos (${originalMessage}). A notificação foi removida; tente novamente.`,
      { cause: creationError },
    );
  }
}

export async function inactivateNotification(
  id: string,
  condominioId: string,
  motivoBaixa: string,
): Promise<Notification> {
  if (!supabase) {
    const row = fallbackNotifications.find(
      (item) => item.id === id && item.idCondominio === condominioId,
    );
    if (!row) {
      throw new Error("Notificação não encontrada.");
    }
    row.status = "baixada";
    row.dataBaixa = new Date().toISOString();
    row.motivoBaixa = motivoBaixa;
    return row;
  }

  const { data, error } = await supabase
    .from(NOTIFICATION_TABLE)
    .update({
      status: "baixada",
      data_baixa: new Date().toISOString(),
      motivo_baixa: motivoBaixa,
    })
    .eq("id", id)
    .eq("id_condominio", condominioId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return parseNotification(data);
}

export const EMAIL_RESEND_COOLDOWN_MS = 10 * 60 * 1000;

export function getEmailCooldownRemainingMs(
  notification: Notification,
  now = Date.now(),
): number {
  if (!notification.emailEnviadoEm) {
    return 0;
  }
  const sentAt = new Date(notification.emailEnviadoEm).getTime();
  if (Number.isNaN(sentAt)) {
    return 0;
  }
  return Math.max(0, sentAt + EMAIL_RESEND_COOLDOWN_MS - now);
}

export function getNotificationEmailRecipient(unit: Unit): string | null {
  const tenant = unit.inquilino?.contatoEmail?.trim();
  if (tenant) {
    return tenant;
  }
  return unit.proprietario?.contatoEmail?.trim() || null;
}

async function buildNotificationPdfBase64(input: {
  notification: Notification;
  unit: Unit;
  typeTitle: string;
  type: NotificationType | null;
  condominio: Condominio | null;
  attachments: NotificationAttachment[];
}): Promise<string> {
  // Carregado sob demanda para não pesar o bundle inicial.
  const [{ pdf }, { NotificationPdf }, images] = await Promise.all([
    import("@react-pdf/renderer"),
    import("../components/pdf/NotificationPdf"),
    import("./pdfImageService"),
  ]);

  const [logoDataUrl, photos] = await Promise.all([
    input.condominio?.logo_url
      ? images
          .fetchImageAsJpegDataUrl(input.condominio.logo_url, 600)
          .catch(() => null)
      : null,
    Promise.all(
      input.attachments.map(async (attachment) => ({
        dataUrl: await images.fetchImageAsJpegDataUrl(attachment.signedUrl),
        fileName: attachment.fileName,
      })),
    ),
  ]);

  const blob = await pdf(
    createElement(NotificationPdf, {
      notification: input.notification,
      type: input.type,
      unit: input.unit,
      condominio: input.condominio,
      typeTitle: input.typeTitle,
      logoDataUrl,
      photos,
    }) as ReactElement<DocumentProps>,
  ).toBlob();

  return images.blobToBase64(blob);
}

export async function sendNotificationEmail(
  notification: Notification,
  unit: Unit,
  typeTitle: string,
  type: NotificationType | null,
  condominio: Condominio | null,
  attachments: NotificationAttachment[],
): Promise<Notification> {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  if (getEmailCooldownRemainingMs(notification) > 0) {
    throw new Error("Aguarde alguns minutos antes de reenviar o e-mail.");
  }

  const recipient = getNotificationEmailRecipient(unit);
  if (!recipient) {
    throw new Error(
      "Nenhum e-mail cadastrado para o inquilino ou proprietário da unidade.",
    );
  }

  const pdfBase64 = await buildNotificationPdfBase64({
    notification,
    unit,
    typeTitle,
    type,
    condominio,
    attachments,
  });

  if (!notification.cienciaToken) {
    throw new Error("Notificação sem token de ciência.");
  }

  const emailContent = buildNotificationEmail({
    notification,
    unit,
    condominio,
    typeTitle,
    cienciaUrl: `${window.location.origin}/ciencia/${notification.cienciaToken}`,
  });

  const { data, error } = await supabase.functions.invoke("send-email", {
    body: {
      to: recipient,
      notificacao_id: notification.id,
      attachments: [
        {
          filename: `condonot-${unit.bloco}${unit.apartamento ?? ""}-notification-${notification.id}.pdf`.replace(
            /[^\w.-]+/g,
            "",
          ),
          content: pdfBase64,
        },
      ],
      tags: [{ name: "notificacao_id", value: String(notification.id) }],
      subject: emailContent.subject,
      html: emailContent.html,
    },
  });

  if (error || (data && typeof data === "object" && "error" in data)) {
    throw new Error("Não foi possível enviar o e-mail.");
  }

  const resendId =
    data && typeof data === "object" && "id" in data ? String(data.id) : null;

  // Um novo envio zera os eventos do envio anterior; se o webhook já gravou
  // este id, nada é apagado.
  if (resendId) {
    await supabase
      .from(NOTIFICATION_TABLE)
      .update({
        email_resend_id: resendId,
        email_entregue_em: null,
        email_aberto_em: null,
        email_falha_em: null,
        email_falha_motivo: null,
      })
      .eq("id", notification.id)
      .eq("id_condominio", notification.idCondominio)
      .or(`email_resend_id.is.null,email_resend_id.neq.${resendId}`);
  }

  const { data: updated, error: updateError } = await supabase
    .from(NOTIFICATION_TABLE)
    .update({
      email_notificacao: true,
      email_enviado_em: new Date().toISOString(),
      email_enviado_para: recipient,
    })
    .eq("id", notification.id)
    .eq("id_condominio", notification.idCondominio)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(
      "E-mail enviado, mas não foi possível registrar o envio: " +
        updateError.message,
    );
  }

  return parseNotification(updated);
}
