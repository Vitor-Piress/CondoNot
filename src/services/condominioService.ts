import type {
  Condominio,
  CondominioInsert,
  CondominioUpdate,
} from "../types/domain";
import { supabase } from "./supabase";

function parseCondominio(row: Record<string, unknown>): Condominio {
  return {
    id: String(row.id),
    createdAt: String(
      row.created_at ?? row.createdAt ?? new Date().toISOString(),
    ),
    name: String(row.name ?? ""),
    location: String(row.location ?? ""),
    logo_url: typeof row.logo_url === "string" ? row.logo_url : null,
    regimento_pdf_path:
      typeof row.regimento_pdf_path === "string"
        ? row.regimento_pdf_path
        : null,
    regimento_pdf_filename:
      typeof row.regimento_pdf_filename === "string"
        ? row.regimento_pdf_filename
        : null,
    regimento_pdf_uploaded_at:
      typeof row.regimento_pdf_uploaded_at === "string"
        ? row.regimento_pdf_uploaded_at
        : null,
    regimento_pdf_size_bytes:
      typeof row.regimento_pdf_size_bytes === "number"
        ? row.regimento_pdf_size_bytes
        : null,
  };
}

let fallbackCondominios: Condominio[] = [
  {
    id: "1",
    createdAt: "2026-08-01T09:00:00.000Z",
    name: "Condomínio Goiabinha",
    location: "R. Goiabada",
    logo_url: null,
  },
  {
    id: "2",
    createdAt: "2026-08-01T09:00:00.000Z",
    name: "Condomínio Laranjinha",
    location: "R. Laranjinha",
    logo_url: null,
  },
  {
    id: "3",
    createdAt: "2026-08-01T09:00:00.000Z",
    name: "Condomínio Fanta Uva",
    location: "R. Fanta Uva",
    logo_url: null,
  },
];

export async function getCondominios(): Promise<Condominio[]> {
  if (!supabase) {
    return fallbackCondominios.slice();
  }

  const { data, error } = await supabase
    .from("condominio")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => parseCondominio(row));
}

export async function getCondominioById(
  id: string,
): Promise<Condominio | null> {
  if (!supabase) {
    return (
      fallbackCondominios.find((condominio) => condominio.id === id) ?? null
    );
  }

  const { data, error } = await supabase
    .from("condominio")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? parseCondominio(data) : null;
}

export async function createCondominio(
  condominioData: CondominioInsert,
): Promise<Condominio> {
  if (!supabase) {
    const nextId = String(
      Math.max(
        0,
        ...fallbackCondominios.map((condominio) => Number(condominio.id)),
      ) + 1,
    );
    const created = {
      id: nextId,
      createdAt: new Date().toISOString(),
      name: condominioData.name,
      location: condominioData.location,
      logo_url: condominioData.logo_url,
    };
    fallbackCondominios = [...fallbackCondominios, created];
    return created;
  }
  const { data, error } = await supabase
    .from("condominio")
    .insert([condominioData])
    .select()
    .single();

  if (error) throw error;
  return parseCondominio(data);
}

export async function updateCondominio(
  id: string,
  condominioData: CondominioUpdate,
): Promise<Condominio> {
  if (!supabase) {
    const index = fallbackCondominios.findIndex(
      (condominio) => condominio.id === id,
    );
    if (index < 0) throw new Error("Condomínio não encontrado.");
    const updated = { ...fallbackCondominios[index], ...condominioData };
    fallbackCondominios = fallbackCondominios.map((condominio, rowIndex) =>
      rowIndex === index ? updated : condominio,
    );
    return updated;
  }
  const { data, error } = await supabase
    .from("condominio")
    .update(condominioData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return parseCondominio(data);
}

export async function deleteCondominio(id: string): Promise<void> {
  if (!supabase) {
    fallbackCondominios = fallbackCondominios.filter(
      (condominio) => condominio.id !== id,
    );
    return;
  }
  const { error } = await supabase.from("condominio").delete().eq("id", id);

  if (error) throw error;
}

export async function updateCondominioLogo(
  id: string,
  logoUrl: string,
): Promise<void> {
  if (!supabase) {
    await updateCondominio(id, { logo_url: logoUrl });
    return;
  }
  const { error } = await supabase
    .from("condominio")
    .update({ logo_url: logoUrl })
    .eq("id", id);

  if (error) throw error;
}

export async function removeCondominioLogo(id: string): Promise<void> {
  if (!supabase) {
    await updateCondominio(id, { logo_url: null });
    return;
  }
  const { error } = await supabase
    .from("condominio")
    .update({ logo_url: null })
    .eq("id", id);

  if (error) throw error;
}
