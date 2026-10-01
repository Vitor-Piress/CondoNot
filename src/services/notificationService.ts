import { supabase } from "./supabase";
import { includesQuery } from "../utils/format";
import { parseNotification, type Notification } from "../types/domain";

const NOTIFICATION_TABLE = "notificacao";

export interface NotificationFilters {
  query: string;
  typeId: string;
  unitId: string;
}

const fallbackNotifications: Notification[] = [
  {
    id: "401",
    createdAt: "2026-08-10T09:20:00.000Z",
    idTipoNotificacao: "2",
    idUnidade: "101",
    tipo: "Advertencia",
    motivo: "Barulho após horário permitido.",
    categoria: "Perturbação do sossego",
    dataRetroativa: "2026-08-09",
    valorMulta: 150,
  },
  {
    id: "402",
    createdAt: "2026-08-09T18:00:00.000Z",
    idTipoNotificacao: "1",
    idUnidade: "102",
    tipo: "Comunicado",
    motivo: "Uso irregular de vaga de visitante.",
    categoria: "Estacionamento indevido",
    dataRetroativa: null,
    valorMulta: null,
  },
  {
    id: "403",
    createdAt: "2026-08-08T13:45:00.000Z",
    idTipoNotificacao: "3",
    idUnidade: "103",
    tipo: "Ocorrência",
    motivo: "Comportamento inadequado em área comum.",
    categoria: "Convivência",
    dataRetroativa: null,
    valorMulta: 80,
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
): Promise<Notification[]> {
  if (!supabase) {
    return applyFilters(sortByDateDesc(fallbackNotifications), filters);
  }

  const { data, error } = await supabase
    .from(NOTIFICATION_TABLE)
    .select("*")
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
): Promise<Notification[]> {
  if (!supabase) {
    return applyFilters(sortByDateDesc(fallbackNotifications), {
      query: "",
      typeId: "",
      unitId,
    });
  }

  const { data, error } = await supabase
    .from(NOTIFICATION_TABLE)
    .select("*")
    .eq("id_unidade", unitId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return sortByDateDesc((data ?? []).map((row) => parseNotification(row)));
}

export async function listRecentNotifications(
  limit = 7,
): Promise<Notification[]> {
  const all = await listNotifications({ query: "", typeId: "", unitId: "" });
  return all.slice(0, limit);
}

export async function getNotificationById(
  id: string,
): Promise<Notification | null> {
  if (!supabase) {
    return fallbackNotifications.find((item) => item.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from(NOTIFICATION_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return parseNotification(data);
}

export async function createNotification(input: {
  idTipoNotificacao: string;
  idUnidade: string;
  motivo: string;
  categoria: string;
  dataRetroativa: string | null;
  valorMulta: number | null;
}): Promise<Notification> {
  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      idTipoNotificacao: input.idTipoNotificacao,
      idUnidade: input.idUnidade,
      tipo: null,
      motivo: input.motivo || null,
      categoria: input.categoria || null,
      dataRetroativa: input.dataRetroativa,
      valorMulta: input.valorMulta,
    };
  }

  const { data, error } = await supabase
    .from(NOTIFICATION_TABLE)
    .insert([
      {
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

  return parseNotification(data);
}
