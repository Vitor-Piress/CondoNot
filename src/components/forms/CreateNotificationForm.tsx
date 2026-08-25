import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { UnitCombobox } from "../ui/UnitCombobox";
import { createNotification } from "../../services/notificationService";
import { listNotificationTypes } from "../../services/notificationTypeService";
import { listUnits } from "../../services/unitService";
import { type NotificationType, type Unit } from "../../types/domain";

const createNotificationSchema = z.object({
  idTipoNotificacao: z
    .string()
    .trim()
    .min(1, "Selecione um tipo de notificacao."),
  idUnidade: z.string().trim().min(1, "Selecione uma unidade."),
  categoria: z.enum(["Multa", "Orientacao", "Advertencia"]),
  motivo: z
    .string()
    .trim()
    .min(6, "Descreva o motivo com ao menos 6 caracteres."),
  dataRetroativa: z.string().trim(),
  valorMulta: z.string().trim(),
});

type CreateNotificationValues = z.infer<typeof createNotificationSchema>;

interface CreateNotificationFormProps {
  onSuccess: (notificationId: string) => void;
}

function toNullableDate(value: string): string | null {
  return value ? value : null;
}

function toNullableFine(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const categoryOptions = [
  { value: "Multa", label: "Multa" },
  { value: "Orientacao", label: "Orientacao" },
  { value: "Advertencia", label: "Advertencia" },
] as const;

export function CreateNotificationForm({
  onSuccess,
}: CreateNotificationFormProps) {
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

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
      valorMulta: "",
    },
  });

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const [typeRows, unitRows] = await Promise.all([
          listNotificationTypes(),
          listUnits(""),
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
            : "Nao foi possivel carregar os campos de apoio.";
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
  }, []);

  const selectedCategory = useWatch({
    control,
    name: "categoria",
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerMessage(null);

    try {
      const created = await createNotification({
        idTipoNotificacao: values.idTipoNotificacao,
        idUnidade: values.idUnidade,
        categoria: values.categoria,
        motivo: values.motivo,
        dataRetroativa: toNullableDate(values.dataRetroativa),
        valorMulta:
          values.categoria === "Multa"
            ? toNullableFine(values.valorMulta)
            : null,
      });

      reset();
      onSuccess(created.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar a notificacao.";
      setServerMessage(message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">
            Tipo de notificacao
          </span>
          <select
            {...register("idTipoNotificacao")}
            disabled={loadingOptions}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-200 transition focus:ring disabled:bg-slate-100"
          >
            <option value="">Selecione</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.titulo ?? `Tipo ${type.id}`}
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
          placeholder="Descreva o motivo da notificacao"
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
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Valor da multa</span>
            <input
              type="number"
              min={0}
              step={1}
              {...register("valorMulta")}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
              placeholder="Ex: 150"
            />
          </label>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Valor da multa aparece apenas quando categoria for Multa.
          </div>
        )}
      </div>

      {serverMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {serverMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Salvando..." : "Inserir notificacao"}
      </button>
    </form>
  );
}
