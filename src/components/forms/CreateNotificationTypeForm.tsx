import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createNotificationType } from "../../services/notificationTypeService";

const createNotificationTypeSchema = z.object({
  titulo: z.string().trim().min(3, "Informe um titulo valido."),
  textoPadrao: z.string().trim().min(5, "Informe um texto padrao valido."),
});

type CreateNotificationTypeValues = z.infer<
  typeof createNotificationTypeSchema
>;

interface CreateNotificationTypeFormProps {
  onSuccess: () => void;
}

export function CreateNotificationTypeForm({
  onSuccess,
}: CreateNotificationTypeFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateNotificationTypeValues>({
    resolver: zodResolver(createNotificationTypeSchema),
    defaultValues: {
      titulo: "",
      textoPadrao: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await createNotificationType(values);
    reset();
    onSuccess();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Titulo do tipo</span>
        <input
          {...register("titulo")}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
          placeholder="Ex: Alerta de seguranca"
        />
        {errors.titulo ? (
          <p className="text-xs font-medium text-rose-600">
            {errors.titulo.message}
          </p>
        ) : null}
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Texto padrao</span>
        <textarea
          {...register("textoPadrao")}
          rows={4}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
          placeholder="Texto base para novas notificacoes"
        />
        {errors.textoPadrao ? (
          <p className="text-xs font-medium text-rose-600">
            {errors.textoPadrao.message}
          </p>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Salvando..." : "Inserir tipo_notificacao"}
      </button>
    </form>
  );
}
