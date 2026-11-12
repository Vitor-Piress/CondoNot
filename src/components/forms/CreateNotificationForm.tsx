import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useCondominio } from "../../contexts/useCondominio";
import { NotificationTypeCombobox } from "../ui/NotificationTypeCombobox";
import { UnitCombobox } from "../ui/UnitCombobox";
import { refineNotificationReason } from "../../services/aiRefineService";
import {
  createNotification,
  NotificationAttachmentCreationError,
} from "../../services/notificationService";
import { listNotificationTypes } from "../../services/notificationTypeService";
import { listUnits } from "../../services/unitService";
import {
  MAX_NOTIFICATION_ATTACHMENTS,
  MAX_NOTIFICATION_ATTACHMENT_SIZE_BYTES,
  NOTIFICATION_ATTACHMENT_MIME_TYPES,
  validateNotificationAttachments,
} from "../../services/storageService";
import {
  MAX_MOTIVO_LENGTH,
  MAX_TEXTO_APOIO_LENGTH,
  MIN_MOTIVO_LENGTH,
  MIN_TEXTO_APOIO_LENGTH,
  type NotificationType,
  type Unit,
} from "../../types/domain";
import { formatCurrency } from "../../utils/format";
import { calculateNotificationPrintBudget } from "../../utils/notificationPrint";

const createNotificationSchema = z
  .object({
    idTipoNotificacao: z
      .string()
      .trim()
      .min(1, "Selecione um modelo de notificação."),
    idUnidade: z.string().trim().min(1, "Selecione uma unidade."),
    categoria: z.enum(["Multa", "Orientacao", "Advertencia"]),
    motivo: z
      .string()
      .trim()
      .min(
        MIN_MOTIVO_LENGTH,
        `Descreva o motivo com ao menos ${MIN_MOTIVO_LENGTH} caracteres.`,
      )
      .max(
        MAX_MOTIVO_LENGTH,
        `O motivo deve ter no máximo ${MAX_MOTIVO_LENGTH} caracteres.`,
      ),
    usarTextoApoio: z.boolean(),
    textoApoio: z
      .string()
      .trim()
      .max(
        MAX_TEXTO_APOIO_LENGTH,
        `O texto de apoio deve ter no máximo ${MAX_TEXTO_APOIO_LENGTH} caracteres.`,
      )
      .optional(),
    dataRetroativa: z.string().trim(),
  })
  .refine(
    (values) =>
      !values.usarTextoApoio ||
      (values.textoApoio && values.textoApoio.length >= MIN_TEXTO_APOIO_LENGTH),
    {
      message: `Informe o texto de apoio (mínimo de ${MIN_TEXTO_APOIO_LENGTH} caracteres) ou desative essa opção.`,
      path: ["textoApoio"],
    },
  );

type CreateNotificationValues = z.infer<typeof createNotificationSchema>;

interface CreateNotificationFormProps {
  onSuccess: (notificationId: string) => void;
  onSelectionChange?: (selection: { unitId: string; typeId: string }) => void;
}

function toNullableDate(value: string): string | null {
  return value ? value : null;
}

const categoryOptions = [
  { value: "Multa", label: "Multa" },
  { value: "Orientacao", label: "Orientação" },
  { value: "Advertencia", label: "Advertência" },
] as const;

interface AttachmentPreviewProps {
  file: File;
  index: number;
  disabled: boolean;
  onRemove: (index: number) => void;
}

function AttachmentPreview({
  file,
  index,
  disabled,
  onRemove,
}: AttachmentPreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = imageRef.current;
    if (image) {
      image.src = url;
    }

    return () => {
      URL.revokeObjectURL(url);
      image?.removeAttribute("src");
    };
  }, [file]);

  return (
    <li className="animate-slide-down overflow-hidden rounded-xl border border-slate-200">
      <img
        ref={imageRef}
        alt={`Prévia de ${file.name}`}
        className="h-32 w-full object-cover"
      />
      <div className="flex items-center justify-between gap-2 p-2">
        <span className="truncate text-xs text-slate-600">{file.name}</span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={disabled}
          className="shrink-0 cursor-pointer text-xs font-semibold text-rose-700 hover:underline disabled:cursor-not-allowed"
        >
          Remover
        </button>
      </div>
    </li>
  );
}

