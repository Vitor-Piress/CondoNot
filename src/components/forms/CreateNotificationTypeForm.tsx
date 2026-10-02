import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, type Control } from "react-hook-form";
import { z } from "zod";
import { useCondominio } from "../../contexts/useCondominio";
import { createNotificationType } from "../../services/notificationTypeService";
import { MAX_ESCOPOS, MAX_PARAGRAFOS_POR_ESCOPO } from "../../types/domain";

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
    textoApoio: z.string().trim().optional(),
  })
  .refine(
    (values) =>
      !values.usarTextoApoio ||
      (values.textoApoio && values.textoApoio.length >= 5),
    {
      message: "Informe o texto de apoio ou desative essa opção.",
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
    <div className="space-y-4 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Escopo {escopoIndex + 1}
        </span>
        {onRemoveEscopo ? (
          <button
            type="button"
            onClick={onRemoveEscopo}
            className="text-xs font-semibold text-rose-600 hover:underline"
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
              className="space-y-2 rounded-xl border border-dashed border-slate-300 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Parágrafo {paragrafoIndex + 1}
                </span>
                {paragrafoIndex > 0 ? (
                  <button
                    type="button"
                    onClick={() => removeParagrafo(paragrafoIndex)}
                    className="text-xs font-semibold text-rose-600 hover:underline"
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
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
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
    control,
    watch,
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

  const usarTextoApoio = watch("usarTextoApoio");

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
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
        >
          Adicionar escopo
        </button>
      ) : null}

      <div className="rounded-xl border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" {...register("usarTextoApoio")} />
          Incluir texto de apoio na carta impressa
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Texto livre exibido entre o motivo e o fechamento da carta, útil para
          reforçar uma orientação específica deste modelo de notificação.
        </p>
        {usarTextoApoio ? (
          <label className="mt-3 block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Texto de apoio</span>
            <textarea
              {...register("textoApoio")}
              rows={3}
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-slate-900 ml-2 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Salvando..." : "Inserir modelo de notificação"}
      </button>
    </form>
  );
}
