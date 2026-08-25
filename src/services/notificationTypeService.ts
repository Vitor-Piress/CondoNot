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
    createdAt: "2026-08-02T09:00:00.000Z",
    titulo: "Aviso de Manutencao",
    textoRegimento: [
      {
        titulo: "A equipe ira realizar manutencao preventiva.",
        paragrafos: [],
      },
    ],
  },
  {
    id: "3",
    createdAt: "2026-08-03T09:00:00.000Z",
    titulo: "Ocorrencia",
    textoRegimento: [
      {
        titulo: "Registro de ocorrencia no condominio.",
        paragrafos: [],
      },
    ],
  },
];

export async function listNotificationTypes(): Promise<NotificationType[]> {
  if (!supabase) {
    return fallbackTypes;
  }

  const { data, error } = await supabase
    .from("tipos_notificacao")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => parseNotificationType(row));
}

export async function getNotificationTypeById(
  id: string,
): Promise<NotificationType | null> {
  if (!supabase) {
    return fallbackTypes.find((type) => type.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from("tipos_notificacao")
    .select("*")
    .eq("id", id)
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
  titulo: string;
  textoRegimento: RegimentoTexto;
}): Promise<NotificationType> {
  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      titulo: input.titulo,
      textoRegimento: input.textoRegimento,
    };
  }

  const { data, error } = await supabase
    .from("tipos_notificacao")
    .insert([
      {
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
