import { Archive, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { listNotifications } from "../services/notificationService";
import {
  listNotificationTypes,
  softDeleteNotificationType,
} from "../services/notificationTypeService";
import { includesQuery } from "../utils/format";
import { formatDate } from "../utils/format";
import { getRegimentoPreview } from "../types/domain";
import type { Notification, NotificationType } from "../types/domain";
import { useCondominio } from "../contexts/useCondominio";

interface NotificationTypesPageProps {
  onNavigate: (to: string) => void;
}

export function NotificationTypesPage({
  onNavigate,
}: NotificationTypesPageProps) {
  const { activeCondominioId } = useCondominio();
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [archivingTypeId, setArchivingTypeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!activeCondominioId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [typeRows, notificationRows] = await Promise.all([
          listNotificationTypes(activeCondominioId),
          listNotifications(
            { query: "", typeId: "", unitId: "" },
            activeCondominioId,
          ),
        ]);

        if (!active) {
          return;
        }

        setTypes(typeRows);
        setNotifications(notificationRows);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os tipos de notificação.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [activeCondominioId]);

  const typeUsageMap = useMemo(() => {
    const usage = new Map<string, number>();

    for (const row of notifications) {
      usage.set(
        row.idTipoNotificacao,
        (usage.get(row.idTipoNotificacao) ?? 0) + 1,
      );
    }

    return usage;
  }, [notifications]);

  const filteredTypes = useMemo(
    () =>
      types.filter((type) => {
        const title = type.titulo ?? "";
        const text = getRegimentoPreview(type.textoRegimento);
        return query.trim() === "" || includesQuery(`${title} ${text}`, query);
      }),
    [types, query],
  );

  async function handleArchive(type: NotificationType) {
    if (!activeCondominioId) return;

    const usageCount = typeUsageMap.get(type.id) ?? 0;
    const usageMessage =
      usageCount > 0
        ? ` ${usageCount} notificação(ões) já registrada(s) continuará(ão) vinculada(s) a ele.`
        : "";
    const confirmed = window.confirm(
      `Arquivar o tipo "${type.titulo ?? `Tipo ${type.id}`}"?${usageMessage} Ele deixará de aparecer em novas notificações.`,
    );
    if (!confirmed) return;

    setArchivingTypeId(type.id);
    setError(null);
    setMessage(null);
    try {
      await softDeleteNotificationType(type.id, activeCondominioId);
      setTypes((current) => current.filter((item) => item.id !== type.id));
      setMessage("Tipo arquivado. O histórico de notificações foi preservado.");
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Não foi possível arquivar o tipo de notificação.",
      );
    } finally {
      setArchivingTypeId(null);
    }
  }

  return (
    <Panel
      title="Relatório de tipos de notificação"
      subtitle="Visualização dedicada dos tipos cadastrados e sua utilização"
      action={
        <button
          type="button"
          onClick={() => onNavigate("/tipos-notificacao/novo")}
          className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-slate-700"
        >
          Inserir tipo de notificação
        </button>
      }
    >
      <label className="relative mb-5 block">
        <Search
          className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none ring-slate-200 transition focus:ring"
          placeholder="Buscar por título ou texto padrão"
        />
      </label>

      {loading ? <p className="text-sm text-slate-500">Carregando...</p> : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
        >
          {message}
        </p>
      ) : null}

      {!loading && !error && filteredTypes.length === 0 ? (
        <EmptyState
          title="Nenhum tipo encontrado"
          description="Cadastre um tipo novo ou ajuste os filtros de busca."
        />
      ) : null}

      {!loading && !error && filteredTypes.length > 0 ? (
        <ul className="space-y-3">
          {filteredTypes.map((type) => (
            <li key={type.id}>
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate(`/tipos-notificacao/${type.id}`)}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {type.titulo ?? `Tipo ${type.id}`}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {getRegimentoPreview(type.textoRegimento)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                        Uso em notificações
                      </p>
                      <p className="text-base font-semibold text-slate-700">
                        {typeUsageMap.get(type.id) ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>ID {type.id}</span>
                    <span>Criado em {formatDate(type.createdAt)}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void handleArchive(type)}
                  disabled={archivingTypeId !== null}
                  aria-label={`Arquivar ${type.titulo ?? `Tipo ${type.id}`}`}
                  title="Arquivar tipo"
                  className="inline-flex size-11 shrink-0 self-center items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:cursor-wait disabled:opacity-50"
                >
                  <Archive aria-hidden="true" size={17} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
