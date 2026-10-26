import {
  getNotificationCategoryLabel,
  MAX_MOTIVO_LENGTH,
  MAX_TEXTO_APOIO_LENGTH,
  PRINT_CHARS_PER_LINE,
  PRINT_MODEL_MAX_LINES,
  PRINT_PAGE_MAX_LINES,
  PRINT_REGIMENTO_CHARS_PER_LINE,
  type RegimentoTexto,
} from "../types/domain";

export type NotificationPrintKind = "warning" | "guidance" | "fine";

export function getNotificationPrintCopy(category: string | null): {
  kind: NotificationPrintKind;
  title: string | null;
} {
  const normalizedCategory = category
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");

  if (normalizedCategory === "multa") {
    return { kind: "fine", title: "AVISO DE MULTA" };
  }

  if (normalizedCategory === "orientacao") {
    return { kind: "guidance", title: "CARTA DE ORIENTAÇÃO" };
  }

  if (normalizedCategory === "advertencia") {
    return { kind: "warning", title: "CARTA DE ADVERTÊNCIA" };
  }

  return {
    kind: "warning",
    title: category
      ? `CARTA DE ${(getNotificationCategoryLabel(category) ?? category).toUpperCase()}`
      : null,
  };
}

/**
 * Estima quantas linhas visuais um bloco de texto ocupa na folha A4 impressa,
 * considerando quebras de linha manuais (\n) e largura média por linha.
 */
export function estimateWrappedTextLines(
  text: string | null | undefined,
  charsPerLine = PRINT_CHARS_PER_LINE,
): number {
  const normalized = (text ?? "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return 0;
  }

  return normalized
    .split("\n")
    .reduce(
      (sum, segment) =>
        sum + Math.max(1, Math.ceil(segment.length / charsPerLine)),
      0,
    );
}

/**
 * Calcula quantos caracteres equivalentes foram "consumidos" por quebras de linha (\n)
 * antes de completar uma linha cheia.
 */
export function estimateLineBreakPenaltyChars(
  text: string | null | undefined,
  charsPerLine = PRINT_CHARS_PER_LINE,
): number {
  const normalized = (text ?? "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return 0;
  }

  const actualLines = estimateWrappedTextLines(normalized, charsPerLine);
  const continuousLines = Math.max(
    1,
    Math.ceil(normalized.length / charsPerLine),
  );
  const extraLines = Math.max(0, actualLines - continuousLines);

  return extraLines * charsPerLine;
}

/**
 * Estima quantas linhas da página A4 são ocupadas pelos escopos e parágrafos
 * do regimento interno vinculado ao modelo de notificação.
 */
export function estimateRegimentoLines(
  textoRegimento: RegimentoTexto | null | undefined,
): number {
  if (!textoRegimento || textoRegimento.length === 0) {
    return 0;
  }

  let totalLines = 0;

  for (const escopo of textoRegimento) {
    // 1 linha para o título em negrito + ~0.4 de espaçamento inferior do escopo
    totalLines += 1.4;

    for (const paragrafo of escopo.paragrafos) {
      // 1 linha para o cabeçalho "Art. X" + linhas do texto do parágrafo indentado
      const paragraphLines = Math.max(
        1,
        estimateWrappedTextLines(
          paragrafo.texto,
          PRINT_REGIMENTO_CHARS_PER_LINE,
        ),
      );
      totalLines += 1 + paragraphLines;
    }
  }

  return Math.ceil(totalLines);
}

export interface NotificationPrintBudget {
  maxPageLines: number;
  regimentoLines: number;
  motivoLines: number;
  supportTextLines: number;
  totalUsedLines: number;
  remainingLines: number;
  isOverBudget: boolean;
  maxMotivoChars: number;
  maxSupportTextChars: number;
}

/**
 * Calcula o orçamento híbrido (dinâmico por página A4 + teto fixo por campo)
 * para o formulário de criação de notificação.
 */
