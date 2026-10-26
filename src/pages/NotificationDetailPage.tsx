import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Link,
  Printer,
  ShieldOff,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { RegimentoView } from "../components/ui/RegimentoView";
import {
  getNotificationById,
  getEmailCooldownRemainingMs,
  inactivateNotification,
  sendNotificationEmail,
  listNotificationAttachments,
} from "../services/notificationService";
import { getNotificationTypeById } from "../services/notificationTypeService";
import { getCondominioById } from "../services/condominioService";
import { getUnitById } from "../services/unitService";
import {
  getNotificationAuthorLabel,
  getNotificationCategoryLabel,
  getUnitLabel,
  type Notification,
  type NotificationAttachment,
  type NotificationType,
  type Unit,
  type Condominio,
} from "../types/domain";
import {
  formatCurrency,
  formatDate,
  formatOnlyDateInFull,
} from "../utils/format";
import { useCondominio } from "../contexts/useCondominio";
import { getNotificationPrintCopy } from "../utils/notificationPrint";

interface NotificationDetailPageProps {
  notificationId: string;
  onNavigate: (to: string) => void;
}

function getSourceUnitId(state: unknown): string | null {
  if (typeof state !== "object" || state === null) {
    return null;
  }

  const sourceUnitId = (state as { fromUnitId?: unknown }).fromUnitId;
  return typeof sourceUnitId === "string" && sourceUnitId.length > 0
    ? sourceUnitId
    : null;
}

