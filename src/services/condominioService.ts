import type {
  Condominio,
  CondominioInsert,
  CondominioUpdate,
} from "../types/domain";
import { supabase } from "./supabase";

const fallbackTypes: Condominio[] = [
  {
    id: "1",
    createdAt: "2026-08-01T09:00:00.000Z",
    name: "Condominio Goiabinha",
    location: "R. Goiabada",
    logo_url: null,
  },
  {
    id: "2",
    createdAt: "2026-08-01T09:00:00.000Z",
    name: "Condominio Laranjinha",
    location: "R. Laranjinha",
    logo_url: null,
  },
  {
    id: "3",
    createdAt: "2026-08-01T09:00:00.000Z",
    name: "Condominio Fanta Uva",
    location: "R. Fanta Uva",
    logo_url: null,
  },
];

export async function getCondominios(): Promise<Condominio[]> {
  if (!supabase) {
    return fallbackTypes;
  }

  const { data, error } = await supabase
    .from("condominio")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCondominioById(
  id: string,
): Promise<Condominio | null> {
  if (!supabase) {
    return fallbackTypes.find((type) => type.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from("condominio")
    .select("*")
    .eq("id", id)
    .single(); // Garante que retorna apenas 1 objeto, e não um array

  if (error) throw error;
  return data;
}

export async function createCondominio(
  condominioData: CondominioInsert,
): Promise<Condominio> {
  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name: condominioData.name,
      location: condominioData.location,
      logo_url: null,
    };
  }
  const { data, error } = await supabase
    .from("condominio")
    .insert([condominioData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCondominio(
  id: string,
  condominioData: CondominioUpdate,
): Promise<Condominio> {
  if (!supabase) {
    return {
      id,
      createdAt: new Date().toISOString(),
      name: condominioData.name ?? "Erro!",
      location: condominioData.location ?? "Erro!",
      logo_url: condominioData.logo_url ?? "Erro!",
    };
  }
  const { data, error } = await supabase
    .from("condominio")
    .update(condominioData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCondominio(id: number): Promise<void> {
  if (!supabase) {
    return;
  }
  const { error } = await supabase.from("condominio").delete().eq("id", id);

  if (error) throw error;
}

export async function updateCondominioLogo(
  id: number,
  logoUrl: string,
): Promise<void> {
  if (!supabase) {
    return;
  }
  const { error } = await supabase
    .from("condominio")
    .update({ logo_url: logoUrl })
    .eq("id", id);

  if (error) throw error;
}

export async function removeCondominioLogo(id: number): Promise<void> {
  if (!supabase) {
    return;
  }
  const { error } = await supabase
    .from("condominio")
    .update({ logo_url: "" }) // Pode ser "" ou null, dependendo de como sua tabela aceita
    .eq("id", id);

  if (error) throw error;
}
