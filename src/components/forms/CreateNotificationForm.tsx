import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useCondominio } from "../../contexts/useCondominio";
import { UnitCombobox } from "../ui/UnitCombobox";
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
import { type NotificationType, type Unit } from "../../types/domain";
import { formatCurrency } from "../../utils/format";

const createNotificationSchema = z.object({
  idTipoNotificacao: z
    .string()
    .trim()
    .min(1, "Selecione um modelo de notificação."),
  idUnidade: z.string().trim().min(1, "Selecione uma unidade."),
  categoria: z.enum(["Multa", "Orientacao", "Advertencia"]),
  motivo: z
    .string()
    .trim()
    .min(6, "Descreva o motivo com ao menos 6 caracteres."),
  dataRetroativa: z.string().trim(),
});

type CreateNotificationValues = z.infer<typeof createNotificationSchema>;

interface CreateNotificationFormProps {
  onSuccess: (notificationId: string) => void;
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
    <li className="overflow-hidden rounded-xl border border-slate-200">
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
          className="shrink-0 text-xs font-semibold text-rose-700 hover:underline"
        >
          Remover
        </button>
      </div>
    </li>
  );
}

export function CreateNotificationForm({
  onSuccess,
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

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateNotificationValues>({
    resolver: zodResolver(createNotificationSchema),
    defaultValues: {
      idTipoNotificacao: "",
      idUnidade: "",
      categoria: "Orientacao",
      motivo: "",
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

    try {
      const created = await createNotification({
        idCondominio: activeCondominioId,
        idTipoNotificacao: values.idTipoNotificacao,
        idUnidade: values.idUnidade,
        categoria: values.categoria,
        motivo: values.motivo,
        dataRetroativa: toNullableDate(values.dataRetroativa),
        valorMulta:
          values.categoria === "Multa"
            ? (activeCondominio?.valor_multa ?? null)
            : null,
        attachments: attachmentFiles,
      });

      reset();
      setAttachmentFiles([]);
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
          <span className="font-medium text-slate-700">
            Modelo de notificação
          </span>
          <select
            {...register("idTipoNotificacao")}
            disabled={loadingOptions}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-200 transition focus:ring disabled:bg-slate-100"
          >
            <option value="">Selecione</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.titulo ?? `Modelo ${type.id}`}
              </option>
            ))}
          </select>
          {errors.idTipoNotificacao ? (
            <p className="text-xs font-medium text-rose-600">
              {errors.idTipoNotificacao.message}
            </p>
          ) : null}
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Unidade</span>
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
          <span className="font-medium text-slate-700">Categoria</span>
          <select
            {...register("categoria")}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-200 transition focus:ring"
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

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Motivo</span>
        <textarea
          {...register("motivo")}
          rows={4}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
          placeholder="Descreva o motivo da notificação"
        />
        {errors.motivo ? (
          <p className="text-xs font-medium text-rose-600">
            {errors.motivo.message}
          </p>
        ) : null}
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">
            Data retroativa (opcional)
          </span>
          <input
            type="date"
            {...register("dataRetroativa")}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
          />
        </label>

        {selectedCategory === "Multa" ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="font-medium text-slate-700">
              Valor configurado para o condomínio
            </p>
            <p className="mt-1 text-slate-600">
              {activeCondominio?.valor_multa === null ||
                activeCondominio?.valor_multa === undefined
                ? "Ainda não definido"
                : formatCurrency(activeCondominio.valor_multa)}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            O valor da multa aparece apenas quando a categoria for Multa.
          </div>
        )}
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
        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          <p>{serverMessage}</p>
          {partialNotificationId ? (
            <button
              type="button"
              onClick={() => onSuccess(partialNotificationId)}
              className="underline"
            >
              Abrir notificação #{partialNotificationId}
            </button>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || Boolean(partialNotificationId)}
        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Salvando..." : "Inserir notificação"}
      </button>
    </form>
  );
}
