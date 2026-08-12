import { supabase } from "./supabase";
import { includesQuery } from "../utils/format";
import {
  type ResidentInfo,
  getPersonName,
  getUnitLabel,
  getUnitMainResident,
  parseUnit,
  type Unit,
} from "../types/domain";

const UNIT_TABLE = "unidades";

const fallbackUnits: Unit[] = [
  {
    id: "101",
    createdAt: "2026-08-01T10:00:00.000Z",
    bloco: "A",
    apartamento: 101,
    proprietario: {
      nome: "Ana Costa",
      contatoTelefone: "(11) 99999-1111",
      contatoEmail: "ana.costa@email.com",
    },
    alugado: false,
    inquilino: null,
  },
  {
    id: "102",
    createdAt: "2026-08-02T10:00:00.000Z",
    bloco: "B",
    apartamento: 302,
    proprietario: {
      nome: "Joao Ribeiro",
      contatoTelefone: "(11) 99999-2222",
      contatoEmail: "joao.ribeiro@email.com",
    },
    alugado: true,
    inquilino: {
      nome: "Marina Lopes",
      contatoTelefone: "(11) 99999-3333",
      contatoEmail: "marina.lopes@email.com",
    },
  },
  {
    id: "103",
    createdAt: "2026-08-03T10:00:00.000Z",
    bloco: "C",
    apartamento: 210,
    proprietario: {
      nome: "Rafael Motta",
      contatoTelefone: "(11) 99999-4444",
      contatoEmail: "rafael.motta@email.com",
    },
    alugado: null,
    inquilino: null,
  },
];

function toDbResident(value: ResidentInfo | null): {
  nome: string;
  contato_telefone: string | null;
  contato_email: string | null;
} | null {
  if (!value || !value.nome || !value.nome.trim()) {
    return null;
  }

  return {
    nome: value.nome.trim(),
    contato_telefone: value.contatoTelefone?.trim() || null,
    contato_email: value.contatoEmail?.trim() || null,
  };
}

function applyQueryFilter(rows: Unit[], query: string): Unit[] {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((unit) =>
    includesQuery(
      `${getUnitLabel(unit)} ${getUnitMainResident(unit)} ${getPersonName(unit.proprietario)} ${getPersonName(unit.inquilino)}`,
      normalizedQuery,
    ),
  );
}

export async function listUnits(query: string): Promise<Unit[]> {
  if (!supabase) {
    return applyQueryFilter(fallbackUnits, query);
  }

  const { data, error } = await supabase
    .from(UNIT_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return applyQueryFilter(
    (data ?? []).map((row) => parseUnit(row)),
    query,
  );
}

export async function getUnitById(id: string): Promise<Unit | null> {
  if (!supabase) {
    return fallbackUnits.find((unit) => unit.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from(UNIT_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return parseUnit(data);
}

export async function updateUnit(
  id: string,
  input: {
    bloco: string;
    apartamento: number | null;
    alugado: boolean | null;
    proprietario: ResidentInfo | null;
    inquilino: ResidentInfo | null;
  },
): Promise<Unit> {
  const proprietario = input.proprietario;
  const inquilino = input.alugado ? input.inquilino : null;
  const proprietarioDb = toDbResident(input.proprietario);
  const inquilinoDb = input.alugado ? toDbResident(input.inquilino) : null;

  if (!supabase) {
    return {
      id,
      createdAt: new Date().toISOString(),
      bloco: input.bloco,
      apartamento: input.apartamento,
      alugado: input.alugado,
      proprietario,
      inquilino,
    };
  }

  const { data, error } = await supabase
    .from(UNIT_TABLE)
    .update({
      bloco: input.bloco,
      apartamento: input.apartamento,
      alugado: input.alugado,
      proprietario: proprietarioDb,
      inquilino: inquilinoDb,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return parseUnit(data);
}
