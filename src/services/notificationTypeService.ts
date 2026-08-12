import { supabase } from "./supabase";
import { parseNotificationType, type NotificationType } from "../types/domain";

const fallbackTypes: NotificationType[] = [
  {
    id: "1",
    createdAt: "2026-08-01T09:00:00.000Z",
    titulo: "Comunicado Geral",
    textoPadrao: "Comunicado enviado para todos os moradores.",
  },
  {
    id: "2",
    createdAt: "2026-08-02T09:00:00.000Z",
    titulo: "Aviso de Manutencao",
    textoPadrao: "A equipe ira realizar manutencao preventiva.",
  },
  {
    id: "3",
    createdAt: "2026-08-03T09:00:00.000Z",
    titulo: "Ocorrencia",
    textoPadrao: "Registro de ocorrencia no condominio.",
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

export async function createNotificationType(input: {
  titulo: string;
  textoPadrao: string;
}): Promise<NotificationType> {
  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      titulo: input.titulo,
      textoPadrao: input.textoPadrao,
    };
  }

  const { data, error } = await supabase
    .from("tipos_notificacao")
    .insert([
      {
        titulo: input.titulo,
        texto_padrao: input.textoPadrao || null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return parseNotificationType(data);
}
