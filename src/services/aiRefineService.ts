import type { RegimentoTexto } from "../types/domain";
import { isDemoMode } from "./demoMode";
import { supabase, supabaseConfigError } from "./supabase";

export type RefineStatus = "success" | "out_of_scope" | "needs_clarification";

export type NotificationCategoryType = "Multa" | "Orientacao" | "Advertencia";

export interface RefineNotificationReasonInput {
  motivoRascunho: string;
  categoria: NotificationCategoryType;
  modeloTitulo?: string | null;
  textoRegimento?: RegimentoTexto | null;
  dataOcorrencia?: string | null;
  limiteCaracteres: number;
}

export interface RefineNotificationReasonResult {
  status: RefineStatus;
  textoRefinado: string;
  mensagemFeedback: string;
}

export function formatRegimentoForPrompt(
  textoRegimento: RegimentoTexto | null | undefined,
): string {
  if (!textoRegimento || textoRegimento.length === 0) {
    return "";
  }

  return textoRegimento
    .map((escopo) => {
      const paragrafos = escopo.paragrafos
        .map((p) => `  - ${p.artigo}: ${p.texto}`)
        .join("\n");
      return `[${escopo.titulo}]\n${paragrafos}`;
    })
    .join("\n\n");
}

function normalizeSingleParagraph(text: string): string {
  return text
    .replace(/\r\n/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function enforceCharLimit(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  const base = lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated;
  return /[.!?]$/.test(base) ? base : `${base.trimEnd()}.`;
}

function simulateDemoRefine(
  input: RefineNotificationReasonInput,
): RefineNotificationReasonResult {
  const trimmed = input.motivoRascunho.trim();
  const lower = trimmed.toLowerCase();

  // Testes sem sentido, piadas ou fora de escopo
  const outOfScopePatterns = [
    /^([a-z0-9])\1{3,}$/i, // "aaaaa", "11111"
    /^(asdf|qwer|teste|1234)/i,
    /(receita|bolo|pizza|poema|futebol|horóscopo|signo|piada|programação|javascript)/i,
  ];

  if (outOfScopePatterns.some((pattern) => pattern.test(lower))) {
    return {
      status: "out_of_scope",
      textoRefinado: "",
      mensagemFeedback:
        "O texto informado não parece descrever uma ocorrência condominial válida. Por favor, descreva o fato ocorrido (ex: barulho em horário de repouso, lixo em local inadequado).",
    };
  }

  // Relato excessivamente vago
  if (
    trimmed.length < 15 ||
    /^(ele é chato|vizinho chato|reclamação|ruim|vizinho sem educação|problema)$/i.test(
      lower,
    )
  ) {
    return {
      status: "needs_clarification",
      textoRefinado: "",
      mensagemFeedback:
        "O relato está muito resumido ou genérico. Forneça maiores detalhes sobre a conduta ou fato observado para formular a notificação.",
    };
  }

  // Extrai primeiro artigo do regimento se houver
  const firstArtigo =
    input.textoRegimento?.[0]?.paragrafos?.[0]?.artigo ?? null;
  const regimentoRef = firstArtigo
    ? `, em infringência ao ${firstArtigo} do Regimento Interno`
    : ", em desacordo com as normas internas de convivência";

  const dataRef = input.dataOcorrencia
    ? ` na data de ${input.dataOcorrencia}`
    : "";

  let template: string;
  if (input.categoria === "Orientacao") {
    template = `Constatou-se ocorrência referente a ${trimmed}${dataRef}${regimentoRef}. Solicitamos a gentileza e colaboração dos moradores quanto à observância das regras condominiais, visando ao bom convívio coletivo.`;
  } else if (input.categoria === "Advertencia") {
    template = `Verificou-se infração condominial caracterizada por ${trimmed}${dataRef}${regimentoRef}. Fica a respectiva unidade advertida formalmente sobre a irregularidade, reiterando-se que a reincidência ensejará a aplicação de sanções regimentais.`;
  } else {
    template = `Constatou-se a infração às normas do condomínio consistente em ${trimmed}${dataRef}${regimentoRef}, configurando fato gerador para a aplicação de penalidade de multa, conforme deliberado no regulamento interno.`;
  }

  const normalized = normalizeSingleParagraph(template);
  const textoRefinado = enforceCharLimit(normalized, input.limiteCaracteres);

  return {
    status: "success",
    textoRefinado,
    mensagemFeedback:
      "Texto reformulado com sucesso em parágrafo formal e impessoal.",
  };
}

export async function refineNotificationReason(
  input: RefineNotificationReasonInput,
): Promise<RefineNotificationReasonResult> {
  if (isDemoMode()) {
    // Simula pequena latência de rede no modo de demonstração
    await new Promise((resolve) => setTimeout(resolve, 500));
    return simulateDemoRefine(input);
  }

  if (!supabase) {
    throw new Error(
      supabaseConfigError ?? "Cliente Supabase não está configurado.",
    );
  }

  const regrasRegimento = formatRegimentoForPrompt(input.textoRegimento);

  const { data, error } = await supabase.functions.invoke("refine-motivo", {
    body: {
      motivoRascunho: input.motivoRascunho,
      categoria: input.categoria,
      modeloTitulo: input.modeloTitulo ?? "",
      regrasRegimento,
      dataOcorrencia: input.dataOcorrencia ?? "",
      limiteCaracteres: input.limiteCaracteres,
    },
  });

  if (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("429")) {
      throw new Error(
        "Limite de requisições da IA atingido temporariamente. Aguarde alguns instantes e tente novamente.",
      );
    }
    if (errorMsg.includes("401")) {
      throw new Error(
        "Sessão expirada ou não autorizada para utilizar o assistente de IA.",
      );
    }
    throw new Error(
      `Não foi possível refinar o motivo com IA: ${errorMsg}`,
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error("Resposta inválida recebida do serviço de IA.");
  }

  const typedData = data as {
    status?: unknown;
    texto_refinado?: unknown;
    mensagem_feedback?: unknown;
    error?: unknown;
  };

  if (typedData.error) {
    throw new Error(String(typedData.error));
  }

  const rawStatus = typedData.status;
  const status: RefineStatus =
    rawStatus === "success" ||
    rawStatus === "out_of_scope" ||
    rawStatus === "needs_clarification"
      ? rawStatus
      : "needs_clarification";

  const textoRefinado =
    typeof typedData.texto_refinado === "string"
      ? normalizeSingleParagraph(typedData.texto_refinado)
      : "";

  const mensagemFeedback =
    typeof typedData.mensagem_feedback === "string" &&
    typedData.mensagem_feedback.trim().length > 0
      ? typedData.mensagem_feedback.trim()
      : status === "success"
        ? "Motivo reformulado com sucesso."
        : "Não foi possível validar o motivo informado.";

  return {
    status,
    textoRefinado,
    mensagemFeedback,
  };
}