export function calculateNotificationPrintBudget(params: {
  textoRegimento: RegimentoTexto | null | undefined;
  modelTextoApoio: string | null | undefined;
  usarCustomTextoApoio: boolean;
  customTextoApoio: string | null | undefined;
  motivo: string | null | undefined;
}): NotificationPrintBudget {
  const regimentoLines = estimateRegimentoLines(params.textoRegimento);
  const trimmedModelSupport = params.modelTextoApoio?.trim() || "";
  const trimmedCustomSupport = params.customTextoApoio?.trim() || "";
  const trimmedMotivo = params.motivo?.trim() || "";

  const hasModelSupport = trimmedModelSupport.length > 0;
  const activeSupportText = hasModelSupport
    ? trimmedModelSupport
    : params.usarCustomTextoApoio
      ? trimmedCustomSupport
      : "";

  // Quando o texto de apoio está presente (ou habilitado), há 1 linha de margem de bloco + linhas do texto
  const supportTextLines = hasModelSupport
    ? 1 + estimateWrappedTextLines(trimmedModelSupport)
    : params.usarCustomTextoApoio
      ? 1 + Math.max(1, estimateWrappedTextLines(trimmedCustomSupport))
      : 0;

  const motivoLines = trimmedMotivo
    ? estimateWrappedTextLines(trimmedMotivo)
    : 0;

  const totalUsedLines = regimentoLines + motivoLines + supportTextLines;
  const remainingLines = Math.max(0, PRINT_PAGE_MAX_LINES - totalUsedLines);
  const isOverBudget = totalUsedLines > PRINT_PAGE_MAX_LINES;

  // Linhas disponíveis para o motivo descontando regimento e texto de apoio ativo
  const availableLinesForMotivo = Math.max(
    0,
    PRINT_PAGE_MAX_LINES - regimentoLines - supportTextLines,
  );
  const motivoPenalty = estimateLineBreakPenaltyChars(trimmedMotivo);
  const rawMaxMotivoChars =
    availableLinesForMotivo * PRINT_CHARS_PER_LINE - motivoPenalty;
  const maxMotivoChars = Math.max(
    0,
    Math.min(MAX_MOTIVO_LENGTH, rawMaxMotivoChars),
  );

  // Linhas disponíveis para o texto de apoio personalizado descontando regimento, motivo (mín 1 linha) e 1 linha de margem do bloco
  const effectiveMotivoLinesForSupport = Math.max(1, motivoLines);
  const availableLinesForSupportText = hasModelSupport
    ? 0
    : Math.max(
        0,
        PRINT_PAGE_MAX_LINES -
          regimentoLines -
          effectiveMotivoLinesForSupport -
          1,
      );
  const supportPenalty = estimateLineBreakPenaltyChars(activeSupportText);
  const rawMaxSupportChars =
    availableLinesForSupportText * PRINT_CHARS_PER_LINE - supportPenalty;
  const maxSupportTextChars = Math.max(
    0,
    Math.min(MAX_TEXTO_APOIO_LENGTH, rawMaxSupportChars),
  );

  return {
    maxPageLines: PRINT_PAGE_MAX_LINES,
    regimentoLines,
    motivoLines,
    supportTextLines,
    totalUsedLines,
    remainingLines,
    isOverBudget,
    maxMotivoChars,
    maxSupportTextChars,
  };
}

export interface ModelPrintBudget {
  maxModelLines: number;
  regimentoLines: number;
  supportTextLines: number;
  totalUsedLines: number;
  remainingLinesForModel: number;
  isOverBudget: boolean;
  maxSupportTextChars: number;
}

/**
 * Calcula o orçamento da página A4 ao cadastrar um Modelo de Notificação,
 * reservando pelo menos 3 linhas na folha para o motivo das notificações futuras.
 */
export function calculateModelPrintBudget(params: {
  textoRegimento: RegimentoTexto | null | undefined;
  usarTextoApoio: boolean;
  textoApoio: string | null | undefined;
}): ModelPrintBudget {
  const regimentoLines = estimateRegimentoLines(params.textoRegimento);
  const trimmedSupport = params.textoApoio?.trim() || "";
  const supportTextLines = params.usarTextoApoio
    ? 1 + Math.max(1, estimateWrappedTextLines(trimmedSupport))
    : 0;

  const totalUsedLines = regimentoLines + supportTextLines;
  const remainingLinesForModel = Math.max(
    0,
    PRINT_MODEL_MAX_LINES - totalUsedLines,
  );
  const isOverBudget = totalUsedLines > PRINT_MODEL_MAX_LINES;

  const availableLinesForSupport = Math.max(
    0,
    PRINT_MODEL_MAX_LINES - regimentoLines - 1,
  );
  const supportPenalty = estimateLineBreakPenaltyChars(trimmedSupport);
  const rawMaxSupportChars =
    availableLinesForSupport * PRINT_CHARS_PER_LINE - supportPenalty;
  const maxSupportTextChars = Math.max(
    0,
    Math.min(MAX_TEXTO_APOIO_LENGTH, rawMaxSupportChars),
  );

  return {
    maxModelLines: PRINT_MODEL_MAX_LINES,
    regimentoLines,
    supportTextLines,
    totalUsedLines,
    remainingLinesForModel,
    isOverBudget,
    maxSupportTextChars,
  };
}
