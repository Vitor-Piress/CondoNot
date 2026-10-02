import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { RegimentoView } from "../components/ui/RegimentoView";
import { getNotificationTypeById } from "../services/notificationTypeService";
import type { NotificationType } from "../types/domain";
import { formatDate } from "../utils/format";
import { useCondominio } from "../contexts/useCondominio";

interface NotificationTypeDetailPageProps {
  typeId: string;
  onNavigate: (to: string) => void;
}

export function NotificationTypeDetailPage({
  typeId,
  onNavigate,
}: NotificationTypeDetailPageProps) {
  const { activeCondominioId } = useCondominio();
  const [type, setType] = useState<NotificationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadType() {
      if (!activeCondominioId) {
        return;
      }

      try {
        const data = await getNotificationTypeById(typeId, activeCondominioId);

        if (!active) {
          return;
        }

        setType(data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar o tipo de notificação.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadType();

    return () => {
      active = false;
    };
  }, [activeCondominioId, typeId]);

  return (
    <Panel
      title="Tipo de notificação individual"
      subtitle="Visualização somente leitura do tipo cadastrado"
      leftAction={
        <button
          type="button"
          onClick={() => onNavigate("/tipos-notificacao")}
          aria-label="Voltar para lista"
          title="Voltar para lista"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">
          Carregando tipo de notificação...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && !type ? (
        <EmptyState
          title="Tipo não encontrado"
          description="Este registro pode ter sido removido ou ainda não existe."
        />
      ) : null}

      {!loading && !error && type ? (
        <article className="space-y-4 rounded-2xl border border-slate-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Título do tipo
            </p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {type.titulo ?? `Tipo ${type.id}`}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>ID {type.id}</span>
            <span>Criado em {formatDate(type.createdAt)}</span>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Texto do regimento
            </p>
            <RegimentoView textoRegimento={type.textoRegimento} />
          </div>

          {type.textoApoio ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Texto de apoio
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {type.textoApoio}
              </p>
            </div>
          ) : null}
        </article>
      ) : null}
    </Panel>
  );
}
