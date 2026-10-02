import { supabase } from "./supabase";
import { includesQuery } from "../utils/format";
import {
  parseNotification,
  type Notification,
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
    categoria: "Perturbação do sossego",
    dataRetroativa: "2026-08-09",
    valorMulta: 150,
    status: "ativa",
    dataBaixa: null,
    motivoBaixa: null,
  },
  {
    id: "402",
    idCondominio: "1",
    createdAt: "2026-08-09T18:00:00.000Z",
    idTipoNotificacao: "1",
    idUnidade: "102",
    tipo: "Comunicado",
    motivo: "Uso irregular de vaga de visitante.",
    categoria: "Estacionamento indevido",
    dataRetroativa: null,
    valorMulta: null,
    status: "ativa",
    dataBaixa: null,
    motivoBaixa: null,
  },
  {
    id: "403",
    idCondominio: "1",
    createdAt: "2026-08-08T13:45:00.000Z",
    idTipoNotificacao: "3",
    idUnidade: "103",
    tipo: "Ocorrência",
    motivo: "Comportamento inadequado em área comum.",
    categoria: "Convivência",
    dataRetroativa: null,
    valorMulta: 80,
    status: "ativa",
    dataBaixa: null,
    motivoBaixa: null,
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
        `${row.tipo ?? ""} ${row.motivo ?? ""} ${row.categoria ?? ""}`,
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
  return all.slice(0, limit);
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
  categoria: string;
  dataRetroativa: string | null;
  valorMulta: number | null;
  attachments?: File[];
}): Promise<Notification> {
  const attachments = input.attachments ?? [];
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
      categoria: input.categoria || null,
      dataRetroativa: input.dataRetroativa,
      valorMulta: input.valorMulta,
      status: "ativa",
      dataBaixa: null,
      motivoBaixa: null,
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
