import type { UserAccess } from "../types/domain";
import { supabase } from "./supabase";

let fallbackUsersAccess: UserAccess[] = [
  {
    userId: "demo-admin-1",
    email: "admin@condonot.com.br",
    nome: "Administrador Geral",
    isAdmin: true,
    createdAt: "2026-08-01T09:00:00.000Z",
    lastSignInAt: "2026-10-21T12:00:00.000Z",
    condominioIds: ["1", "2", "3"],
  },
  {
    userId: "demo-user-2",
    email: "portaria.goiabinha@condonot.com.br",
    nome: "Portaria Goiabinha",
    isAdmin: false,
    createdAt: "2026-09-10T14:30:00.000Z",
    lastSignInAt: "2026-10-20T18:15:00.000Z",
    condominioIds: ["1"],
  },
];

function parseUserAccess(row: Record<string, unknown>): UserAccess {
  const rawCondominioIds = Array.isArray(row.condominio_ids)
    ? row.condominio_ids
    : [];

  return {
    userId: String(row.user_id ?? ""),
    email: String(row.email ?? ""),
    nome:
      typeof row.nome === "string" && row.nome.trim()
        ? row.nome.trim()
        : null,
    isAdmin: row.is_admin === true,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    lastSignInAt:
      typeof row.last_sign_in_at === "string" ? row.last_sign_in_at : null,
    condominioIds: rawCondominioIds.map((id) => String(id)),
  };
}

export async function checkIsAdmin(): Promise<boolean> {
  if (!supabase) {
    return true;
  }

  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    // Caso a migration ainda não tenha sido aplicada no banco, mantém acesso de admin
    // para não ocultar o painel antes da atualização do schema.
    return true;
  }

  return data === true;
}

export async function listUsersAccess(): Promise<UserAccess[]> {
  if (!supabase) {
    return fallbackUsersAccess.map((user) => ({
      ...user,
      condominioIds: [...user.condominioIds],
    }));
  }

  const { data, error } = await supabase.rpc("listar_usuarios_acessos");

  if (error) {
    if (error.code === "PGRST202") {
      throw new Error(
        "A função de gestão de acessos ainda não existe no banco. Aplique a migration 20261021180000_access_management_and_notification_author.sql no SQL Editor do Supabase.",
      );
    }
    throw new Error(error.message);
  }

  return ((data as Record<string, unknown>[]) ?? []).map((row) =>
    parseUserAccess(row),
  );
}

export async function updateUserAccess(input: {
  userId: string;
  nome: string | null;
  isAdmin: boolean;
  condominioIds: string[];
}): Promise<void> {
  if (!supabase) {
    fallbackUsersAccess = fallbackUsersAccess.map((user) =>
      user.userId === input.userId
        ? {
            ...user,
            nome: input.nome?.trim() || null,
            isAdmin: input.isAdmin,
            condominioIds: [...input.condominioIds],
          }
        : user,
    );
    return;
  }

  const numericCondominioIds = input.condominioIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  const { error } = await supabase.rpc("atualizar_acesso_usuario", {
    p_user_id: input.userId,
    p_nome: input.nome?.trim() || null,
    p_is_admin: input.isAdmin,
    p_condominio_ids: numericCondominioIds,
  });

  if (error) {
    throw new Error(error.message);
  }
}

