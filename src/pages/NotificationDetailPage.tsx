import { useEffect, useState } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { RegimentoView } from "../components/ui/RegimentoView";
import { getNotificationById } from "../services/notificationService";
import { getNotificationTypeById } from "../services/notificationTypeService";
import { getUnitById } from "../services/unitService";
import {
  getUnitLabel,
  type Notification,
  type NotificationType,
  type Unit,
} from "../types/domain";
import { formatDate } from "../utils/format";

interface NotificationDetailPageProps {
  notificationId: string;
  onNavigate: (to: string) => void;
}

export function NotificationDetailPage({
  notificationId,
  onNavigate,
}: NotificationDetailPageProps) {
  const [row, setRow] = useState<Notification | null>(null);
  const [type, setType] = useState<NotificationType | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRow() {
      try {
        const notification = await getNotificationById(notificationId);

        if (!active) {
          return;
        }

        if (!notification) {
          setRow(null);
          return;
        }

        const [typeRow, unitRow] = await Promise.all([
          getNotificationTypeById(notification.idTipoNotificacao),
          notification.idUnidade
            ? getUnitById(notification.idUnidade)
            : Promise.resolve(null),
        ]);

        if (!active) {
          return;
        }

        setRow(notification);
        setType(typeRow);
        setUnit(unitRow);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar a notificacao.";
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
  }, [notificationId]);

  const typeTitle = type?.titulo ?? `Tipo ${row?.idTipoNotificacao ?? ""}`;

  return (
    <Panel
      title="Notificacao individual"
      subtitle="Visualizacao completa do registro"
      action={
        <button
          type="button"
          onClick={() => onNavigate("/notificacoes")}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
        >
          Voltar para lista
        </button>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">Carregando notificacao...</p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && !row ? (
        <EmptyState
          title="Notificacao nao encontrada"
          description="Este registro pode ter sido removido ou ainda nao existe."
        />
      ) : null}

      {!loading && !error && row ? (
        <article className="space-y-4 rounded-2xl border border-slate-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Categoria
            </p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {row.categoria ?? `Notificacao #${row.id}`}
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Tipo de notificacao
              </p>
              <button
                type="button"
                onClick={() =>
                  onNavigate(`/tipos-notificacao/${row.idTipoNotificacao}`)
                }
                className="mt-1 text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-600"
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
                  : "Nao informada"}
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

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Valor da multa
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {row.valorMulta === null ? "Nao informado" : row.valorMulta}
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
  );
}
