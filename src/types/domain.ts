export type JsonObject = Record<string, unknown>;

export interface ResidentInfo {
  nome: string | null;
  contatoTelefone: string | null;
  contatoEmail: string | null;
}

export interface Notification {
  id: string;
  createdAt: string;
  idTipoNotificacao: string;
  idUnidade: string;
  tipo: string | null;
  motivo: string | null;
  categoria: string | null;
  dataRetroativa: string | null;
  valorMulta: number | null;
}

export interface RegimentoParagrafo {
  artigo: string;
  texto: string;
}

export interface RegimentoEscopo {
  titulo: string;
  paragrafos: RegimentoParagrafo[];
}

export type RegimentoTexto = RegimentoEscopo[];

export const MAX_ESCOPOS = 2;
export const MAX_PARAGRAFOS_POR_ESCOPO = 5;

export interface NotificationType {
  id: string;
  createdAt: string;
  titulo: string | null;
  textoRegimento: RegimentoTexto | null;
}

export interface Unit {
  id: string;
  createdAt: string;
  bloco: string;
  apartamento: number | null;
  proprietario: ResidentInfo | null;
  alugado: boolean | null;
  inquilino: ResidentInfo | null;
}

type UnknownRow = Record<string, unknown>;

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = toStringValue(value).trim();
  return parsed ? parsed : null;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return null;
}

function toNullableJsonObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonObject;
}

function toNullableResident(value: unknown): ResidentInfo | null {
  const raw = toNullableJsonObject(value);

  if (!raw) {
    return null;
  }

  return {
    nome: toNullableString(raw.nome ?? raw.name),
    contatoTelefone: toNullableString(
      raw.contato_telefone ?? raw.contatoTelefone ?? raw.telefone,
    ),
    contatoEmail: toNullableString(
      raw.contato_email ?? raw.contatoEmail ?? raw.email,
    ),
  };
}

function parseRegimentoParagrafo(value: unknown): RegimentoParagrafo | null {
  const raw = toNullableJsonObject(value);

  if (!raw) {
    return null;
  }

  return {
    artigo: toStringValue(raw.artigo),
    texto: toStringValue(raw.texto),
  };
}

function parseRegimentoEscopo(value: unknown): RegimentoEscopo | null {
  const raw = toNullableJsonObject(value);

  if (!raw) {
    return null;
  }

  const paragrafos: RegimentoParagrafo[] = [];

  for (let i = 1; i <= MAX_PARAGRAFOS_POR_ESCOPO; i += 1) {
    const key = `paragrafo_${String(i).padStart(2, "0")}`;
    const paragrafo = parseRegimentoParagrafo(raw[key]);

    if (paragrafo) {
      paragrafos.push(paragrafo);
    }
  }

  return {
    titulo: toStringValue(raw.titulo),
    paragrafos,
  };
}

function toNullableRegimentoTexto(value: unknown): RegimentoTexto | null {
  const raw = toNullableJsonObject(value);

  if (!raw) {
    return null;
  }

  const escopos: RegimentoEscopo[] = [];

  for (let i = 1; i <= MAX_ESCOPOS; i += 1) {
    const key = `escopo_${String(i).padStart(2, "0")}`;
    const escopo = parseRegimentoEscopo(raw[key]);

    if (escopo) {
      escopos.push(escopo);
    }
  }

  return escopos.length > 0 ? escopos : null;
}

export function serializeRegimentoTexto(escopos: RegimentoTexto): JsonObject {
  const raw: JsonObject = {};

  escopos.slice(0, MAX_ESCOPOS).forEach((escopo, escopoIndex) => {
    const escopoKey = `escopo_${String(escopoIndex + 1).padStart(2, "0")}`;
    const escopoRaw: JsonObject = { titulo: escopo.titulo };

    escopo.paragrafos
      .slice(0, MAX_PARAGRAFOS_POR_ESCOPO)
      .forEach((paragrafo, paragrafoIndex) => {
        const paragrafoKey = `paragrafo_${String(paragrafoIndex + 1).padStart(
          2,
          "0",
        )}`;
        escopoRaw[paragrafoKey] = {
          artigo: paragrafo.artigo,
          texto: paragrafo.texto,
        };
      });

    raw[escopoKey] = escopoRaw;
  });

  return raw;
}

export function parseNotification(row: UnknownRow): Notification {
  return {
    id: toStringValue(row.id, crypto.randomUUID()),
    createdAt: toStringValue(
      row.created_at ?? row.createdAt,
      new Date().toISOString(),
    ),
    idTipoNotificacao: toStringValue(
      row.id_tipo_notificacao ?? row.idTipoNotificacao,
      "",
    ),
    idUnidade: toStringValue(row.id_unidade ?? row.idUnidade, ""),
    tipo: toNullableString(row.tipo),
    motivo: toNullableString(row.motivo),
    categoria: toNullableString(row.categoria),
    dataRetroativa: toNullableString(row.data_retroativa ?? row.dataRetroativa),
    valorMulta: toNullableNumber(row.valor_multa ?? row.valorMulta),
  };
}

export function parseNotificationType(row: UnknownRow): NotificationType {
  return {
    id: toStringValue(row.id, crypto.randomUUID()),
    createdAt: toStringValue(
      row.created_at ?? row.createdAt,
      new Date().toISOString(),
    ),
    titulo: toNullableString(row.titulo),
    textoRegimento: toNullableRegimentoTexto(
      row.texto_regimento ?? row.textoRegimento,
    ),
  };
}

export function getRegimentoPreview(
  textoRegimento: RegimentoTexto | null,
): string {
  if (!textoRegimento || textoRegimento.length === 0) {
    return "Sem texto de regimento";
  }

  return textoRegimento.map((escopo) => escopo.titulo).join(" / ");
}

export function parseUnit(row: UnknownRow): Unit {
  return {
    id: toStringValue(row.id, crypto.randomUUID()),
    createdAt: toStringValue(
      row.created_at ?? row.createdAt,
      new Date().toISOString(),
    ),
    bloco: toStringValue(row.bloco, "-"),
    apartamento: toNullableNumber(row.apartamento),
    proprietario: toNullableResident(row.proprietario),
    alugado: toNullableBoolean(row.alugado),
    inquilino: toNullableResident(row.inquilino),
  };
}

function getResidentField(value: string | null): string {
  return value && value.trim() ? value.trim() : "Nao informado";
}

export function getPersonName(person: ResidentInfo | null): string {
  if (!person) {
    return "Nao informado";
  }

  return getResidentField(person.nome);
}

export function getPersonPhone(person: ResidentInfo | null): string {
  if (!person) {
    return "Nao informado";
  }

  return getResidentField(person.contatoTelefone);
}

export function getPersonEmail(person: ResidentInfo | null): string {
  if (!person) {
    return "Nao informado";
  }

  return getResidentField(person.contatoEmail);
}

export function getUnitLabel(unit: Unit): string {
  const apt = unit.apartamento === null ? "--" : String(unit.apartamento);
  return `Unidade ${unit.bloco}-${apt}`;
}

export function getUnitMainResident(unit: Unit): string {
  if (unit.alugado) {
    const tenant = getPersonName(unit.inquilino);
    if (tenant !== "Nao informado") {
      return tenant;
    }
  }

  return getPersonName(unit.proprietario);
}