export function NotificationDetailPage({
  notificationId,
  onNavigate,
}: NotificationDetailPageProps) {
  const { activeCondominioId } = useCondominio();
  const location = useLocation();
  const sourceUnitId = getSourceUnitId(location.state);
  const [row, setRow] = useState<Notification | null>(null);
  const [type, setType] = useState<NotificationType | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [attachments, setAttachments] = useState<NotificationAttachment[]>([]);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [expandedAttachment, setExpandedAttachment] =
    useState<NotificationAttachment | null>(null);
  const [isClosingExpandedAttachment, setIsClosingExpandedAttachment] =
    useState(false);
  const [isBaixaModalOpen, setIsBaixaModalOpen] = useState(false);
  const [motivoBaixaInput, setMotivoBaixaInput] = useState("");
  const [baixaError, setBaixaError] = useState<string | null>(null);
  const [isSubmittingBaixa, setIsSubmittingBaixa] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  function openExpandedAttachment(attachment: NotificationAttachment) {
    setIsClosingExpandedAttachment(false);
    setExpandedAttachment(attachment);
  }

  function closeExpandedAttachment() {
    if (isClosingExpandedAttachment) {
      return;
    }
    setIsClosingExpandedAttachment(true);
    window.setTimeout(() => {
      setExpandedAttachment(null);
      setIsClosingExpandedAttachment(false);
    }, 180);
  }

  useEffect(() => {
    if (!expandedAttachment || isClosingExpandedAttachment) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsClosingExpandedAttachment(true);
        window.setTimeout(() => {
          setExpandedAttachment(null);
          setIsClosingExpandedAttachment(false);
        }, 180);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedAttachment, isClosingExpandedAttachment]);

  useEffect(() => {
    let active = true;

    async function loadRow() {
      if (!activeCondominioId) {
        return;
      }

      try {
        const notification = await getNotificationById(
          notificationId,
          activeCondominioId,
        );

        if (!active) {
          return;
        }

        if (!notification) {
          setRow(null);
          return;
        }

        const [typeRow, unitRow, condominioRow] = await Promise.all([
          getNotificationTypeById(
            notification.idTipoNotificacao,
            activeCondominioId,
          ),
          notification.idUnidade
            ? getUnitById(notification.idUnidade, activeCondominioId)
            : Promise.resolve(null),
          getCondominioById(notification.idCondominio),
        ]);

        if (!active) {
          return;
        }

        setRow(notification);
        setType(typeRow);
        setUnit(unitRow);
        setCondominio(condominioRow);

        try {
          const attachmentRows = await listNotificationAttachments(
            notification.id,
            notification.idCondominio,
          );
          if (active) {
            setAttachments(attachmentRows);
          }
        } catch (attachmentLoadError) {
          if (active) {
            setAttachmentsError(
              attachmentLoadError instanceof Error
                ? attachmentLoadError.message
                : "Não foi possível carregar as fotos anexas.",
            );
          }
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar a notificação.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRow();

    return () => {
      active = false;
    };
  }, [activeCondominioId, notificationId]);

  async function handleConfirmBaixa() {
    if (!row || !activeCondominioId) {
      return;
    }

    const trimmedMotivo = motivoBaixaInput.trim();
    if (!trimmedMotivo) {
      setBaixaError("Informe o motivo da baixa.");
      return;
    }

    setIsSubmittingBaixa(true);
    setBaixaError(null);

    try {
      const updated = await inactivateNotification(
        row.id,
        activeCondominioId,
        trimmedMotivo,
      );
      setRow(updated);
      setIsBaixaModalOpen(false);
      setMotivoBaixaInput("");
    } catch (inactivateError) {
      setBaixaError(
        inactivateError instanceof Error
          ? inactivateError.message
          : "Não foi possível dar baixa na notificação.",
      );
    } finally {
      setIsSubmittingBaixa(false);
    }
  }

  const emailCooldownMs = row ? getEmailCooldownRemainingMs(row, now) : 0;

  useEffect(() => {
    if (emailCooldownMs <= 0) {
      return;
    }
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(emailCooldownMs, 30000) + 50,
    );
    return () => window.clearTimeout(timer);
  }, [emailCooldownMs, now]);

  async function handleSendEmail() {
    if (!row || !unit) {
      return;
    }
    setIsSendingEmail(true);
    setEmailFeedback(null);
    try {
      const updated = await sendNotificationEmail(
        row,
        unit,
        type?.titulo ?? `Tipo ${row.idTipoNotificacao}`,
        type,
        condominio,
        attachments,
      );
      setRow(updated);
      setNow(Date.now());
      setEmailFeedback({
        type: "success",
        message: `E-mail enviado para ${updated.emailEnviadoPara}.`,
      });
    } catch (sendError) {
      setEmailFeedback({
        type: "error",
        message:
          sendError instanceof Error
            ? sendError.message
            : "Não foi possível enviar o e-mail.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  }

  const typeTitle = type?.titulo ?? `Tipo ${row?.idTipoNotificacao ?? ""}`;
  const printCopy = getNotificationPrintCopy(row?.categoria ?? null);
  const formattedFine =
    row?.valorMulta === null || row?.valorMulta === undefined
      ? "valor não informado"
      : formatCurrency(row.valorMulta);

  return (
    <>
      <Panel
        title="Notificação individual"
        subtitle="Visualização completa do registro"
        leftAction={
          <button
            type="button"
            onClick={() =>
              onNavigate(
                sourceUnitId ? `/unidades/${sourceUnitId}` : "/notificacoes",
              )
            }
            aria-label={
              sourceUnitId ? "Voltar para unidade" : "Voltar para lista"
            }
            title={sourceUnitId ? "Voltar para unidade" : "Voltar para lista"}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft aria-hidden="true" size={18} />
          </button>
        }
        action={
          <div className="flex items-center gap-2">
            {row ? (
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={
                  isSendingEmail ||
                  !unit ||
                  Boolean(attachmentsError) ||
                  emailCooldownMs > 0
                }
                aria-label="Enviar e-mail de notificação"
                title={
                  emailCooldownMs > 0
                    ? `Reenvio disponível em ${Math.ceil(emailCooldownMs / 60000)} min`
                    : row.emailNotificacao
                      ? "Reenviar e-mail de notificação"
                      : "Enviar e-mail de notificação"
                }
                className={`animate-slide-down inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  row.emailNotificacao
                    ? "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                    : "border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Bell aria-hidden="true" size={18} />
              </button>
            ) : null}
            {row && row.status === "ativa" ? (
              <button
                type="button"
                onClick={() => setIsBaixaModalOpen(true)}
                aria-label="Dar baixa na notificação"
                title="Dar baixa na notificação"
                className="animate-slide-down inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
              >
                <ShieldOff aria-hidden="true" size={18} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || Boolean(attachmentsError)}
              aria-label="Imprimir notificação"
              title={
                attachmentsError
                  ? "Não foi possível carregar as fotos anexas"
                  : "Imprimir notificação"
              }
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer aria-hidden="true" size={18} />
            </button>
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Carregando notificação...</p>
        ) : null}

        {emailFeedback ? (
          <p
            role="status"
            className={`animate-slide-down print:hidden mb-4 rounded-xl border px-3 py-2 text-sm font-medium ${
              emailFeedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {emailFeedback.message}
          </p>
        ) : null}

        {error ? (
          <p className="animate-slide-down rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        {!loading && !error && !row ? (
          <EmptyState
            title="Notificação não encontrada"
            description="Este registro pode ter sido removido ou ainda não existe."
          />
        ) : null}

        {!loading && !error && row ? (
          <article className="animate-slide-down space-y-4 rounded-2xl print:border-none border border-slate-200 p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="print:hidden text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Categoria
                </p>
                <span
                  className={`print:hidden rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-widest ${
                    row.status === "ativa"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {row.status === "ativa" ? "Ativa" : "Baixada"}
                </span>
              </div>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {getNotificationCategoryLabel(row.categoria) ??
                  `Notificação #${row.id}`}
              </h3>
            </div>

            {row.status === "baixada" ? (
              <div className="print:hidden rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">
                  Baixada em {row.dataBaixa ? formatDate(row.dataBaixa) : "-"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-rose-800">
                  {row.motivoBaixa}
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Tipo de notificação
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(`/tipos-notificacao/${row.idTipoNotificacao}`)
                  }
                  className="mt-1 block w-full min-w-0 whitespace-normal wrap-break-words cursor-pointer text-left text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-600"
                >
                  {typeTitle}
                </button>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Unidade
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {row.idUnidade
                    ? unit
                      ? getUnitLabel(unit)
                      : `Unidade ${row.idUnidade}`
                    : "Sem unidade"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Criada em
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDate(row.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Data retroativa
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {row.dataRetroativa
                    ? formatDate(row.dataRetroativa)
                    : "Não informada"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Criada por
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {getNotificationAuthorLabel(row)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Motivo
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {row.motivo ?? "Sem motivo informado."}
              </p>
            </div>

            {type?.textoApoio ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Texto de apoio do tipo
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {type.textoApoio}
                </p>
              </div>
            ) : row.textoApoio ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Texto de apoio da notificação
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {row.textoApoio}
                </p>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Valor da multa
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {row.valorMulta === null ? "Não informado" : row.valorMulta}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Texto do regimento do tipo
              </p>
              <RegimentoView textoRegimento={type?.textoRegimento ?? null} />
            </div>
          </article>
        ) : null}
      </Panel>

      {!loading && !error && row && attachmentsError ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
        >
          Não foi possível carregar as fotos anexas: {attachmentsError}
        </p>
      ) : null}

      {!loading && !error && row && attachments.length > 0 ? (
        <Panel title="Fotos anexas" subtitle={`${attachments.length} foto(s)`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="animate-slide-down overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => openExpandedAttachment(attachment)}
                  aria-label={`Ampliar ${attachment.fileName}`}
                  title="Clique para ampliar a imagem"
                  className="block w-full cursor-zoom-in bg-slate-50 transition hover:opacity-95"
                >
                  <img
                    src={attachment.signedUrl}
                    alt={attachment.fileName}
                    className="h-56 w-full object-contain"
                  />
                </button>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                    {attachment.fileName}
                  </span>
                  <a
                    href={attachment.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir ${attachment.fileName} em nova página`}
                    title="Abrir em nova página"
                    className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Link aria-hidden="true" size={15} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {!loading && !error && row ? (
        <div className="hidden w-full print:block print:px-[8mm] print:py-[8mm] text-base leading-relaxed font-serif">
          <div className="w-full text-justify">
            <header className="flex flex-col items-center">
              {condominio?.logo_url ? (
                <img
                  className="mb-3 h-[22mm] w-[48mm] max-w-full shrink-0 object-contain"
                  src={condominio.logo_url}
                  alt={`Logo ${condominio.name}`}
                />
              ) : null}
              <h3 className="my-4 border-b border-slate-400 pb-1 text-center text-2xl font-bold text-slate-900">
                {printCopy.title ?? `Notificação #${row.id}`}
              </h3>
              {row.status === "baixada" ? (
                <p className="my-4 text-center text-3xl font-extrabold underline tracking-[0.2em] text-rose-700">
                  BAIXADA
                </p>
              ) : null}
              <section className="my-4 flex w-full flex-col items-center gap-1 border-y border-slate-300 py-2 text-sm">
                <p className="min-w-0 whitespace-normal wrap-break-words text-center font-semibold leading-snug text-slate-900">
                  {typeTitle}
                </p>
                <p className="shrink-0 whitespace-nowrap text-center font-bold">
                  {formatOnlyDateInFull(row.createdAt)}
                </p>
              </section>
              <section className="mt-5 w-full">
                <p className="text-justify">
                  Ao condômino(a){" "}
                  <span className="font-bold underline">
                    da unidade "{unit?.apartamento}" do Bloco "{unit?.bloco}"
                  </span>
                  , do {condominio?.name ?? "condomínio"}, situado em{" "}
                  {condominio?.location ?? "endereço não informado"}.
                </p>
              </section>
            </header>
            <main className="mt-5 space-y-4">
              <header className="main-header">
                <p className="mb-2">Prezado(a) Senhor(a),</p>
                {printCopy.kind === "fine" ? (
                  <p>
                    Na qualidade de Síndica deste Condomínio venho por meio
                    deste, avisá-lo que em seu próximo boleto de condomínio,
                    será aplicada uma{" "}
                    <span className="font-bold">
                      MULTA REGIMENTAL no valor de {formattedFine}
                    </span>{" "}
                    por desrespeito às normas do{" "}
                    <span className="font-bold underline">
                      Regulamento Interno
                    </span>
                    , conforme segue:
                  </p>
                ) : (
                  <p>
                    Na qualidade de Síndica deste Condomínio, venho{" "}
                    <span className="font-bold">
                      {printCopy.kind === "guidance"
                        ? "orientá-lo"
                        : "adverti-lo"}
                    </span>{" "}
                    por desrespeito às normas do{" "}
                    <span className="font-bold">Regimento Interno</span>, como
                    segue:
                  </p>
                )}
              </header>
              <section className="statute">
                <RegimentoView textoRegimento={type?.textoRegimento ?? null} />
              </section>
              <section className="reason">
                <p className="mb-1 font-bold underline">
                  Motivo da Notificação
                </p>
                <p className="whitespace-pre-wrap wrap-break-word">
                  {row.motivo ?? "Sem motivo informado."}
                </p>
              </section>
              {type?.textoApoio ?? row.textoApoio ? (
                <section className="support-text">
                  <p className="whitespace-pre-wrap wrap-break-word">
                    {type?.textoApoio ?? row.textoApoio}
                  </p>
                </section>
              ) : null}
            </main>
            {printCopy.kind === "fine" ? (
              <p className="mt-3">
                Sendo assim, solicitamos sua intervenção e orientação aos
                moradores de seu apartamento para que esse fato{" "}
                <span className="font-bold">não</span> mais se repita, sob pena
                de <span className="font-bold">multa diária</span> por
                desrespeito aos estatutos deste Condomínio.
              </p>
            ) : printCopy.kind === "guidance" ? (
              <p className="mt-3">
                Sendo assim, solicitamos sua intervenção e orientação aos
                moradores de seu apartamento para que esse fato{" "}
                <span className="font-bold underline">não</span> mais se repita,
                sob pena de{" "}
                <span className="font-bold underline">advertência</span> e
                posterior <span className="font-bold underline">multa</span> (em
                caso de reincidência) por desrespeito aos estatutos deste
                Condomínio.
              </p>
            ) : (
              <p className="mt-3">
                Sendo assim, solicitamos sua intervenção e orientação aos
                moradores de seu apartamento para que esse fato{" "}
                <span className="font-bold underline">não</span> mais se repita,
                sob pena de <span className="font-bold underline">multa</span>{" "}
                por desrespeito aos estatutos deste Condomínio.
              </p>
            )}
            <footer className="mx-auto mt-[16mm] flex flex-col items-center print:break-inside-avoid">
              <div className="w-64 border-t border-slate-500 pt-2 text-center">
                <p>Ana Paula Palmezan</p>
                <p>Síndica</p>
              </div>
            </footer>
          </div>
        </div>
      ) : null}

      {!loading && !error && row && attachments.length > 0 ? (
        <section className="notification-attachments-print hidden w-full print:block print:px-[8mm] print:py-[8mm] font-serif">
          <h2 className="mb-6 border-b border-slate-400 pb-2 text-center text-xl font-bold">
            Anexos da notificação #{row.id}
          </h2>
          <div className="grid grid-cols-2 gap-5">
            {attachments.map((attachment, index) => (
              <figure
                key={attachment.id}
                className="notification-attachment-print-item min-w-0 text-center"
              >
                <img
                  src={attachment.signedUrl}
                  alt={`Anexo ${index + 1}: ${attachment.fileName}`}
                  className="mx-auto max-h-[105mm] max-w-full rounded-md object-contain"
                />
                <figcaption className="mt-2 break-all text-xs text-slate-700">
                  Foto {index + 1} — {attachment.fileName}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
      {expandedAttachment ? (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeExpandedAttachment();
            }
          }}
          className={`print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-xs ${
            isClosingExpandedAttachment
              ? "animate-backdrop-out"
              : "animate-backdrop-in"
          }`}
        >
          <div
            className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
              isClosingExpandedAttachment
                ? "animate-zoom-out"
                : "animate-zoom-in"
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                {expandedAttachment.fileName}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={expandedAttachment.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir imagem em nova página"
                  title="Abrir em nova página"
                  className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <Link aria-hidden="true" size={15} />
                  <span>Abrir em nova página</span>
                </a>
                <button
                  type="button"
                  onClick={closeExpandedAttachment}
                  aria-label="Fechar visualização"
                  title="Fechar (Esc)"
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <X aria-hidden="true" size={17} />
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-950/5 p-4">
              <img
                src={expandedAttachment.signedUrl}
                alt={expandedAttachment.fileName}
                className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
      {isBaixaModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="animate-slide-down w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Dar baixa na notificação
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Essa ação é permanente e marcará o registro como baixado, mantendo
              o histórico para fins de auditoria.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Motivo da baixa
              <textarea
                value={motivoBaixaInput}
                onChange={(event) => setMotivoBaixaInput(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Ex.: Notificação emitida para a unidade incorreta."
              />
            </label>
            {baixaError ? (
              <p className="animate-slide-down mt-2 text-sm font-medium text-rose-600">
                {baixaError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsBaixaModalOpen(false);
                  setMotivoBaixaInput("");
                  setBaixaError(null);
                }}
                disabled={isSubmittingBaixa}
                className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmBaixa()}
                disabled={isSubmittingBaixa}
                className="cursor-pointer rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingBaixa ? "Dando baixa..." : "Confirmar baixa"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
