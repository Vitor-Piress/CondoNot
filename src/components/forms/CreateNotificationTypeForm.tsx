import { zodResolver } from "@hookform/resolvers/zod";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
} from "react-hook-form";
import { z } from "zod";
import { useCondominio } from "../../contexts/useCondominio";
import { createNotificationType } from "../../services/notificationTypeService";
import {
  MAX_ESCOPOS,
  MAX_PARAGRAFOS_POR_ESCOPO,
  MAX_TEXTO_APOIO_LENGTH,
  MIN_TEXTO_APOIO_LENGTH,
} from "../../types/domain";
import { calculateModelPrintBudget } from "../../utils/notificationPrint";

const paragrafoSchema = z.object({
  artigo: z.string().trim().min(1, "Informe o artigo."),
  texto: z.string().trim().min(5, "Informe o texto do parágrafo."),
});

const escopoSchema = z.object({
  titulo: z.string().trim().min(3, "Informe o título do escopo."),
  paragrafos: z
    .array(paragrafoSchema)
    .min(1, "Adicione ao menos um parágrafo.")
    .max(MAX_PARAGRAFOS_POR_ESCOPO),
});

const createNotificationTypeSchema = z
  .object({
    titulo: z.string().trim().min(3, "Informe um título válido."),
    escopos: z
      .array(escopoSchema)
      .min(1, "Adicione ao menos um escopo.")
      .max(MAX_ESCOPOS),
    usarTextoApoio: z.boolean(),
    textoApoio: z
      .string()
      .trim()
      .max(
        MAX_TEXTO_APOIO_LENGTH,
        `O texto de apoio deve ter no máximo ${MAX_TEXTO_APOIO_LENGTH} caracteres.`,
      )
      .optional(),
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

type CreateNotificationTypeValues = z.infer<
  typeof createNotificationTypeSchema
>;

interface CreateNotificationTypeFormProps {
  onSuccess: () => void;
}

function emptyParagrafo() {
  return { artigo: "", texto: "" };
}

function emptyEscopo() {
  return { titulo: "", paragrafos: [emptyParagrafo()] };
}

interface EscopoFieldsProps {
  control: Control<CreateNotificationTypeValues>;
  escopoIndex: number;
  register: ReturnType<
    typeof useForm<CreateNotificationTypeValues>
  >["register"];
  errors: ReturnType<
    typeof useForm<CreateNotificationTypeValues>
  >["formState"]["errors"];
  onRemoveEscopo: (() => void) | null;
}

function EscopoFields({
  control,
  escopoIndex,
  register,
  errors,
  onRemoveEscopo,
}: EscopoFieldsProps) {
  const {
    fields: paragrafoFields,
    append: appendParagrafo,
    remove: removeParagrafo,
  } = useFieldArray({
    control,
    name: `escopos.${escopoIndex}.paragrafos`,
  });

  const escopoErrors = errors.escopos?.[escopoIndex];

  return (
    <div className="animate-slide-down space-y-4 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Escopo {escopoIndex + 1}
        </span>
        {onRemoveEscopo ? (
          <button
            type="button"
            onClick={onRemoveEscopo}
            className="cursor-pointer text-xs font-semibold text-rose-600 hover:underline"
          >
            Remover escopo
          </button>
        ) : null}
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Título do escopo</span>
        <input
          {...register(`escopos.${escopoIndex}.titulo`)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
          placeholder="Ex.: Regimento interno - Capítulo 1"
        />
        {escopoErrors?.titulo ? (
          <p className="text-xs font-medium text-rose-600">
            {escopoErrors.titulo.message}
          </p>
        ) : null}
      </label>

      <div className="space-y-3">
        {paragrafoFields.map((field, paragrafoIndex) => {
          const paragrafoErrors = escopoErrors?.paragrafos?.[paragrafoIndex];

          return (
            <div
              key={field.id}
              className="animate-slide-down space-y-2 rounded-xl border border-dashed border-slate-300 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Parágrafo {paragrafoIndex + 1}
                </span>
                {paragrafoIndex > 0 ? (
                  <button
                    type="button"
                    onClick={() => removeParagrafo(paragrafoIndex)}
                    className="cursor-pointer text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Remover parágrafo
                  </button>
                ) : null}
              </div>

              <label className="block space-y-1 text-sm">
                <span className="font-medium text-slate-700">Artigo</span>
                <input
                  {...register(
                    `escopos.${escopoIndex}.paragrafos.${paragrafoIndex}.artigo`,
                  )}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
                  placeholder="Ex: Art. 12"
                />
                {paragrafoErrors?.artigo ? (
                  <p className="text-xs font-medium text-rose-600">
                    {paragrafoErrors.artigo.message}
                  </p>
                ) : null}
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-medium text-slate-700">Texto</span>
                <textarea
                  {...register(
                    `escopos.${escopoIndex}.paragrafos.${paragrafoIndex}.texto`,
                  )}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
                  placeholder="Texto do parágrafo do regimento"
                />
                {paragrafoErrors?.texto ? (
                  <p className="text-xs font-medium text-rose-600">
                    {paragrafoErrors.texto.message}
                  </p>
                ) : null}
              </label>
            </div>
          );
        })}
      </div>

      {paragrafoFields.length < MAX_PARAGRAFOS_POR_ESCOPO ? (
        <button
          type="button"
          onClick={() => appendParagrafo(emptyParagrafo())}
          className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
        >
          Adicionar parágrafo
        </button>
      ) : null}
    </div>
  );
}

export function CreateNotificationTypeForm({
  onSuccess,
}: CreateNotificationTypeFormProps) {
  const { activeCondominioId } = useCondominio();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateNotificationTypeValues>({
    resolver: zodResolver(createNotificationTypeSchema),
    defaultValues: {
      titulo: "",
      escopos: [emptyEscopo()],
      usarTextoApoio: false,
      textoApoio: "",
    },
  });

  const usarTextoApoio = useWatch({
    control,
    name: "usarTextoApoio",
  });
  const textoApoioValue = useWatch({
    control,
    name: "textoApoio",
  });
  const escoposValue = useWatch({
    control,
    name: "escopos",
  });

  const modelBudget = calculateModelPrintBudget({
    textoRegimento: escoposValue,
    usarTextoApoio: Boolean(usarTextoApoio),
    textoApoio: textoApoioValue,
  });

  const {
    fields: escopoFields,
    append: appendEscopo,
    remove: removeEscopo,
  } = useFieldArray({
    control,
    name: "escopos",
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!activeCondominioId) {
      return;
    }

    const submitBudget = calculateModelPrintBudget({
      textoRegimento: values.escopos,
      usarTextoApoio: values.usarTextoApoio,
      textoApoio: values.textoApoio,
    });

    if (
      values.usarTextoApoio &&
      (values.textoApoio?.trim().length ?? 0) > submitBudget.maxSupportTextChars
    ) {
      setError("textoApoio", {
        type: "manual",
        message: `Para caber em 1 página A4 deixando espaço para o motivo da notificação, o texto de apoio deve ter no máximo ${submitBudget.maxSupportTextChars} caracteres.`,
      });
      return;
    }

    if (submitBudget.isOverBudget) {
      setError("textoApoio", {
        type: "manual",
        message: `O regimento e o texto de apoio (${submitBudget.totalUsedLines} linhas) excedem o limite de ${submitBudget.maxModelLines} linhas na página A4. Reduza os parágrafos ou o texto de apoio.`,
      });
      return;
    }

    await createNotificationType({
      idCondominio: activeCondominioId,
      titulo: values.titulo,
      textoRegimento: values.escopos,
      textoApoio:
        values.usarTextoApoio && values.textoApoio
          ? values.textoApoio.trim()
          : null,
    });
    reset();
    onSuccess();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Título do modelo</span>
        <input
          {...register("titulo")}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
          placeholder="Ex.: Alerta de segurança"
        />
        {errors.titulo ? (
          <p className="text-xs font-medium text-rose-600">
            {errors.titulo.message}
          </p>
        ) : null}
      </label>

      <div className="space-y-3">
        {escopoFields.map((field, escopoIndex) => (
          <EscopoFields
            key={field.id}
            control={control}
            escopoIndex={escopoIndex}
            register={register}
            errors={errors}
            onRemoveEscopo={
              escopoIndex > 0 ? () => removeEscopo(escopoIndex) : null
            }
          />
        ))}
      </div>

      {escopoFields.length < MAX_ESCOPOS ? (
        <button
          type="button"
          onClick={() => appendEscopo(emptyEscopo())}
          className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
        >
          Adicionar escopo
        </button>
      ) : null}

      <div className="rounded-xl border border-slate-200 p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" {...register("usarTextoApoio")} />
          Incluir texto de apoio na carta impressa
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Texto livre exibido entre o motivo e o fechamento da carta, útil para
          reforçar uma orientação específica deste modelo de notificação (entre{" "}
          {MIN_TEXTO_APOIO_LENGTH} e {modelBudget.maxSupportTextChars} caracteres
          disponíveis na folha A4).
        </p>
        {usarTextoApoio ? (
          <label className="animate-slide-down mt-3 block space-y-1 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-700">Texto de apoio</span>
              <span
                className={`text-xs ${
                  (textoApoioValue ?? "").trim().length >
                  modelBudget.maxSupportTextChars
                    ? "font-semibold text-rose-600"
                    : "text-slate-400"
                }`}
              >
                {(textoApoioValue ?? "").length}/
                {modelBudget.maxSupportTextChars} caracteres
              </span>
            </div>
            <textarea
              {...register("textoApoio")}
              rows={3}
              maxLength={Math.max(
                (textoApoioValue ?? "").length,
                modelBudget.maxSupportTextChars,
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
      </div>

      <div
        className={`rounded-xl border px-3.5 py-2.5 text-xs ${
          modelBudget.isOverBudget
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : modelBudget.totalUsedLines >= modelBudget.maxModelLines - 2
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-slate-200 bg-slate-50 text-slate-600"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">
            Ocupação do modelo na folha A4 (reservando espaço para o motivo)
          </span>
          <span className="font-semibold">
            {modelBudget.totalUsedLines}/{modelBudget.maxModelLines} linhas
          </span>
        </div>
        <p className="mt-1 text-[11px] opacity-90">
          Regimento: {modelBudget.regimentoLines} linha(s) · Texto de apoio:{" "}
          {modelBudget.supportTextLines} linha(s)
          {modelBudget.isOverBudget
            ? " — O modelo excede o espaço seguro de 1 página A4."
            : ` — Restam ${modelBudget.remainingLinesForModel} linha(s) para o modelo (além das 3 linhas mínimas reservadas ao motivo).`}
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="ml-2 cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Salvando..." : "Inserir modelo de notificação"}
      </button>
    </form>
  );
}
