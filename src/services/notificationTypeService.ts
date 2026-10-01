import { supabase } from "./supabase";
import {
  parseNotificationType,
  serializeRegimentoTexto,
  type NotificationType,
  type RegimentoTexto,
} from "../types/domain";

const fallbackTypes: NotificationType[] = [
  {
    id: "1",
    idCondominio: "1",
    createdAt: "2026-08-01T09:00:00.000Z",
    titulo: "Comunicado Geral",
    textoRegimento: [
      {
        titulo: "Comunicado enviado para todos os moradores.",
        paragrafos: [],
      },
    ],
  },
  {
    id: "2",
    idCondominio: "1",
    createdAt: "2026-08-02T09:00:00.000Z",
    titulo: "Aviso de Manutenção",
    textoRegimento: [
      {
        titulo: "A equipe irá realizar manutenção preventiva.",
        paragrafos: [],
      },
    ],
  },
  {
    id: "3",
    idCondominio: "1",
    createdAt: "2026-08-03T09:00:00.000Z",
    titulo: "Ocorrência",
    textoRegimento: [
      {
        titulo: "Registro de ocorrência no condomínio.",
        paragrafos: [],
      },
    ],
  },
];

export async function listNotificationTypes(
  condominioId: string,
): Promise<NotificationType[]> {
  if (!supabase) {
    return fallbackTypes.filter((type) => type.idCondominio === condominioId);
  }

  const { data, error } = await supabase
    .from("tipos_notificacao")
    .select("*")
    .eq("id_condominio", condominioId)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => parseNotificationType(row));
}

export async function getNotificationTypeById(
  id: string,
  condominioId: string,
): Promise<NotificationType | null> {
  if (!supabase) {
    return (
      fallbackTypes.find(
        (type) => type.id === id && type.idCondominio === condominioId,
      ) ?? null
    );
  }

  const { data, error } = await supabase
    .from("tipos_notificacao")
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

  return parseNotificationType(data);
}

export async function createNotificationType(input: {
  idCondominio: string;
  titulo: string;
  textoRegimento: RegimentoTexto;
}): Promise<NotificationType> {
  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      idCondominio: input.idCondominio,
      createdAt: new Date().toISOString(),
      titulo: input.titulo,
      textoRegimento: input.textoRegimento,
    };
  }

  const { data, error } = await supabase
    .from("tipos_notificacao")
    .insert([
      {
        id_condominio: input.idCondominio,
        titulo: input.titulo,
        texto_regimento: serializeRegimentoTexto(input.textoRegimento),
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return parseNotificationType(data);
}