export function CreateNotificationForm({
  onSuccess,
  onSelectionChange,
}: CreateNotificationFormProps) {
  const { activeCondominioId, activeCondominio } = useCondominio();
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [partialNotificationId, setPartialNotificationId] = useState<
    string | null
  >(null);
  const [isRefining, setIsRefining] = useState(false);
  const [previousMotivoDraft, setPreviousMotivoDraft] = useState<string | null>(
    null,
  );
  const [refineFeedback, setRefineFeedback] = useState<{
    tone: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateNotificationValues>({
    resolver: zodResolver(createNotificationSchema),
    defaultValues: {
      idTipoNotificacao: "",
      idUnidade: "",
      categoria: "Orientacao",
      motivo: "",
      usarTextoApoio: false,
      textoApoio: "",
      dataRetroativa: "",
    },
  });

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      if (!activeCondominioId) {
        return;
      }

      try {
        const [typeRows, unitRows] = await Promise.all([
          listNotificationTypes(activeCondominioId),
          listUnits("", activeCondominioId),
        ]);

        if (!active) {
          return;
        }

        setTypes(typeRows);
        setUnits(unitRows);
      } catch (error) {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os campos de apoio.";
        setServerMessage(message);
      } finally {
        if (active) {
          setLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, [activeCondominioId]);

  const selectedCategory = useWatch({
    control,
    name: "categoria",
  });
  const selectedUnitId = useWatch({
    control,
    name: "idUnidade",
  });
  const selectedTypeId = useWatch({
    control,
    name: "idTipoNotificacao",
  });
  const usarTextoApoio = useWatch({
    control,
    name: "usarTextoApoio",
  });
  const textoApoioValue = useWatch({
    control,
    name: "textoApoio",
  });
  const motivoValue = useWatch({
    control,
    name: "motivo",
  });
  const dataRetroativaValue = useWatch({
    control,
    name: "dataRetroativa",
  });

  const selectedType = types.find((type) => type.id === selectedTypeId) ?? null;
  const typeHasSupportText = Boolean(selectedType?.textoApoio?.trim());

  const printBudget = calculateNotificationPrintBudget({
    textoRegimento: selectedType?.textoRegimento,
    modelTextoApoio: selectedType?.textoApoio,
    usarCustomTextoApoio: !typeHasSupportText && Boolean(usarTextoApoio),
    customTextoApoio: textoApoioValue,
    motivo: motivoValue,
  });
  const continuousBudget = calculateNotificationPrintBudget({
    textoRegimento: selectedType?.textoRegimento,
    modelTextoApoio: selectedType?.textoApoio,
    usarCustomTextoApoio: !typeHasSupportText && Boolean(usarTextoApoio),
    customTextoApoio: textoApoioValue,
    motivo: "",
  });
  const aiMaxChars = continuousBudget.maxMotivoChars;
  const canEnableCustomSupportText =
    printBudget.maxSupportTextChars >= MIN_TEXTO_APOIO_LENGTH;

  useEffect(() => {
    onSelectionChange?.({
      unitId: selectedUnitId ?? "",
      typeId: selectedTypeId ?? "",
    });
  }, [selectedUnitId, selectedTypeId, onSelectionChange]);

  useEffect(() => {
    return () => {
      onSelectionChange?.({ unitId: "", typeId: "" });
    };
  }, [onSelectionChange]);

  function handleAttachmentChange(files: FileList | null) {
    const nextFiles = [...attachmentFiles, ...Array.from(files ?? [])];

    try {
      validateNotificationAttachments(nextFiles);
      setAttachmentFiles(nextFiles);
      setServerMessage(null);
      setPartialNotificationId(null);
    } catch (error) {
      setServerMessage(
        error instanceof Error ? error.message : "Fotos inválidas.",
      );
    }
  }

  function removeAttachment(index: number) {
    setAttachmentFiles((files) =>
      files.filter((_, fileIndex) => fileIndex !== index),
    );
  }

  async function handleRefineMotivo() {
    const currentDraft = (motivoValue ?? "").trim();
    if (currentDraft.length < MIN_MOTIVO_LENGTH) {
      setRefineFeedback({
        tone: "warning",
        message: `Digite ao menos ${MIN_MOTIVO_LENGTH} caracteres no motivo antes de solicitar o refinamento com IA.`,
      });
      return;
    }

    if (aiMaxChars < MIN_MOTIVO_LENGTH) {
      setRefineFeedback({
        tone: "warning",
        message:
          "O regimento do modelo e o texto de apoio selecionados já ocupam todo o espaço da página A4.",
      });
      return;
    }

    setIsRefining(true);
    setRefineFeedback(null);

    try {
      const result = await refineNotificationReason({
        motivoRascunho: currentDraft,
        categoria: selectedCategory,
        modeloTitulo: selectedType?.titulo ?? null,
        textoRegimento: selectedType?.textoRegimento ?? null,
        dataOcorrencia: dataRetroativaValue || null,
        limiteCaracteres: aiMaxChars,
      });

      if (result.status === "success" && result.textoRefinado) {
        setPreviousMotivoDraft(motivoValue ?? "");
        setValue("motivo", result.textoRefinado, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
        clearErrors("motivo");
        setRefineFeedback({
          tone: "success",
          message: result.mensagemFeedback,
        });
      } else {
        // Mantém o texto digitado intacto e exibe o feedback instrutivo
        setRefineFeedback({
          tone: "warning",
          message: result.mensagemFeedback,
        });
      }
    } catch (error) {
      setRefineFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro ao refinar o motivo com IA. Seu rascunho original foi mantido.",
      });
    } finally {
      setIsRefining(false);
    }
  }

  function handleUndoRefine() {
    if (previousMotivoDraft !== null) {
      setValue("motivo", previousMotivoDraft, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
      setPreviousMotivoDraft(null);
      setRefineFeedback(null);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerMessage(null);

    if (!activeCondominioId) {
      setServerMessage("Selecione um condomínio antes de criar a notificação.");
      return;
    }

    if (
      values.categoria === "Multa" &&
      (!activeCondominio || activeCondominio.valor_multa === null)
    ) {
      setServerMessage(
        "Configure o valor da multa nas configurações do condomínio antes de emitir uma multa.",
      );
      return;
    }

    const submitBudget = calculateNotificationPrintBudget({
      textoRegimento: selectedType?.textoRegimento,
      modelTextoApoio: selectedType?.textoApoio,
      usarCustomTextoApoio: !typeHasSupportText && values.usarTextoApoio,
      customTextoApoio: values.textoApoio,
      motivo: values.motivo,
    });

    if (values.motivo.trim().length > submitBudget.maxMotivoChars) {
      setError("motivo", {
        type: "manual",
        message: `Para caber em 1 página A4 com o modelo selecionado, o motivo deve ter no máximo ${submitBudget.maxMotivoChars} caracteres (reduza o texto ou quebras de linha).`,
      });
      return;
    }

    if (
      !typeHasSupportText &&
      values.usarTextoApoio &&
      (values.textoApoio?.trim().length ?? 0) > submitBudget.maxSupportTextChars
    ) {
      setError("textoApoio", {
        type: "manual",
        message: `Para caber em 1 página A4, o texto de apoio deve ter no máximo ${submitBudget.maxSupportTextChars} caracteres (reduza o texto de apoio ou o motivo).`,
      });
      return;
    }

    if (submitBudget.isOverBudget) {
      setError("motivo", {
        type: "manual",
        message: `O conteúdo total (${submitBudget.totalUsedLines} linhas) ultrapassa o limite de ${submitBudget.maxPageLines} linhas da página A4 impressa. Reduza o motivo, o texto de apoio ou as quebras de linha.`,
      });
      return;
    }

    try {
      const created = await createNotification({
        idCondominio: activeCondominioId,
        idTipoNotificacao: values.idTipoNotificacao,
        idUnidade: values.idUnidade,
        categoria: values.categoria,
        motivo: values.motivo,
        textoApoio:
          !typeHasSupportText && values.usarTextoApoio && values.textoApoio
            ? values.textoApoio.trim()
            : null,
        dataRetroativa: toNullableDate(values.dataRetroativa),
        valorMulta:
          values.categoria === "Multa"
            ? (activeCondominio?.valor_multa ?? null)
            : null,
        attachments: attachmentFiles,
      });

      reset();
      setAttachmentFiles([]);
      setPreviousMotivoDraft(null);
      setRefineFeedback(null);
      onSuccess(created.id);
    } catch (error) {
      if (error instanceof NotificationAttachmentCreationError) {
        setPartialNotificationId(error.notificationId);
      }
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível criar a notificação.";
      setServerMessage(message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="block font-medium text-slate-700">
            Modelo de notificação
          </span>
          <Controller
            control={control}
            name="idTipoNotificacao"
            render={({ field }) => (
              <NotificationTypeCombobox
                types={types}
                value={field.value}
                onChange={(nextTypeId) => {
                  field.onChange(nextTypeId);
                  const nextType = types.find((t) => t.id === nextTypeId);
                  if (!nextTypeId || Boolean(nextType?.textoApoio?.trim())) {
                    setValue("usarTextoApoio", false, { shouldValidate: true });
                    setValue("textoApoio", "", { shouldValidate: true });
                  }
                }}
                disabled={loadingOptions}
                placeholder="Digite para buscar o modelo"
              />
            )}
          />
          {errors.idTipoNotificacao ? (
            <p className="text-xs font-medium text-rose-600">
              {errors.idTipoNotificacao.message}
            </p>
          ) : null}
        </label>

        <label className="block space-y-1 text-sm">
          <span className="block font-medium text-slate-700">Unidade</span>
          <Controller
            control={control}
            name="idUnidade"
            render={({ field }) => (
              <UnitCombobox
                units={units}
                value={field.value}
                onChange={field.onChange}
                disabled={loadingOptions}
                placeholder="Digite o bloco ou apartamento"
              />
            )}
          />
          {errors.idUnidade ? (
            <p className="text-xs font-medium text-rose-600">
              {errors.idUnidade.message}
            </p>
          ) : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="block font-medium text-slate-700">Categoria</span>
          <select
            {...register("categoria")}
            className="block h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 outline-none ring-slate-200 transition focus:ring"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.categoria ? (
            <p className="text-xs font-medium text-rose-600">
              {errors.categoria.message}
            </p>
          ) : null}
        </label>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="motivo-textarea"
            className="font-medium text-slate-700"
          >
            Motivo
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {previousMotivoDraft !== null && !isRefining ? (
              <button
                type="button"
                onClick={handleUndoRefine}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                title="Desfazer refinamento e restaurar texto original"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Desfazer
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleRefineMotivo()}
              disabled={
                isRefining ||
                isSubmitting ||
                (motivoValue ?? "").trim().length < MIN_MOTIVO_LENGTH ||
                aiMaxChars < MIN_MOTIVO_LENGTH
              }
              title={
                (motivoValue ?? "").trim().length < MIN_MOTIVO_LENGTH
                  ? `Digite ao menos ${MIN_MOTIVO_LENGTH} caracteres para refinar com IA`
                  : aiMaxChars < MIN_MOTIVO_LENGTH
                    ? "Espaço insuficiente na folha A4 para refinar"
                    : "Refinar redação do motivo com IA baseando-se no regimento"
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-2xs transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefining ? (
                <>
                  <Loader2
                    size={13}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  Refinando...
                </>
              ) : (
                <>
                  <Sparkles size={13} aria-hidden="true" />
                  Refinar com IA
                </>
              )}
            </button>
            <span
              className={`text-xs ${
                (motivoValue ?? "").trim().length > printBudget.maxMotivoChars
                  ? "font-semibold text-rose-600"
                  : "text-slate-400"
              }`}
            >
              {(motivoValue ?? "").length}/{printBudget.maxMotivoChars}{" "}
              caracteres
            </span>
          </div>
        </div>
        <textarea
          id="motivo-textarea"
          {...register("motivo")}
          rows={4}
          maxLength={Math.max(
            (motivoValue ?? "").length,
            printBudget.maxMotivoChars,
          )}
          disabled={isRefining}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring disabled:bg-slate-50 disabled:text-slate-500"
          placeholder="Descreva o motivo da notificação"
        />
        {refineFeedback ? (
          <div
            className={`flex items-start justify-between gap-2 rounded-xl border p-2.5 text-xs ${
              refineFeedback.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : refineFeedback.tone === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <p className="flex-1 leading-relaxed">{refineFeedback.message}</p>
            <button
              type="button"
              onClick={() => setRefineFeedback(null)}
              className="cursor-pointer text-slate-400 hover:text-slate-600"
              aria-label="Fechar mensagem de feedback da IA"
            >
              ✕
            </button>
          </div>
        ) : null}
        <p className="text-xs text-slate-500">
          Limite dinâmico calculado conforme o espaço restante na folha A4 (teto
          de {MAX_MOTIVO_LENGTH} caracteres; quebras de linha também consomem
          espaço vertical).
        </p>
        {errors.motivo ? (
          <p className="text-xs font-medium text-rose-600">
            {errors.motivo.message}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        {!selectedType ? (
          <>
            <label className="flex cursor-not-allowed items-center gap-2 text-sm font-medium text-slate-400">
              <input type="checkbox" disabled checked={false} readOnly />
              Incluir texto de apoio na carta impressa
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Selecione um modelo de notificação primeiro. O texto de apoio
              específico da notificação só fica disponível quando o modelo não
              possui texto de apoio próprio.
            </p>
          </>
        ) : typeHasSupportText ? (
          <div className="space-y-2">
            <label className="flex cursor-not-allowed items-center gap-2 text-sm font-medium text-slate-400">
              <input type="checkbox" disabled checked={false} readOnly />
              Incluir texto de apoio na carta impressa
            </label>
            <p className="text-xs text-slate-500">
              O modelo selecionado já possui um texto de apoio padrão e será
              utilizado automaticamente na impressão:
            </p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs whitespace-pre-wrap text-slate-600">
              {selectedType.textoApoio}
            </p>
          </div>
        ) : (
          <>
            <label
              className={`flex items-center gap-2 text-sm font-medium ${
                !canEnableCustomSupportText && !usarTextoApoio
                  ? "cursor-not-allowed text-slate-400"
                  : "cursor-pointer text-slate-700"
              }`}
            >
              <input
                type="checkbox"
                disabled={!canEnableCustomSupportText && !usarTextoApoio}
                {...register("usarTextoApoio")}
              />
              Incluir texto de apoio na carta impressa
            </label>
            {!canEnableCustomSupportText && !usarTextoApoio ? (
              <p className="mt-1 text-xs text-amber-700">
                O regimento deste modelo e o motivo digitado já ocupam todo o
                espaço da folha A4. Reduza o tamanho do motivo caso queira
                incluir um texto de apoio.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Como o modelo selecionado não possui texto de apoio, você pode
                incluir uma orientação complementar exclusiva para esta
                notificação (entre {MIN_TEXTO_APOIO_LENGTH} e{" "}
                {printBudget.maxSupportTextChars} caracteres disponíveis na
                folha A4).
              </p>
            )}
            {usarTextoApoio ? (
              <label className="animate-slide-down mt-3 block space-y-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700">
                    Texto de apoio
                  </span>
                  <span
                    className={`text-xs ${
                      (textoApoioValue ?? "").trim().length >
                      printBudget.maxSupportTextChars
                        ? "font-semibold text-rose-600"
                        : "text-slate-400"
                    }`}
                  >
                    {(textoApoioValue ?? "").length}/
                    {printBudget.maxSupportTextChars} caracteres
                  </span>
                </div>
                <textarea
                  {...register("textoApoio")}
                  rows={3}
                  maxLength={Math.max(
                    (textoApoioValue ?? "").length,
                    printBudget.maxSupportTextChars,
                  )}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
                  placeholder="Ex.: Reforçamos que o descumprimento reincidente poderá resultar em multa."
                />
                {errors.textoApoio ? (
                  <p className="text-xs font-medium text-rose-600">
                    {errors.textoApoio.message}
                  </p>
                ) : null}
              </label>
            ) : null}
          </>
        )}
      </div>

      {selectedType ? (
        <div
          className={`rounded-xl border px-3.5 py-2.5 text-xs ${
            printBudget.isOverBudget
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : printBudget.totalUsedLines >= printBudget.maxPageLines - 3
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">
              Ocupação estimada na folha A4 impressa
            </span>
            <span className="font-semibold">
              {printBudget.totalUsedLines}/{printBudget.maxPageLines} linhas (
              {Math.min(
                100,
                Math.round(
                  (printBudget.totalUsedLines / printBudget.maxPageLines) * 100,
                ),
              )}
              %)
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full transition-all ${
                printBudget.isOverBudget
                  ? "bg-rose-600"
                  : printBudget.totalUsedLines >= printBudget.maxPageLines - 3
                    ? "bg-amber-500"
                    : "bg-slate-800"
              }`}
              style={{
                width: `${Math.min(100, (printBudget.totalUsedLines / printBudget.maxPageLines) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] opacity-90">
            Regimento do modelo: {printBudget.regimentoLines} linha(s) · Motivo:{" "}
            {printBudget.motivoLines} linha(s) · Texto de apoio:{" "}
            {printBudget.supportTextLines} linha(s)
            {printBudget.isOverBudget
              ? " — O texto ultrapassa 1 página A4; reduza o tamanho ou quebras de linha."
              : ` — Restam ${printBudget.remainingLines} linha(s) livres na página.`}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="block font-medium text-slate-700">
            Data retroativa (opcional)
          </span>
          <input
            type="date"
            {...register("dataRetroativa")}
            className="block h-10 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
          />
        </label>

        <div className="space-y-1 text-sm">
          <span className="block font-medium text-slate-700">
            Valor da multa
          </span>
          {selectedCategory === "Multa" ? (
            <div className="flex h-10 w-full items-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700">
              {activeCondominio?.valor_multa === null ||
              activeCondominio?.valor_multa === undefined
                ? "Ainda não definido"
                : formatCurrency(activeCondominio.valor_multa)}
            </div>
          ) : (
            <div className="flex h-10 w-full items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-slate-500">
              Aplicável apenas à categoria Multa.
            </div>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">
            Fotos anexas (opcional)
          </span>
          <input
            type="file"
            accept={NOTIFICATION_ATTACHMENT_MIME_TYPES.join(",")}
            multiple
            onChange={(event) => {
              handleAttachmentChange(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
            disabled={isSubmitting || Boolean(partialNotificationId)}
            className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700"
          />
          <span className="block text-xs text-slate-500">
            Até {MAX_NOTIFICATION_ATTACHMENTS} fotos JPEG, PNG ou WebP; máximo
            de {MAX_NOTIFICATION_ATTACHMENT_SIZE_BYTES / (1024 * 1024)} MB por
            foto.
          </span>
        </label>
        {attachmentFiles.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {attachmentFiles.map((file, index) => (
              <AttachmentPreview
                key={`${file.name}-${file.lastModified}-${index}`}
                file={file}
                index={index}
                disabled={isSubmitting}
                onRemove={removeAttachment}
              />
            ))}
          </ul>
        ) : null}
      </section>

      {serverMessage ? (
        <div className="animate-slide-down space-y-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          <p>{serverMessage}</p>
          {partialNotificationId ? (
            <button
              type="button"
              onClick={() => onSuccess(partialNotificationId)}
              className="cursor-pointer underline"
            >
              Abrir notificação #{partialNotificationId}
            </button>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || Boolean(partialNotificationId)}
        className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Salvando..." : "Inserir notificação"}
      </button>
    </form>
  );
}
